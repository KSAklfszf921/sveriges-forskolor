/**
 * Automated Production Logger for Sveriges Förskolor
 * Continuously logs events, API calls, errors and system status to Supabase
 * Self-managing with automatic cleanup and size limits
 */

class AutomatedLogger {
    constructor() {
        this.sessionId = this.generateSessionId();
        this.startTime = Date.now();
        this.buffer = []; // Local buffer before database writes
        this.maxBufferSize = 50; // Buffer before writing to DB
        this.maxLogAge = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
        this.maxStorageSize = 10 * 1024 * 1024; // 10MB limit
        this.flushInterval = 30000; // 30 seconds
        this.cleanupInterval = 60 * 60 * 1000; // 1 hour
        
        // Supabase connection
        this.supabaseUrl = 'https://zfeqsdtddvelapbrwlol.supabase.co';
        this.supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmZXFzZHRkZHZlbGFwYnJ3bG9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjQwNjA2MjMsImV4cCI6MjAzOTYzNjYyM30.bPl7ZBHQD7yI9OKQ6_VqL2QWGhzJpHqNa5H1YgvY-qo';
        
        // Categories for different log types
        this.categories = {
            SYSTEM: 'SYSTEM',
            ERROR: 'ERROR', 
            API: 'API',
            USER: 'USER',
            PERFORMANCE: 'PERFORMANCE',
            SUPABASE: 'SUPABASE',
            GOOGLE_API: 'GOOGLE_API'
        };
        
        this.init();
    }
    
    generateSessionId() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 9);
        return `prod_${timestamp}_${random}`;
    }
    
    async init() {
        try {
            // Initial system log
            this.log(this.categories.SYSTEM, 'Automated logger started', {
                sessionId: this.sessionId,
                userAgent: navigator.userAgent,
                url: window.location.href,
                timestamp: new Date().toISOString()
            });
            
            // Ensure table exists
            await this.ensureTableExists();
            
            // Test Supabase connection
            await this.testSupabaseConnection();
            
            // Test API keys
            await this.checkAPIKeysStatus();
            
            // Setup automatic flushing and cleanup
            this.setupAutoFlush();
            this.setupAutoCleanup();
            this.setupGlobalErrorHandling();
            this.setupPerformanceMonitoring();
            this.setupSupabaseMonitoring();
            
            console.log('✅ Automated logger initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize automated logger:', error);
            // Continue running even if setup fails
        }
    }
    
    // Core logging method
    log(category, message, data = {}) {
        const logEntry = {
            session_id: this.sessionId,
            category: category,
            message: message,
            data: JSON.stringify(data),
            timestamp: new Date().toISOString(),
            relative_time: Date.now() - this.startTime,
            url: window.location.href,
            user_agent: navigator.userAgent.substr(0, 500) // Limit length
        };
        
        this.buffer.push(logEntry);
        
        // Auto-flush if buffer is full
        if (this.buffer.length >= this.maxBufferSize) {
            this.flushToDatabase();
        }
    }
    
    // Ensure logging table exists
    async ensureTableExists() {
        // Try a simple insert first - if it fails, table might not exist
        try {
            const testResponse = await fetch(`${this.supabaseUrl}/rest/v1/app_logs?limit=1`, {
                method: 'GET',
                headers: {
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${this.supabaseKey}`
                }
            });
            
            if (testResponse.ok) {
                console.log('✅ Logging table exists');
            } else if (testResponse.status === 404) {
                console.warn('⚠️ Logging table may not exist, continuing anyway...');
            }
        } catch (error) {
            console.warn('⚠️ Could not verify table existence:', error.message);
        }
    }
    
    // Test Supabase connection and log status
    async testSupabaseConnection() {
        try {
            const response = await fetch(`${this.supabaseUrl}/rest/v1/`, {
                headers: {
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${this.supabaseKey}`
                }
            });
            
            if (response.ok) {
                this.log(this.categories.SUPABASE, 'Connection successful', {
                    status: response.status,
                    statusText: response.statusText
                });
            } else {
                this.log(this.categories.ERROR, 'Supabase connection failed', {
                    status: response.status,
                    statusText: response.statusText
                });
            }
        } catch (error) {
            this.log(this.categories.ERROR, 'Supabase connection error', {
                error: error.message,
                stack: error.stack
            });
        }
    }
    
    // Check status of all API keys
    async checkAPIKeysStatus() {
        // Google Maps API
        try {
            if (window.GOOGLE_MAPS_API_KEY) {
                const response = await fetch(
                    `https://maps.googleapis.com/maps/api/geocode/json?address=Stockholm&key=${window.GOOGLE_MAPS_API_KEY}`
                );
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.status === 'OK') {
                        this.log(this.categories.GOOGLE_API, 'Google Maps API key valid', {
                            keyPrefix: window.GOOGLE_MAPS_API_KEY.substr(0, 10) + '...',
                            status: 'VALID'
                        });
                    } else {
                        this.log(this.categories.ERROR, 'Google Maps API key issue', {
                            status: data.status,
                            error_message: data.error_message
                        });
                    }
                } else {
                    this.log(this.categories.ERROR, 'Google Maps API request failed', {
                        status: response.status
                    });
                }
            }
        } catch (error) {
            this.log(this.categories.ERROR, 'Google Maps API check failed', {
                error: error.message
            });
        }
    }
    
    // Flush buffer to Supabase database
    async flushToDatabase() {
        if (this.buffer.length === 0) return;
        
        const logsToFlush = [...this.buffer];
        this.buffer = []; // Clear buffer immediately
        
        try {
            const response = await fetch(`${this.supabaseUrl}/rest/v1/app_logs`, {
                method: 'POST',
                headers: {
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${this.supabaseKey}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify(logsToFlush)
            });
            
            if (response.ok) {
                console.log(`✅ Flushed ${logsToFlush.length} logs to database`);
            } else {
                const errorText = await response.text();
                console.warn(`⚠️ Failed to flush logs (${response.status}): ${errorText}`);
                
                // Only put back in buffer if it's a temporary error, not if table doesn't exist
                if (response.status >= 500 || response.status === 0) {
                    this.buffer.unshift(...logsToFlush.slice(0, 20)); // Keep only last 20 on error
                }
            }
            
        } catch (error) {
            console.warn('⚠️ Error flushing logs (network/connection issue):', error.message);
            // Keep a small subset of logs for retry on network errors
            this.buffer.unshift(...logsToFlush.slice(0, 10));
        }
        
        // Prevent buffer from growing too large
        if (this.buffer.length > 200) {
            this.buffer = this.buffer.slice(-100); // Keep only last 100 logs
            console.warn('⚠️ Log buffer trimmed to prevent memory issues');
        }
    }
    
    // Setup automatic database flushing
    setupAutoFlush() {
        setInterval(() => {
            if (this.buffer.length > 0) {
                this.flushToDatabase();
            }
        }, this.flushInterval);
    }
    
    // Setup automatic log cleanup
    setupAutoCleanup() {
        setInterval(async () => {
            try {
                await this.cleanupOldLogs();
            } catch (error) {
                console.error('Cleanup error:', error);
            }
        }, this.cleanupInterval);
        
        // Also run cleanup on page load
        setTimeout(() => this.cleanupOldLogs(), 60000); // After 1 minute
    }
    
    // Clean up old logs to maintain size limit
    async cleanupOldLogs() {
        try {
            const cutoffDate = new Date(Date.now() - this.maxLogAge);
            
            // Delete logs older than maxLogAge
            const deleteResponse = await fetch(`${this.supabaseUrl}/rest/v1/app_logs`, {
                method: 'DELETE',
                headers: {
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${this.supabaseKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    timestamp: `lt.${cutoffDate.toISOString()}`
                })
            });
            
            // Check total storage size and clean if needed
            const sizeResponse = await fetch(`${this.supabaseUrl}/rest/v1/app_logs?select=data&limit=1000`, {
                headers: {
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${this.supabaseKey}`
                }
            });
            
            if (sizeResponse.ok) {
                const logs = await sizeResponse.json();
                const totalSize = logs.reduce((sum, log) => sum + (log.data ? log.data.length : 0), 0);
                
                if (totalSize > this.maxStorageSize) {
                    // Delete oldest logs to get under limit
                    const deleteOldResponse = await fetch(`${this.supabaseUrl}/rest/v1/app_logs?order=timestamp.asc&limit=100`, {
                        method: 'DELETE',
                        headers: {
                            'apikey': this.supabaseKey,
                            'Authorization': `Bearer ${this.supabaseKey}`
                        }
                    });
                    
                    this.log(this.categories.SYSTEM, 'Storage cleanup performed', {
                        totalSize: totalSize,
                        limit: this.maxStorageSize
                    });
                }
            }
            
        } catch (error) {
            console.error('Cleanup failed:', error);
        }
    }
    
    // Monitor Supabase operations
    setupSupabaseMonitoring() {
        // Override fetch for Supabase calls to log them
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            const [url, options] = args;
            
            if (typeof url === 'string' && url.includes('supabase.co')) {
                const startTime = Date.now();
                
                try {
                    const response = await originalFetch(...args);
                    const duration = Date.now() - startTime;
                    
                    this.log(this.categories.SUPABASE, 'Database operation', {
                        method: options?.method || 'GET',
                        url: url,
                        status: response.status,
                        duration: duration,
                        success: response.ok
                    });
                    
                    return response;
                } catch (error) {
                    this.log(this.categories.ERROR, 'Supabase operation failed', {
                        url: url,
                        error: error.message,
                        duration: Date.now() - startTime
                    });
                    throw error;
                }
            }
            
            return originalFetch(...args);
        };
    }
    
    // Setup global error handling
    setupGlobalErrorHandling() {
        window.addEventListener('error', (event) => {
            this.log(this.categories.ERROR, 'JavaScript Error', {
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                stack: event.error?.stack
            });
        });
        
        window.addEventListener('unhandledrejection', (event) => {
            this.log(this.categories.ERROR, 'Unhandled Promise Rejection', {
                reason: event.reason?.toString(),
                stack: event.reason?.stack
            });
        });
    }
    
    // Setup performance monitoring
    setupPerformanceMonitoring() {
        // Monitor page load performance
        window.addEventListener('load', () => {
            if (window.performance) {
                const perfData = window.performance.timing;
                const loadTime = perfData.loadEventEnd - perfData.navigationStart;
                const domReady = perfData.domContentLoadedEventEnd - perfData.navigationStart;
                
                this.log(this.categories.PERFORMANCE, 'Page Load Performance', {
                    fullLoadTime: loadTime,
                    domReadyTime: domReady,
                    dnslookup: perfData.domainLookupEnd - perfData.domainLookupStart,
                    tcpConnect: perfData.connectEnd - perfData.connectStart,
                    serverResponse: perfData.responseEnd - perfData.requestStart
                });
            }
        });
        
        // Monitor memory usage periodically
        if (window.performance && window.performance.memory) {
            setInterval(() => {
                const memory = window.performance.memory;
                this.log(this.categories.PERFORMANCE, 'Memory Usage', {
                    usedJSHeapSize: memory.usedJSHeapSize,
                    totalJSHeapSize: memory.totalJSHeapSize,
                    jsHeapSizeLimit: memory.jsHeapSizeLimit
                });
            }, 5 * 60 * 1000); // Every 5 minutes
        }
    }
    
    // Public method to log custom events
    logEvent(category, message, data = {}) {
        this.log(category, message, data);
    }
    
    // Log user interactions
    logUserAction(action, data = {}) {
        this.log(this.categories.USER, action, data);
    }
    
    // Log API calls
    logAPICall(api, endpoint, data = {}) {
        this.log(this.categories.API, `${api}: ${endpoint}`, data);
    }
    
    // Manual flush method for testing
    async forceFlush() {
        await this.flushToDatabase();
    }
    
    // Get buffer status
    getStatus() {
        return {
            sessionId: this.sessionId,
            bufferSize: this.buffer.length,
            uptime: Date.now() - this.startTime
        };
    }
}

// Initialize automated logger
window.automatedLogger = new AutomatedLogger();

// Make logging methods available globally
window.logEvent = (category, message, data) => window.automatedLogger.logEvent(category, message, data);
window.logUserAction = (action, data) => window.automatedLogger.logUserAction(action, data);
window.logAPICall = (api, endpoint, data) => window.automatedLogger.logAPICall(api, endpoint, data);

console.log('🤖 Automated production logger active');