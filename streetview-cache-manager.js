/**
 * Street View Image Cache Manager
 * Optimizes Street View performance with intelligent image caching
 * Uses URL-based caching since images are static resources
 */

class StreetViewCacheManager {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.imageCache = new Map();
        this.loadingPromises = new Map();
        this.maxCacheSize = 500; // Limit cache size to prevent memory issues
        this.cacheExpiry = 7 * 24 * 60 * 60 * 1000; // 1 week
        
        // Load cached image metadata from localStorage
        this.loadCacheFromStorage();
        
        // Clean expired cache entries
        this.cleanExpiredCache();
    }
    
    /**
     * Generate optimized Street View URL with multiple angle fallbacks
     */
    generateStreetViewUrls(lat, lng, schoolName = '') {
        const baseParams = {
            size: '300x200',
            location: `${lat},${lng}`,
            fov: 70,
            pitch: 10,
            key: this.apiKey
        };
        
        const angles = [
            { heading: 0, name: 'Nord' },     // North
            { heading: 90, name: 'Öst' },    // East  
            { heading: 180, name: 'Syd' },   // South
            { heading: 270, name: 'Väst' }   // West
        ];
        
        return angles.map((angle, index) => {
            const params = { ...baseParams, heading: angle.heading, pitch: baseParams.pitch };
            const url = 'https://maps.googleapis.com/maps/api/streetview?' + 
                       Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
            
            return {
                url,
                angle: angle.name,
                index: index + 1,
                cacheKey: this.generateCacheKey(lat, lng, angle.heading)
            };
        });
    }
    
    /**
     * Preload and cache Street View image
     */
    async preloadStreetViewImage(url, cacheKey) {
        // Check if already loading
        if (this.loadingPromises.has(cacheKey)) {
            return this.loadingPromises.get(cacheKey);
        }
        
        // Check cache first
        const cached = this.getCachedImage(cacheKey);
        if (cached && !this.isExpired(cached)) {
            return { success: true, fromCache: true, blob: cached.blob };
        }
        
        // Create loading promise
        const loadingPromise = this.loadAndCacheImage(url, cacheKey);
        this.loadingPromises.set(cacheKey, loadingPromise);
        
        try {
            const result = await loadingPromise;
            return result;
        } finally {
            this.loadingPromises.delete(cacheKey);
        }
    }
    
    async loadAndCacheImage(url, cacheKey) {
        try {
            // Create a temporary image to test if Street View is available
            const testImage = new Image();
            testImage.crossOrigin = 'anonymous';
            
            const imageLoaded = new Promise((resolve, reject) => {
                testImage.onload = () => {
                    // Check if it's a valid Street View (not the "no imagery" placeholder)
                    if (testImage.naturalWidth > 0 && testImage.naturalHeight > 0) {
                        resolve(true);
                    } else {
                        reject(new Error('No Street View imagery available'));
                    }
                };
                testImage.onerror = () => reject(new Error('Failed to load Street View image'));
            });
            
            testImage.src = url;
            await imageLoaded;
            
            // If we get here, the image is valid - cache it
            const response = await fetch(url);
            const blob = await response.blob();
            
            this.cacheImage(cacheKey, blob);
            
            return { success: true, fromCache: false, blob };
            
        } catch (error) {
            console.log(`Street View not available for cache key: ${cacheKey}`);
            return { success: false, error: error.message };
        }
    }
    
    cacheImage(cacheKey, blob) {
        // Manage cache size
        if (this.imageCache.size >= this.maxCacheSize) {
            this.evictOldestCache();
        }
        
        const cacheEntry = {
            blob,
            timestamp: Date.now(),
            size: blob.size
        };
        
        this.imageCache.set(cacheKey, cacheEntry);
        this.saveCacheToStorage();
        
        console.log(`📸 Cached Street View image: ${cacheKey} (${(blob.size / 1024).toFixed(1)} KB)`);
    }
    
    getCachedImage(cacheKey) {
        return this.imageCache.get(cacheKey);
    }
    
    isExpired(cacheEntry) {
        return Date.now() - cacheEntry.timestamp > this.cacheExpiry;
    }
    
    evictOldestCache() {
        let oldestKey = null;
        let oldestTime = Date.now();
        
        for (const [key, entry] of this.imageCache.entries()) {
            if (entry.timestamp < oldestTime) {
                oldestTime = entry.timestamp;
                oldestKey = key;
            }
        }
        
        if (oldestKey) {
            this.imageCache.delete(oldestKey);
            console.log(`🗑️ Evicted oldest cache entry: ${oldestKey}`);
        }
    }
    
    cleanExpiredCache() {
        const expiredKeys = [];
        
        for (const [key, entry] of this.imageCache.entries()) {
            if (this.isExpired(entry)) {
                expiredKeys.push(key);
            }
        }
        
        expiredKeys.forEach(key => this.imageCache.delete(key));
        
        if (expiredKeys.length > 0) {
            console.log(`🧹 Cleaned ${expiredKeys.length} expired cache entries`);
            this.saveCacheToStorage();
        }
    }
    
    generateCacheKey(lat, lng, heading) {
        return `sv_${lat.toFixed(6)}_${lng.toFixed(6)}_${heading}`;
    }
    
    /**
     * Batch preload Street View images for multiple preschools
     */
    async batchPreloadStreetViews(preschools, maxConcurrent = 5) {
        const loadQueue = [];
        
        // Generate all URLs first
        preschools.forEach(school => {
            const lat = parseFloat(school.Latitud);
            const lng = parseFloat(school.Longitud);
            
            if (!isNaN(lat) && !isNaN(lng)) {
                const urls = this.generateStreetViewUrls(lat, lng, school.Namn);
                urls.forEach(urlData => {
                    loadQueue.push({
                        school: school.Namn,
                        ...urlData
                    });
                });
            }
        });
        
        console.log(`🚀 Starting batch preload of ${loadQueue.length} Street View images`);
        
        // Process in batches to avoid overwhelming the API
        const results = { loaded: 0, cached: 0, failed: 0 };
        
        for (let i = 0; i < loadQueue.length; i += maxConcurrent) {
            const batch = loadQueue.slice(i, i + maxConcurrent);
            
            const batchPromises = batch.map(async item => {
                const result = await this.preloadStreetViewImage(item.url, item.cacheKey);
                
                if (result.success) {
                    if (result.fromCache) {
                        results.cached++;
                    } else {
                        results.loaded++;
                    }
                } else {
                    results.failed++;
                }
                
                return { ...item, ...result };
            });
            
            await Promise.all(batchPromises);
            
            const progress = ((i + batch.length) / loadQueue.length * 100).toFixed(1);
            console.log(`📊 Progress: ${progress}% (${results.loaded + results.cached}/${loadQueue.length})`);
            
            // Small delay between batches
            if (i + maxConcurrent < loadQueue.length) {
                await this.delay(200);
            }
        }
        
        console.log(`✅ Batch preload complete:`, results);
        return results;
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // Cache persistence (metadata only - not the actual blobs due to size)
    saveCacheToStorage() {
        try {
            const metadata = {};
            for (const [key, entry] of this.imageCache.entries()) {
                metadata[key] = {
                    timestamp: entry.timestamp,
                    size: entry.size
                };
            }
            localStorage.setItem('streetview_cache_metadata', JSON.stringify(metadata));
        } catch (error) {
            console.warn('Could not save cache metadata:', error);
        }
    }
    
    loadCacheFromStorage() {
        try {
            const metadata = localStorage.getItem('streetview_cache_metadata');
            if (metadata) {
                const parsed = JSON.parse(metadata);
                console.log(`📱 Found ${Object.keys(parsed).length} cached Street View entries metadata`);
            }
        } catch (error) {
            console.warn('Could not load cache metadata:', error);
        }
    }
    
    getCacheStats() {
        const totalSize = Array.from(this.imageCache.values())
            .reduce((sum, entry) => sum + entry.size, 0);
            
        return {
            cachedImages: this.imageCache.size,
            totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
            maxCacheSize: this.maxCacheSize,
            loadingPromises: this.loadingPromises.size,
            expiryHours: this.cacheExpiry / (60 * 60 * 1000)
        };
    }
    
    clearCache() {
        this.imageCache.clear();
        localStorage.removeItem('streetview_cache_metadata');
        console.log('🗑️ Cleared all Street View cache');
    }
}

// Export for use in main application  
window.StreetViewCacheManager = StreetViewCacheManager;