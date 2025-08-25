// Simple Google Places Integration
// Use global GOOGLE_MAPS_API_KEY defined in index.html

// Simple cache using localStorage
function getPlacesCache(schoolId) {
    try {
        const cache = JSON.parse(localStorage.getItem("places-cache") || "{}");
        const data = cache[schoolId];
        if (data && (Date.now() - data.timestamp) < 604800000) { // 7 days
            return data.content;
        }
    } catch (e) { 
        console.error("Cache error:", e); 
    }
    return null;
}

function setPlacesCache(schoolId, content) {
    try {
        const cache = JSON.parse(localStorage.getItem("places-cache") || "{}");
        cache[schoolId] = { content, timestamp: Date.now() };
        localStorage.setItem("places-cache", JSON.stringify(cache));
    } catch (e) { 
        console.error("Cache error:", e); 
    }
}

// Main Places loading function
async function loadSchoolPlacesData(schoolId, schoolName, lat, lng) {
    const button = event.target;
    const container = document.getElementById("places-result-" + schoolId);
    
    if (!container) {
        console.error("Places container not found for", schoolId);
        return;
    }

    // Check cache first
    const cached = getPlacesCache(schoolId);
    if (cached) {
        container.innerHTML = cached;
        button.style.display = "none";
        return;
    }

    button.textContent = "🔄 Laddar...";
    button.disabled = true;

    try {
        // Log Google Places API request start
        if (window.logAPICall) {
            window.logAPICall('Google Places', 'loadSchoolPlacesData', {
                schoolId: schoolId,
                schoolName: schoolName,
                coordinates: { lat: lat, lng: lng }
            });
        }
        
        // Load Google Maps API if needed
        if (!window.google) {
            await loadGoogleMapsAPI();
            if (window.logEvent) {
                window.logEvent('API', 'Google Maps API loaded successfully');
            }
        }

        // Search for place
        const place = await searchForPlace(schoolName, lat, lng);
        if (!place) {
            throw new Error("Förskolan hittades inte på Google Maps");
        }
        
        if (window.logAPICall) {
            window.logAPICall('Google Places', 'searchForPlace', {
                schoolName: schoolName,
                found: !!place,
                placeId: place?.place_id
            });
        }

        // Insert Google contact info above address after Places data loads
        insertGoogleContactAboveAddress(schoolId);        // Get place details
        const details = await getPlaceDetails(place.place_id);
        if (!details) {
            throw new Error("Kunde inte hämta detaljer från Google");
        }
        
        if (window.logAPICall) {
            window.logAPICall('Google Places', 'getPlaceDetails', {
                placeId: place.place_id,
                hasRating: !!details.rating,
                hasReviews: !!(details.reviews && details.reviews.length > 0),
                hasPhone: !!details.formatted_phone_number,
                hasWebsite: !!details.website
            });
        }

        // Generate content
        const content = generatePlacesContent(details, lat, lng);

        // Cache and display
        setPlacesCache(schoolId, content);
        container.innerHTML = content;
        button.style.display = "none";
        
        if (window.logEvent) {
            window.logEvent('USER', 'Google Places data loaded successfully', {
                schoolId: schoolId,
                schoolName: schoolName
            });
        }

    } catch (error) {
        console.error("Places error:", error);
        
        if (window.logEvent) {
            window.logEvent('ERROR', 'Google Places API error', {
                schoolId: schoolId,
                schoolName: schoolName,
                error: error.message,
                coordinates: { lat: lat, lng: lng }
            });
        }
        
        container.innerHTML = '<div style="color: #d32f2f; padding: 8px; font-size: 12px;">❌ ' + error.message + '</div>';
        button.textContent = "🔄 Försök igen";
        button.disabled = false;
    }
}

// Load Google Maps API
function loadGoogleMapsAPI() {
    return new Promise((resolve, reject) => {
        if (window.google && window.google.maps) {
            resolve();
            return;
        }
        const script = document.createElement("script");
        script.src = "https://maps.googleapis.com/maps/api/js?key=" + window.GOOGLE_MAPS_API_KEY + "&libraries=places";
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// Search for place
function searchForPlace(name, lat, lng) {
    return new Promise((resolve) => {
        const service = new google.maps.places.PlacesService(document.createElement("div"));
        const request = {
            location: new google.maps.LatLng(lat, lng),
            radius: 150,
            query: name,
            type: ["school", "establishment"]
        };

        service.textSearch(request, (results, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && results.length > 0) {
                resolve(results[0]);
            } else {
                resolve(null);
            }
        });
    });
}

// Get place details
function getPlaceDetails(placeId) {
    return new Promise((resolve) => {
        const service = new google.maps.places.PlacesService(document.createElement("div"));
        const request = {
            placeId: placeId,
            fields: ["name", "rating", "user_ratings_total", "reviews", 
                   "formatted_phone_number", "website", "opening_hours", "formatted_address"]
        };

        service.getDetails(request, (place, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK) {
                resolve(place);
            } else {
                resolve(null);
            }
        });
    });
}

// Generate Places content HTML
function generatePlacesContent(details, lat, lng) {
    let html = '<div class="places-content" style="background: #f5f5f5; padding: 12px; border-radius: 8px; margin-top: 8px;">';
    
    // Reviews section - discrete format
    if (details.rating && details.user_ratings_total) {
        html += `
            <div style="margin-bottom: 8px; padding: 6px 8px; background: #f9f9f9; border-radius: 4px; border-left: 3px solid #ff9800;">
                <div style="display: flex; align-items: center; justify-content: space-between;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 14px; font-weight: 600; color: #ff9800;">${details.rating.toFixed(1)}</span>
                        <span style="color: #ff9800; font-size: 14px;">${"⭐".repeat(Math.round(details.rating))}</span>
                        <span style="font-size: 11px; color: #888;">på Google (${details.user_ratings_total})</span>
                    </div>
                    ${details.reviews && details.reviews.length > 0 ? 
                        `<button onclick="toggleReviews(this)" class="toggle-reviews-btn" style="background: rgba(255, 152, 0, 0.1); border: 1px solid rgba(255, 152, 0, 0.3); color: #ff9800; cursor: pointer; font-size: 10px; padding: 4px 8px; border-radius: 12px; font-weight: 500; transition: all 0.2s ease;">
                            visa recensioner
                        </button>` : ''}
                </div>
            </div>
        `;
        
        // Hidden reviews section (collapsed by default) - compact format
        if (details.reviews && details.reviews.length > 0) {
            html += `<div class="reviews-expanded" style="display: none; margin-top: 6px; background: #fff; border-radius: 8px; border: 1px solid #e0e0e0; max-height: 200px; overflow-y: auto; box-shadow: 0 2px 12px rgba(0,0,0,0.1);">`;
            html += `<div style="padding: 8px 10px; background: linear-gradient(135deg, #ff9800, #f57c00); color: white; font-size: 11px; font-weight: 600; display: flex; align-items: center; gap: 6px;"><span>⭐</span>Recensioner från Google</div>`;
            
            details.reviews.slice(0, 2).forEach((review, index) => {
                const authorName = review.author_name || 'Anonym';
                const reviewText = review.text ? (review.text.length > 80 ? review.text.substring(0, 80) + '...' : review.text) : '';
                const timeAgo = review.relative_time_description || '';
                
                html += `
                    <div style="padding: 8px 10px; ${index < 1 ? 'border-bottom: 1px solid #f5f5f5;' : ''}">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                            <div>
                                <span style="font-weight: 600; font-size: 11px; color: #333;">${authorName}</span>
                                ${timeAgo ? `<span style="font-size: 9px; color: #999; margin-left: 6px;">• ${timeAgo}</span>` : ''}
                            </div>
                            <span style="color: #ff9800; font-size: 11px;" title="${review.rating}/5 stjärnor">${"⭐".repeat(Math.max(1, review.rating))}</span>
                        </div>
                        ${reviewText ? `<div style="font-size: 11px; color: #666; line-height: 1.3; font-style: italic; background: #f9f9f9; padding: 4px 6px; border-radius: 4px; border-left: 3px solid #ff9800;">"${reviewText}"</div>` : ''}
                    </div>
                `;
            });
            
            if (details.reviews.length > 2) {
                html += `<div style="padding: 6px 10px; font-size: 10px; color: #888; text-align: center; background: #f8f9fa; border-top: 1px solid #f0f0f0;">+ ${details.reviews.length - 2} fler recensioner</div>`;
            }
            
            html += "</div>";
        }
    
    // Contact information section (will be moved above address in popup)
    let contactInfoHtml = "";
    const hasContact = details.formatted_phone_number || details.website || details.opening_hours;
    if (hasContact) {
        contactInfoHtml += `
            <div class="google-contact-info" style="margin-bottom: 12px; padding: 8px; background: #f0f8ff; border-radius: 6px; border-left: 4px solid #1976d2;">
                <h4 style="margin: 0 0 6px 0; font-size: 13px; color: #1976d2;">📞 Ytterligare kontaktuppgifter</h4>
        `;
        
        if (details.formatted_phone_number) {
            contactInfoHtml += `<div style="margin-bottom: 4px; font-size: 12px; display: flex; align-items: center;"><span style="margin-right: 8px; font-size: 14px;">📞</span><a href="tel:${details.formatted_phone_number}" style="color: #1976d2; text-decoration: none; font-weight: 500;">${details.formatted_phone_number}</a></div>`;
        }
        
        if (details.website) {
            // Create shorter, cleaner URL display
            let displayUrl = details.website.replace(/^https?:\/\/(www\.)?/, "");
            displayUrl = displayUrl.split("/")[0];
            // Remove common subdomains for cleaner display
            displayUrl = displayUrl.replace(/^(m\.|mobile\.|www\.)/, "");
            contactInfoHtml += `<div style="margin-bottom: 4px; font-size: 12px; display: flex; align-items: center;"><span style="margin-right: 8px; font-size: 14px;">🌐</span><a href="${details.website}" target="_blank" style="color: #1976d2; text-decoration: none; font-weight: 500;">${displayUrl}</a></div>`;
        }
        
        if (details.opening_hours && details.opening_hours.weekday_text) {
            const today = details.opening_hours.weekday_text[new Date().getDay()];
            contactInfoHtml += `<div style="margin-bottom: 4px; font-size: 12px;"><span style="margin-right: 6px;">⏰</span><span style="font-weight: 500;">${today || "Öppettider ej tillgängliga"}</span></div>`;
        }
        
        contactInfoHtml += "</div>";
        
        // Store contact info globally to be accessed by popup
        window.currentGoogleContactInfo = contactInfoHtml;
    } else {
        window.currentGoogleContactInfo = "";
    }    
    // Directions button
    if (lat && lng) {
        html += `
            <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #ddd;">
                <button onclick="window.open('https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}', '_blank')" 
                        style="width: 100%; padding: 8px; background: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13px;">
                    🗺️ Öppna vägbeskrivning i Google Maps
                </button>
            </div>
        `;
    }
    
    html += '</div>';
    return html;
}

console.log("✅ Simple Google Places integration loaded");
// Toggle reviews visibility
function toggleReviews(button) {
    // Find the reviews section - try multiple approaches
    const placesContent = button.closest(".places-content");
    let reviewsSection = null;
    
    if (placesContent) {
        reviewsSection = placesContent.querySelector(".reviews-expanded");
    } else {
        // Fallback: search in parent elements
        let parent = button.parentNode;
        while (parent && !reviewsSection) {
            reviewsSection = parent.querySelector(".reviews-expanded");
            parent = parent.parentNode;
            if (parent && parent.tagName === 'BODY') break; // Don't go beyond body
        }
    }
    
    if (reviewsSection) {
        if (reviewsSection.style.display === "none" || reviewsSection.style.display === "") {
            reviewsSection.style.display = "block";
            button.innerHTML = "dölj";
            button.style.background = "rgba(255, 152, 0, 0.2)";
            button.style.borderColor = "rgba(255, 152, 0, 0.5)";
            button.style.fontWeight = "600";
        } else {
            reviewsSection.style.display = "none";
            button.innerHTML = "visa recensioner";
            button.style.background = "rgba(255, 152, 0, 0.1)";
            button.style.borderColor = "rgba(255, 152, 0, 0.3)";
            button.style.fontWeight = "500";
        }
    } else {
        console.warn('Could not find reviews section for toggle');
    }
}