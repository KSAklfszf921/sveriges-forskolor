/* ============================================
   01-CORE: JAVASCRIPT VARIABLES & CONSTANTS
   Globala konstanter och konfiguration
   ============================================ */

// Global Variables
let map;
let markerClusterGroup;
let allMarkers = [];
let filteredMarkers = [];
let currentFilters = {
    huvudman: null,
    size: null
};
let currentSearchTerm = '';
let currentHighlightIndex = -1;
let sidebarPage = 0;
const schoolsPerPage = 10;
let selectedForComparison = [];
let userLocation = null;
let userLocationMarker = null;

// Cache Managers for optimized API usage
let placesCache;
let streetViewCache;

// Google API Configuration
window.GOOGLE_MAPS_API_KEY = 'AIzaSyAiw36pD7WMkFwBDgyrll9imHsxzK1JiTY';
let placesDataCache = new Map(); // Simple in-memory cache for Places data

// Application Configuration
const APP_CONFIG = {
    maxSizeFilter: 200,
    searchMinLength: 2,
    defaultZoom: 6,
    detailZoom: 16,
    animationDuration: 300,
    colors: {
        kommunal: '#3498db',
        enskild: '#e74c3c',
        excellent: '#27ae60',
        good: '#f39c12',
        poor: '#e74c3c',
        noData: '#95a5a6'
    }
};

// Quality Assessment Functions
function getChildrenPerGroupQuality(childrenPerGroup) {
    if (childrenPerGroup <= 0) return 'no-data';
    if (childrenPerGroup <= 12) return 'excellent';
    if (childrenPerGroup <= 15) return 'good';
    return 'poor';
}

function getTeacherQualificationQuality(qualification) {
    if (qualification <= 0) return 'no-data';
    if (qualification >= 80) return 'excellent';
    if (qualification >= 60) return 'good';
    return 'poor';
}

function getQualityColor(quality) {
    const colors = {
        'excellent': { backgroundColor: APP_CONFIG.colors.excellent, textColor: 'white' },
        'good': { backgroundColor: APP_CONFIG.colors.good, textColor: 'white' },
        'poor': { backgroundColor: APP_CONFIG.colors.poor, textColor: 'white' },
        'no-data': { backgroundColor: APP_CONFIG.colors.noData, textColor: 'white' }
    };
    return colors[quality] || colors['no-data'];
}