/* ============================================
   02-SEARCH: AUTOCOMPLETE FUNCTIONALITY
   Autocomplete förslag och hantering
   ============================================ */

// Show autocomplete suggestions
function showAutocompleteSuggestions(searchTerm) {
    const suggestionsContainer = document.getElementById('autocompleteSuggestions');
    const suggestions = getAutocompleteSuggestions(searchTerm.toLowerCase());
    
    if (suggestions.length === 0) {
        hideAutocompleteSuggestions();
        return;
    }
    
    let html = '';
    suggestions.forEach(suggestion => {
        html += `
            <div class="autocomplete-suggestion" onclick="selectSuggestion('${suggestion.value}')">
                <span class="suggestion-name">${suggestion.name}</span>
                <span class="suggestion-type">${suggestion.type}</span>
            </div>
        `;
    });
    
    suggestionsContainer.innerHTML = html;
    suggestionsContainer.style.display = 'block';
    
    // Reset highlight index when showing new suggestions
    currentHighlightIndex = -1;
}

// Generate autocomplete suggestions
function getAutocompleteSuggestions(searchTerm) {
    const suggestions = new Set();
    const municipalities = new Set();
    const schools = new Set();
    
    // Get unique municipalities and schools that match
    allSchoolsData.forEach(school => {
        const schoolName = school.Namn?.toLowerCase() || '';
        const municipality = school.Kommun?.toLowerCase() || '';
        const address = school.Adress?.toLowerCase() || '';
        
        // Match school names
        if (schoolName.includes(searchTerm) && schoolName.length > 0) {
            if (schools.size < 8) { // Limit suggestions
                schools.add({
                    name: school.Namn,
                    value: school.Namn,
                    type: 'Förskola'
                });
            }
        }
        
        // Match municipalities
        if (municipality.includes(searchTerm) && municipality.length > 0) {
            if (municipalities.size < 5) { // Limit suggestions
                municipalities.add({
                    name: school.Kommun,
                    value: school.Kommun,
                    type: 'Kommun'
                });
            }
        }
        
        // Match addresses
        if (address.includes(searchTerm) && address.length > 0) {
            if (schools.size < 8) {
                schools.add({
                    name: school.Adress,
                    value: school.Adress,
                    type: 'Adress'
                });
            }
        }
    });
    
    // Combine and prioritize: municipalities first, then schools
    const result = [...municipalities, ...schools];
    
    // Sort by relevance (exact matches first)
    return result.sort((a, b) => {
        const aStarts = a.name.toLowerCase().startsWith(searchTerm);
        const bStarts = b.name.toLowerCase().startsWith(searchTerm);
        
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return a.name.localeCompare(b.name);
    }).slice(0, 8); // Max 8 suggestions
}

// Hide autocomplete suggestions
function hideAutocompleteSuggestions() {
    const suggestionsContainer = document.getElementById('autocompleteSuggestions');
    if (suggestionsContainer) {
        suggestionsContainer.style.display = 'none';
        suggestionsContainer.innerHTML = '';
    }
    currentHighlightIndex = -1;
}

// Select a suggestion
function selectSuggestion(value) {
    const searchInput = document.getElementById('searchInput');
    searchInput.value = value;
    hideAutocompleteSuggestions();
    performSearch(value);
    
    if (window.logUserAction) {
        window.logUserAction('Autocomplete suggestion selected', { suggestion: value });
    }
}

// Handle keyboard navigation in autocomplete
function handleAutocompleteKeyboard(event) {
    const suggestionsContainer = document.getElementById('autocompleteSuggestions');
    const suggestions = suggestionsContainer.querySelectorAll('.autocomplete-suggestion');
    
    if (suggestions.length === 0) return;
    
    switch(event.key) {
        case 'ArrowDown':
            event.preventDefault();
            currentHighlightIndex = Math.min(currentHighlightIndex + 1, suggestions.length - 1);
            updateSuggestionHighlight(suggestions);
            break;
            
        case 'ArrowUp':
            event.preventDefault();
            currentHighlightIndex = Math.max(currentHighlightIndex - 1, -1);
            updateSuggestionHighlight(suggestions);
            break;
            
        case 'Enter':
            event.preventDefault();
            if (currentHighlightIndex >= 0 && suggestions[currentHighlightIndex]) {
                const suggestion = suggestions[currentHighlightIndex];
                const value = suggestion.querySelector('.suggestion-name').textContent;
                selectSuggestion(value);
            }
            break;
            
        case 'Escape':
            hideAutocompleteSuggestions();
            break;
    }
}

// Update visual highlight for suggestions
function updateSuggestionHighlight(suggestions) {
    suggestions.forEach((suggestion, index) => {
        suggestion.classList.toggle('highlighted', index === currentHighlightIndex);
    });
}

// Initialize search input event listeners
function initializeSearchInput() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    
    let debounceTimer;
    
    searchInput.addEventListener('input', (e) => {
        const value = e.target.value.trim();
        
        // Clear previous timer
        clearTimeout(debounceTimer);
        
        // Debounce the search
        debounceTimer = setTimeout(() => {
            if (value.length >= 2) {
                showAutocompleteSuggestions(value);
            } else {
                hideAutocompleteSuggestions();
            }
        }, 200);
    });
    
    searchInput.addEventListener('keydown', handleAutocompleteKeyboard);
    
    searchInput.addEventListener('blur', () => {
        // Delay hiding to allow for click events on suggestions
        setTimeout(() => {
            hideAutocompleteSuggestions();
        }, 200);
    });
    
    searchInput.addEventListener('focus', (e) => {
        const value = e.target.value.trim();
        if (value.length >= 2) {
            showAutocompleteSuggestions(value);
        }
    });
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', initializeSearchInput);