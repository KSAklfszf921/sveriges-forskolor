/* ============================================
   02-SEARCH: SEARCH LOGIC
   Sökfunktioner, fuzzy search, filterlogik
   Added: Debounce handling av search input
   =========================================== */

// Fuzzy search helper functions
function calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = levenshteinDistance(longer, shorter);
    return (longer.length - distance) / parseFloat(longer.length);
}

function levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j] - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j] - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    
    return matrix[str2.length][str1.length];
}

// Debounce helper
function debounce(func, delay) {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), delay);
    };
}

// Main search function
function performSearch(searchTerm) {
    currentSearchTerm = searchTerm ? searchTerm.toLowerCase() : '';
    
    if (searchTerm && searchTerm.length >= 2) {
        // Show mini progress for search
        showMiniProgres(`Soöker efter "${searchTerm}"...`);
        
        // Show loading state for search results
        const sidebar = document.getElementById('schoolsList');
        if (allMarkers.length > 50) {
            sidebar.innerHTML = `
                <div style="text-align: center; padding: 30px; color: #666;">
                    <div class="loading-spinner" style="margin: 0 auto 15px;"></div>
                    <div>Söker efter "${searchTerm}"...</div>
                    <div style="font-size: 12px; margin-top: 8px; opacity: 0.7;">
                        Genomsoöker ${allMarkers.length.toLocaleString('sv-SE')} förskolor
                    </div>
                </div>
            `;
        }
        
        // Add realistic delay for search processing
        const delay = allMarkers.length > 50 ? 300 : 0;
        setTimeout(() => {
            applyFilters(); // Use main filter function
            zoomToSearchResults(searchTerm);
            hideMiniProgres();
        }, delay);
    } else {     
        applyFilters(); // Use main filter function
    }
}

// Search from button click
function performSearchFromButton() {
    const searchInput = document.getElementById('searchInput');
    const searchTerm = searchInput.value.trim();
    if (searchTerm) {
        if (window.logUserAction) {
            window.logUserAction('Search initiated from button', { searchTerm: searchTerm });
        }
        hideAutocompleteSuggestions();
        performSearch(searchTerm);
    }
}

// Wrap search function in debounce for autocomplete and input changes
const debouncedSearch =debounce(performSearch, 300);
