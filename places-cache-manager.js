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
            // Use Google Places JavaScript API instead of REST API to avoid CORS
            if (typeof google !== 'undefined' && google.maps && google.maps.places) {
                return this.searchPlaceWithJSAPI(address);
            }
            
            // Fallback: Try to use JSONP or proxy
            console.log('Google Maps JavaScript API not loaded, using fallback method');
            return this.searchPlaceWithFallback(address);
            
        } catch (error) {
            console.error('Error searching for place:', error);
            return null;
        }
    }
    
    async searchPlaceWithJSAPI(address) {
        return new Promise((resolve) => {
            const service = new google.maps.places.PlacesService(document.createElement('div'));
            
            const request = {
                query: address,
                fields: ['place_id', 'name', 'formatted_address']
            };
            
            service.textSearch(request, (results, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK && results.length > 0) {
                    const placeId = results[0].place_id;
                    this.cachePlaceId(address, placeId);
                    resolve(placeId);
                } else {
                    console.log(`No place found for: ${address} (Status: ${status})`);
                    resolve(null);
                }
            });
        });
    }
    
    async searchPlaceWithFallback(address) {
        // For now, return null - in production you'd use a backend proxy
        console.log('Places API search not available without Google Maps JS API');
        return null;
    }
    
    async fetchPlaceDetails(placeId) {
        try {
            if (typeof google !== 'undefined' && google.maps && google.maps.places) {
                return this.fetchPlaceDetailsWithJSAPI(placeId);
            }
            
            console.log('Google Maps JavaScript API not loaded for place details');
            return null;
            
        } catch (error) {
            console.error('Error fetching place details:', error);
            return null;
        }
    }
    
    async fetchPlaceDetailsWithJSAPI(placeId) {
        return new Promise((resolve) => {
            const service = new google.maps.places.PlacesService(document.createElement('div'));
            
            const request = {
                placeId: placeId,
                fields: [
                    'place_id', 'name', 'rating', 'user_ratings_total', 
                    'reviews', 'formatted_phone_number', 'opening_hours', 
                    'website', 'photos'
                ]
            };
            
            service.getDetails(request, (place, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK) {
                    resolve(place);
                } else {
                    console.log(`Failed to get place details for ${placeId}: ${status}`);
                    resolve(null);
                }
            });
        });
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