/**
 * Advanced Debug Logger for Sveriges Förskolor
 * Tracks all user interactions, API calls, and system events
 */

class DebugLogger {
    constructor() {
        this.logs = [];
        this.sessionId = this.generateSessionId();
        this.startTime = Date.now();
        this.isEnabled = true;
        
        // Event categories
        this.categories = {
            USER: 'user-interaction',
            API: 'api-call',
            STREET_VIEW: 'streetview',
            PLACES: 'places-api',
            MAP: 'map-event',
            ERROR: 'error',
            SYSTEM: 'system',
            PERFORMANCE: 'performance'
        };
        
        this.init();
    }
    
    init() {
        this.log('SYSTEM', 'Debug logger initialized', { sessionId: this.sessionId });
        this.setupGlobalErrorHandling();
        this.setupPerformanceMonitoring();
        this.createExportUI();
    }
    
    // Core logging method
    log(category, message, data = {}) {
        if (!this.isEnabled) return;
        
        const logEntry = {
            timestamp: Date.now(),
            relativeTime: Date.now() - this.startTime,
            category: category,
            message: message,
            data: data,
            url: window.location.href,
            userAgent: navigator.userAgent,
            sessionId: this.sessionId
        };
        
        this.logs.push(logEntry);
        
        // Console output with emoji
        const emoji = this.getCategoryEmoji(category);
        console.log(`${emoji} [${category}] ${message}`, data);
        
        // Keep only last 1000 logs to prevent memory issues
        if (this.logs.length > 1000) {
            this.logs = this.logs.slice(-1000);
        }
    }
    
    // Log user interactions
    logUserEvent(element, action, details = {}) {
        this.log('USER', `${action} on ${element}`, {
            element: element,
            action: action,
            ...details
        });
    }
    
    // Log API calls
    logAPICall(apiName, endpoint, status, responseTime, details = {}) {
        this.log('API', `${apiName} call to ${endpoint}`, {
            api: apiName,
            endpoint: endpoint,
            status: status,
            responseTime: responseTime,
            ...details
        });
    }
    
    // Log Street View events
    logStreetView(action, details = {}) {
        this.log('STREET_VIEW', action, details);
    }
    
    // Log Places API events
    logPlaces(action, details = {}) {
        this.log('PLACES', action, details);
    }
    
    // Log map events
    logMap(action, details = {}) {
        this.log('MAP', action, details);
    }
    
    // Log errors
    logError(error, context = '') {
        this.log('ERROR', `Error: ${error.message || error}`, {
            error: error.toString(),
            stack: error.stack,
            context: context
        });
    }
    
    // Log performance metrics
    logPerformance(metric, value, details = {}) {
        this.log('PERFORMANCE', `${metric}: ${value}ms`, {
            metric: metric,
            value: value,
            ...details
        });
    }
    
    // Get emoji for category
    getCategoryEmoji(category) {
        const emojis = {
            'user-interaction': '👤',
            'api-call': '🌐',
            'streetview': '🏠',
            'places-api': '📍',
            'map-event': '🗺️',
            'error': '❌',
            'system': '⚙️',
            'performance': '⚡'
        };
        return emojis[category] || '📝';
    }
    
    // Setup global error handling
    setupGlobalErrorHandling() {
        window.addEventListener('error', (event) => {
            this.logError(event.error || event.message, `Global error in ${event.filename}:${event.lineno}`);
        });
        
        window.addEventListener('unhandledrejection', (event) => {
            this.logError(event.reason, 'Unhandled promise rejection');
        });
    }
    
    // Setup performance monitoring
    setupPerformanceMonitoring() {
        // Monitor page load time
        window.addEventListener('load', () => {
            const loadTime = performance.now();
            this.logPerformance('Page Load', Math.round(loadTime));
        });
        
        // Monitor navigation timing if available
        if (performance.navigation) {
            setTimeout(() => {
                const timing = performance.timing;
                this.logPerformance('DOM Ready', timing.domContentLoadedEventEnd - timing.navigationStart);
                this.logPerformance('Full Load', timing.loadEventEnd - timing.navigationStart);
            }, 100);
        }
    }
    
    // Generate unique session ID
    generateSessionId() {
        return 'debug_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    // Filter logs by category
    getLogsByCategory(category) {
        return this.logs.filter(log => log.category === category);
    }
    
    // Filter logs by time range
    getLogsByTimeRange(startTime, endTime) {
        return this.logs.filter(log => 
            log.timestamp >= startTime && log.timestamp <= endTime
        );
    }
    
    // Get logs for the last N seconds
    getRecentLogs(seconds = 60) {
        const cutoff = Date.now() - (seconds * 1000);
        return this.logs.filter(log => log.timestamp >= cutoff);
    }
    
    // Export logs as JSON
    exportAsJSON() {
        const exportData = {
            sessionId: this.sessionId,
            exportTime: Date.now(),
            sessionDuration: Date.now() - this.startTime,
            totalLogs: this.logs.length,
            categories: this.getLogSummary(),
            logs: this.logs
        };
        
        return JSON.stringify(exportData, null, 2);
    }
    
    // Export logs as CSV
    exportAsCSV() {
        const headers = ['Timestamp', 'Relative Time (ms)', 'Category', 'Message', 'Data'];
        const csvRows = [headers.join(',')];
        
        this.logs.forEach(log => {
            const row = [
                new Date(log.timestamp).toISOString(),
                log.relativeTime,
                log.category,
                `"${log.message.replace(/"/g, '""')}"`,
                `"${JSON.stringify(log.data).replace(/"/g, '""')}"`
            ];
            csvRows.push(row.join(','));
        });
        
        return csvRows.join('\n');
    }
    
    // Get summary of logs by category
    getLogSummary() {
        const summary = {};
        this.logs.forEach(log => {
            summary[log.category] = (summary[log.category] || 0) + 1;
        });
        return summary;
    }
    
    // Create export UI
    createExportUI() {
        // Create floating debug panel
        const panel = document.createElement('div');
        panel.id = 'debug-logger-panel';
        panel.innerHTML = `
            <div style="
                position: fixed;
                top: 10px;
                right: 10px;
                z-index: 10000;
                background: rgba(0,0,0,0.9);
                color: white;
                padding: 15px;
                border-radius: 8px;
                font-family: monospace;
                font-size: 12px;
                max-width: 300px;
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255,255,255,0.2);
            ">
                <div style="margin-bottom: 10px; font-weight: bold;">🔍 Debug Logger</div>
                <div id="debug-stats" style="margin-bottom: 10px; font-size: 11px;"></div>
                <button id="export-json" style="
                    background: #007bff;
                    color: white;
                    border: none;
                    padding: 5px 10px;
                    margin: 2px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 11px;
                ">📥 Export JSON</button>
                <button id="export-csv" style="
                    background: #28a745;
                    color: white;
                    border: none;
                    padding: 5px 10px;
                    margin: 2px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 11px;
                ">📊 Export CSV</button>
                <button id="clear-logs" style="
                    background: #dc3545;
                    color: white;
                    border: none;
                    padding: 5px 10px;
                    margin: 2px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 11px;
                ">🗑️ Clear</button>
                <button id="toggle-logging" style="
                    background: #ffc107;
                    color: black;
                    border: none;
                    padding: 5px 10px;
                    margin: 2px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 11px;
                ">⏸️ Pause</button>
            </div>
        `;
        
        document.body.appendChild(panel);
        
        // Update stats periodically
        this.updateStatsDisplay();
        setInterval(() => this.updateStatsDisplay(), 2000);
        
        // Setup button handlers
        this.setupExportHandlers();
    }
    
    // Update stats display
    updateStatsDisplay() {
        const statsDiv = document.getElementById('debug-stats');
        if (!statsDiv) return;
        
        const summary = this.getLogSummary();
        const recentLogs = this.getRecentLogs(10).length;
        
        statsDiv.innerHTML = `
            Total: ${this.logs.length} logs<br>
            Recent (10s): ${recentLogs}<br>
            Session: ${Math.round((Date.now() - this.startTime) / 1000)}s
        `;
    }
    
    // Setup export button handlers
    setupExportHandlers() {
        document.getElementById('export-json')?.addEventListener('click', () => {
            this.downloadFile(this.exportAsJSON(), `debug-logs-${this.sessionId}.json`, 'application/json');
            this.log('SYSTEM', 'Logs exported as JSON');
        });
        
        document.getElementById('export-csv')?.addEventListener('click', () => {
            this.downloadFile(this.exportAsCSV(), `debug-logs-${this.sessionId}.csv`, 'text/csv');
            this.log('SYSTEM', 'Logs exported as CSV');
        });
        
        document.getElementById('clear-logs')?.addEventListener('click', () => {
            this.logs = [];
            this.log('SYSTEM', 'Logs cleared');
        });
        
        document.getElementById('toggle-logging')?.addEventListener('click', (e) => {
            this.isEnabled = !this.isEnabled;
            e.target.textContent = this.isEnabled ? '⏸️ Pause' : '▶️ Resume';
            e.target.style.background = this.isEnabled ? '#ffc107' : '#6c757d';
            this.log('SYSTEM', `Logging ${this.isEnabled ? 'resumed' : 'paused'}`);
        });
    }
    
    // Download file
    downloadFile(content, filename, contentType) {
        const blob = new Blob([content], { type: contentType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    // Enable/disable logging
    enable() {
        this.isEnabled = true;
        this.log('SYSTEM', 'Logging enabled');
    }
    
    disable() {
        this.isEnabled = false;
    }
    
    // Clear all logs
    clear() {
        this.logs = [];
    }
    
    // Get current stats
    getStats() {
        return {
            sessionId: this.sessionId,
            totalLogs: this.logs.length,
            sessionDuration: Date.now() - this.startTime,
            categories: this.getLogSummary(),
            enabled: this.isEnabled
        };
    }
}

// Initialize global debug logger
if (typeof window !== 'undefined') {
    window.debugLogger = new DebugLogger();
}

// Export for Node.js if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DebugLogger;
}