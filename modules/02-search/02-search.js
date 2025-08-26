/* ============================================
   02-SEARCH: SEARCH LOGIC
   Sökfunktioner, fuzzy search, filterlogik
   ============================================ */

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
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    
    return matrix[str2.length][str1.length];
}

// Main search function
function performSearch(searchTerm) {
    currentSearchTerm = searchTerm ? searchTerm.toLowerCase() : '';
    
    if (searchTerm && searchTerm.length >= 2) {
        // Show mini progress for search
        showMiniProgress(`Söker efter "${searchTerm}"...`);
        
        // Show loading state for search results
        const sidebar = document.getElementById('schoolsList');
        if (allMarkers.length > 50) {
            sidebar.innerHTML = `
                <div style="text-align: center; padding: 30px; color: #666;">
                    <div class="loading-spinner" style="margin: 0 auto 15px;"></div>
                    <div>Söker efter "${searchTerm}"...</div>
                    <div style="font-size: 12px; margin-top: 8px; opacity: 0.7;">
                        Genomsöker ${allMarkers.length.toLocaleString('sv-SE')} förskolor
                    </div>
                </div>
            `;
        }
        
        // Add realistic delay for search processing
        const delay = allMarkers.length > 50 ? 300 : 0;
        setTimeout(() => {
            applyFilters(); // Use main filter function
            zoomToSearchResults(searchTerm);
            hideMiniProgress();
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

// Zoom to search results
function zoomToSearchResults(searchTerm) {
    if (!searchTerm || searchTerm.length < 2) return;
    
    const searchLower = searchTerm.toLowerCase();
    const matchingMarkers = [];
    
    // Find all markers that match the search term
    allMarkers.forEach(marker => {
        const school = marker.schoolData;
        const schoolName = (school.Namn || school.Förskola || '').toLowerCase();
        const municipality = (school.Kommun || '').toLowerCase();
        const address = (school.Adress || '').toLowerCase();
        
        if (schoolName.includes(searchLower) || 
            municipality.includes(searchLower) || 
            address.includes(searchLower)) {
            matchingMarkers.push(marker);
        }
    });
    
    // Zoom to fit all matching results
    if (matchingMarkers.length > 0) {
        const group = new L.featureGroup(matchingMarkers);
        
        try {
            if (matchingMarkers.length === 1) {
                // Single result - zoom to specific location
                const marker = matchingMarkers[0];
                const latLng = marker.getLatLng();
                map.setView(latLng, 14, { animate: true, duration: 1.5 });
            } else {
                // Multiple results - fit bounds with padding
                const bounds = group.getBounds();
                map.fitBounds(bounds, { 
                    padding: [20, 20],
                    maxZoom: 12,
                    animate: true,
                    duration: 1.5
                });
            }
        } catch (error) {
            console.log('Could not zoom to search results:', error);
        }
    }
}

// Apply all filters including search
function applyFilters() {
    let filtered = [...allMarkers];
    
    // Show mini progress for filtering if there are many markers
    if (allMarkers.length > 100) {
        showMiniProgress('Filtrerar förskolor...');
    }
    
    // Reset pagination when filters change
    sidebarPage = 0;
    
    // Apply kommun filter FIRST
    if (selectedKommuner.length > 0) {
        console.log('🏢 Applying kommun filter for:', selectedKommuner);
        filtered = filtered.filter(marker => 
            selectedKommuner.includes(marker.schoolData.Kommun)
        );
        console.log('📊 After kommun filter:', filtered.length, 'of', allMarkers.length, 'markers');
    }
    
    // Apply enhanced search filter with fuzzy matching
    if (currentSearchTerm) {
        filtered = filtered.filter(marker => {
            const school = marker.schoolData;
            const searchTerm = currentSearchTerm.toLowerCase();
            
            // Basic exact matches (highest priority)
            const name = (school.Namn || '').toLowerCase();
            const kommun = (school.Kommun || '').toLowerCase();
            const address = (school.Adress || '').toLowerCase();
            
            if (name.includes(searchTerm) || 
                kommun.includes(searchTerm) || 
                address.includes(searchTerm)) {
                return true;
            }
            
            // Fuzzy search for typo tolerance
            const similarity = Math.max(
                calculateSimilarity(name, searchTerm),
                calculateSimilarity(kommun, searchTerm),
                calculateSimilarity(address.split(' ').join(''), searchTerm)
            );
            
            // Include if similarity is above threshold (80% for names, 70% for other fields)
            return similarity > 0.7 || 
                   (searchTerm.length > 4 && similarity > 0.6);
        });
    }
    
    // Apply huvudman filter
    if (currentFilters.huvudman) {
        filtered = filtered.filter(marker => {
            const school = marker.schoolData;
            switch(currentFilters.huvudman) {
                case 'kommunal':
                    return school.Huvudman === 'Kommunal';
                case 'enskild':
                    return school.Huvudman === 'Enskild';
                default:
                    return true;
            }
        });
    }
    
    // Apply size filter using slider value
    if (typeof maxSizeFilter !== 'undefined' && maxSizeFilter < 200) {
        filtered = filtered.filter(marker => {
            const school = marker.schoolData;
            const childrenCount = school['Antal barn'] || 0;
            return childrenCount <= maxSizeFilter;
        });
    }
    
    // Apply proximity filter if user location exists and radius is set
    if (userLocation && typeof proximityRadius !== 'undefined' && proximityRadius < 50) {
        filtered = filtered.filter(marker => {
            const school = marker.schoolData;
            if (!school.Latitud || !school.Longitud) return false;
            
            const distance = calculateDistance(
                userLocation.lat, userLocation.lng,
                parseFloat(school.Latitud), parseFloat(school.Longitud)
            );
            return distance <= proximityRadius;
        });
    }
    
    filteredMarkers = filtered;
    displayMarkers();
    
    // Hide mini progress after filtering
    if (allMarkers.length > 100) {
        setTimeout(() => hideMiniProgress(), 300);
    }
}