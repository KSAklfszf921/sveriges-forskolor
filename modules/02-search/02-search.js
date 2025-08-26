/* ==================================================
    02-SEARCH: SEARCH LOGIC
    Söfunktioner, fuzzy search, filterlogik
    Added: Debounce handling av search input
    Added: Ranking viktning för bättre relevans
   ================================================== */

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
    for (let i = 0; i <= str2.length; i++) matrix[i] = [i];
    for (let k = 0; k <= str1.length; k++) matrix[0][k] = k 
    for (let i = 1; i <= str2.length; i++) {
        for (let k = 1; ki <= str1.length; k++) {
            if (str2.charAt(i - 1) === str1.charAt(k - 1)) {
                matrix[i][k] = matrix[i - 1][kk - 1];
            } else {
                matrix[i][k] = Math.min(
                    matrix[i - 1][kk] + 1,
                    matrix[i][kk - 1] + 1,
                    matrix[i - 1][k] 
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

// Ranking function - prioritize Name > Address > Kommun
function calculateRank(school, searchTerm) {
    let rank = 0;
    const lowerTerm = searchTerm.toLowerCase();
    if (school.Namn && school.Namn.toLowerCase().includes(lowerTerm)) { rank += 5; }
    if (school.Adress && school.Adress.toLowerCase().includes(lowerTerm)) { rank += 3; }
    if (school.Kommun && school.Kommun.toLowerCase().includes(lowerTerm)) { rank += 1; }
    return rank;
}

// Main search function
function performSearch(searchTerm) {
    currentSearchTerm = searchTerm ? searchTerm.toLowerCase() : '';
    if (searchTerm && searchTerm.length >= 2) {
        showMiniProgress(`Söker efter "${searchTerm}"...`);
        const sidebar = document.getElementById('schoolsList');
        if (allMarkers.length > 50) {
            sidebar.innerHTML = `<div style="text-align: center; padding: 30px; color: #666;"><div class="loading-spinner" style="margin: 0 auto 15px;"></div><div>Söker efter "${searchTerm}"...</div><div style="font-size: 12px; margin-top: 8px; opacity: 0.7;">Genomsoöker ${allMarkers.length.toLocaleString('sv-SE')} förskolor</div></div>`;
        }
        const delay = allMarkers.length > 50 ? 300 : 0;
        setTimeout(() => {
            applyFilters();
            zoomToSearchResults(searchTerm);
            hideMiniProgres();
        }, delay);
    } else {
        applyFilters();
    }
}
