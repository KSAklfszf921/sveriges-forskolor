/**
 * Smart Places API Cache Manager
 * Complies with Google Terms of Service - only caches allowed data
 * Implements intelligent rate limiting and error handling
 */

class PlacesCacheManager {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.placeIdCache = new Map(); // Can cache indefinitely per Google TOS
        this.requestQueue = [];
        this.requestInProgress = false;
        this.lastRequestTime = 0;
        this.minRequestInterval = 100; // 10 requests per second max
        
        // Load cached place IDs from localStorage
        this.loadPlaceIdsFromStorage();
    }
    
    // ALLOWED: Cache place IDs indefinitely
    cachePlaceId(address, placeId) {
        const key = this.normalizeAddress(address);
        this.placeIdCache.set(key, placeId);
        this.savePlaceIdsToStorage();
    }
    
    getCachedPlaceId(address) {
        const key = this.normalizeAddress(address);
        return this.placeIdCache.get(key);
    }
    
    // Find place ID for preschool address
    async findPlaceId(address) {
        // Check cache first
        const cachedId = this.getCachedPlaceId(address);
        if (cachedId) {
            console.log(`✅ Using cached place ID for: ${address}`);
            return cachedId;
        }
        
        // Rate limited API call
        return this.makeRateLimitedRequest(() => this.searchPlace(address));
    }
    
    // Get real-time place details (NOT cached - per Google TOS)
    async getPlaceDetails(placeId) {
        if (!placeId) return null;
        
        return this.makeRateLimitedRequest(() => 
            this.fetchPlaceDetails(placeId)
        );
    }
    
    // PRIVATE METHODS
    
    async searchPlace(address) {
        try {
            const encodedAddress = encodeURIComponent(address);
            const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodedAddress}&inputtype=textquery&fields=place_id,name,formatted_address&key=${this.apiKey}`;
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.status === 'OK' && data.candidates.length > 0) {
                const placeId = data.candidates[0].place_id;
                this.cachePlaceId(address, placeId); // Cache the ID
                return placeId;
            }
            
            return null;
        } catch (error) {
            console.error('Error searching for place:', error);
            return null;
        }
    }
    
    async fetchPlaceDetails(placeId) {
        try {
            const fields = 'place_id,name,rating,user_ratings_total,reviews,formatted_phone_number,opening_hours,website,photos';
            const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${this.apiKey}`;
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.status === 'OK') {
                return data.result;
            }
            
            return null;
        } catch (error) {
            console.error('Error fetching place details:', error);
            return null;
        }
    }
    
    // Rate limiting to prevent API quota exhaustion
    async makeRateLimitedRequest(requestFn) {
        return new Promise((resolve) => {
            this.requestQueue.push({ requestFn, resolve });
            this.processRequestQueue();
        });
    }
    
    async processRequestQueue() {
        if (this.requestInProgress || this.requestQueue.length === 0) {
            return;
        }
        
        this.requestInProgress = true;
        
        const timeSinceLastRequest = Date.now() - this.lastRequestTime;
        if (timeSinceLastRequest < this.minRequestInterval) {
            await this.delay(this.minRequestInterval - timeSinceLastRequest);
        }
        
        const { requestFn, resolve } = this.requestQueue.shift();
        this.lastRequestTime = Date.now();
        
        try {
            const result = await requestFn();
            resolve(result);
        } catch (error) {
            console.error('Request failed:', error);
            resolve(null);
        }
        
        this.requestInProgress = false;
        
        // Process next request
        setTimeout(() => this.processRequestQueue(), 10);
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    normalizeAddress(address) {
        return address.toLowerCase()
            .replace(/[åä]/g, 'a')
            .replace(/ö/g, 'o')
            .replace(/\s+/g, ' ')
            .trim();
    }
    
    // Persistent storage for place IDs (allowed by Google TOS)
    savePlaceIdsToStorage() {
        try {
            const data = Object.fromEntries(this.placeIdCache);
            localStorage.setItem('preschool_place_ids', JSON.stringify(data));
        } catch (error) {
            console.warn('Could not save place IDs to storage:', error);
        }
    }
    
    loadPlaceIdsFromStorage() {
        try {
            const data = localStorage.getItem('preschool_place_ids');
            if (data) {
                const parsed = JSON.parse(data);
                this.placeIdCache = new Map(Object.entries(parsed));
                console.log(`📱 Loaded ${this.placeIdCache.size} cached place IDs`);
            }
        } catch (error) {
            console.warn('Could not load place IDs from storage:', error);
        }
    }
    
    // Batch process preschools to avoid API quota issues
    async batchProcessPreschools(preschools, batchSize = 10) {
        const batches = [];
        for (let i = 0; i < preschools.length; i += batchSize) {
            batches.push(preschools.slice(i, i + batchSize));
        }
        
        const results = [];
        
        for (let i = 0; i < batches.length; i++) {
            console.log(`🔄 Processing batch ${i + 1}/${batches.length}`);
            
            const batchPromises = batches[i].map(async (preschool) => {
                const placeId = await this.findPlaceId(preschool.Adress + ', ' + preschool.Kommun);
                if (placeId) {
                    const details = await this.getPlaceDetails(placeId);
                    return { preschool, placeId, details };
                }
                return { preschool, placeId: null, details: null };
            });
            
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
            
            // Delay between batches to be nice to the API
            if (i < batches.length - 1) {
                await this.delay(1000);
            }
        }
        
        return results;
    }
    
    // Get cache statistics
    getCacheStats() {
        return {
            cachedPlaceIds: this.placeIdCache.size,
            queuedRequests: this.requestQueue.length,
            cacheHitRate: this.calculateHitRate()
        };
    }
    
    calculateHitRate() {
        // This would need to be tracked over time
        return 'Not implemented yet';
    }
}

// Export for use in main application
window.PlacesCacheManager = PlacesCacheManager;