/**
 * Smart Street View Cache Manager
 * Optimized caching system for Google Street View Static API
 * Respects Google Terms of Service and rate limits
 */

class StreetViewCacheManager {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.imageCache = new Map(); // In-memory cache for loaded images
        this.loadingPromises = new Map(); // Prevent duplicate requests
        this.cacheStats = {
            cachedImages: 0,
            totalSizeMB: 0,
            hits: 0,
            misses: 0
        };
        this.maxCacheSize = 50; // Max images in memory
    }

    // Generate Street View URL with parameters
    generateStreetViewUrl(lat, lng, options = {}) {
        const defaultOptions = {
            size: '300x200',
            fov: 70,
            heading: 0,
            pitch: 10
        };
        
        const params = { ...defaultOptions, ...options };
        const baseUrl = 'https://maps.googleapis.com/maps/api/streetview';
        
        return `${baseUrl}?size=${params.size}&location=${lat},${lng}&fov=${params.fov}&heading=${params.heading}&pitch=${params.pitch}&key=${this.apiKey}`;
    }

    // Generate multiple angle URLs for a location
    generateMultiAngleUrls(lat, lng, options = {}) {
        const angles = [
            { heading: 0, pitch: 10, fov: 70 },    // North
            { heading: 90, pitch: 10, fov: 70 },   // East
            { heading: 180, pitch: 10, fov: 70 },  // South
            { heading: 270, pitch: 10, fov: 70 }   // West
        ];

        return angles.map(angle => 
            this.generateStreetViewUrl(lat, lng, { ...options, ...angle })
        );
    }

    // Preload a Street View image
    async preloadStreetViewImage(lat, lng, options = {}) {
        const url = this.generateStreetViewUrl(lat, lng, options);
        const cacheKey = `${lat},${lng},${options.heading || 0}`;

        // Check if already cached
        if (this.imageCache.has(cacheKey)) {
            this.cacheStats.hits++;
            return { success: true, cached: true, url };
        }

        // Check if already loading
        if (this.loadingPromises.has(cacheKey)) {
            return await this.loadingPromises.get(cacheKey);
        }

        // Start loading
        const loadingPromise = this._loadImage(url, cacheKey);
        this.loadingPromises.set(cacheKey, loadingPromise);

        try {
            const result = await loadingPromise;
            this.loadingPromises.delete(cacheKey);
            return result;
        } catch (error) {
            this.loadingPromises.delete(cacheKey);
            throw error;
        }
    }

    // Internal image loading method
    async _loadImage(url, cacheKey) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';

            img.onload = () => {
                // Add to cache if there's room
                if (this.imageCache.size < this.maxCacheSize) {
                    this.imageCache.set(cacheKey, {
                        url,
                        timestamp: Date.now(),
                        size: this._estimateImageSize(img)
                    });
                    
                    this.cacheStats.cachedImages = this.imageCache.size;
                    this.cacheStats.misses++;
                    this._updateCacheSize();
                }

                resolve({ success: true, cached: false, url, width: img.width, height: img.height });
            };

            img.onerror = () => {
                console.warn(`Street View image failed to load: ${url}`);
                resolve({ success: false, url, error: 'Failed to load image' });
            };

            img.src = url;
        });
    }

    // Batch preload multiple locations
    async batchPreloadStreetViews(locations, maxConcurrent = 5) {
        const results = [];
        const chunks = this._chunkArray(locations, maxConcurrent);

        for (const chunk of chunks) {
            const chunkPromises = chunk.map(location => {
                if (location.lat && location.lng) {
                    return this.preloadStreetViewImage(location.lat, location.lng)
                        .catch(error => ({ 
                            success: false, 
                            location, 
                            error: error.message 
                        }));
                }
                return Promise.resolve({ success: false, location, error: 'Invalid coordinates' });
            });

            const chunkResults = await Promise.all(chunkPromises);
            results.push(...chunkResults);

            // Small delay between chunks to respect rate limits
            if (chunks.indexOf(chunk) < chunks.length - 1) {
                await this._delay(200);
            }
        }

        return {
            total: results.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            results
        };
    }

    // Check if Street View is available at location
    async checkStreetViewAvailability(lat, lng) {
        try {
            const result = await this.preloadStreetViewImage(lat, lng);
            return result.success;
        } catch (error) {
            return false;
        }
    }

    // Get cache statistics
    getCacheStats() {
        return {
            cachedImages: this.cacheStats.cachedImages,
            totalSizeMB: Math.round(this.cacheStats.totalSizeMB * 100) / 100,
            hits: this.cacheStats.hits,
            misses: this.cacheStats.misses,
            loadingPromises: this.loadingPromises.size,
            hitRate: this.cacheStats.hits > 0 ? 
                Math.round((this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses)) * 100) : 0
        };
    }

    // Clear cache
    clearCache() {
        this.imageCache.clear();
        this.loadingPromises.clear();
        this.cacheStats = {
            cachedImages: 0,
            totalSizeMB: 0,
            hits: 0,
            misses: 0
        };
    }

    // Estimate image size in MB
    _estimateImageSize(img) {
        // Rough estimate: width × height × 4 bytes (RGBA) / 1024 / 1024
        return (img.width * img.height * 4) / (1024 * 1024);
    }

    // Update total cache size
    _updateCacheSize() {
        let totalSize = 0;
        for (const [key, value] of this.imageCache) {
            totalSize += value.size || 0;
        }
        this.cacheStats.totalSizeMB = totalSize;
    }

    // Split array into chunks
    _chunkArray(array, chunkSize) {
        const chunks = [];
        for (let i = 0; i < array.length; i += chunkSize) {
            chunks.push(array.slice(i, i + chunkSize));
        }
        return chunks;
    }

    // Simple delay utility
    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Clean old cache entries
    cleanOldCache(maxAgeHours = 24) {
        const maxAge = maxAgeHours * 60 * 60 * 1000;
        const now = Date.now();
        
        for (const [key, value] of this.imageCache) {
            if (now - value.timestamp > maxAge) {
                this.imageCache.delete(key);
            }
        }
        
        this.cacheStats.cachedImages = this.imageCache.size;
        this._updateCacheSize();
    }
}

// Export for use in other scripts
if (typeof window !== 'undefined') {
    window.StreetViewCacheManager = StreetViewCacheManager;
}

// Export for Node.js if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StreetViewCacheManager;
}