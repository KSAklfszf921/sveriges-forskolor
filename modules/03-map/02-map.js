/* ============================================
   03-MAP: MAP FUNCTIONALITY
   Leaflet karta, markers, clustering
   ============================================ */

// Initialize the map
function initializeMap() {
    try {
        // Create map centered on Sweden
        map = L.map('map', {
            center: [62.0, 15.0],
            zoom: APP_CONFIG.defaultZoom,
            zoomControl: true,
            scrollWheelZoom: true,
            doubleClickZoom: true,
            dragging: true
        });

        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 18
        }).addTo(map);

        // Initialize marker cluster group
        markerClusterGroup = L.markerClusterGroup({
            maxClusterRadius: 80,
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: false,
            zoomToBoundsOnClick: true,
            animate: true,
            animateAddingMarkers: true
        });

        map.addLayer(markerClusterGroup);

        // Map event listeners
        map.on('zoomend', onMapZoomEnd);
        map.on('moveend', onMapMoveEnd);
        map.on('click', onMapClick);

        console.log('✅ Map initialized successfully');
        return true;

    } catch (error) {
        console.error('❌ Error initializing map:', error);
        throw error;
    }
}

// Create markers from school data
function createMarkers() {
    if (!allSchoolsData || allSchoolsData.length === 0) {
        console.warn('⚠️ No school data available for markers');
        return;
    }

    console.log(`🏗️ Creating markers for ${allSchoolsData.length} schools...`);
    
    allMarkers = [];
    let validMarkers = 0;
    let invalidCoordinates = 0;

    allSchoolsData.forEach((school, index) => {
        try {
            const lat = parseFloat(school.Latitud);
            const lng = parseFloat(school.Longitud);

            // Validate coordinates
            if (isNaN(lat) || isNaN(lng) || lat < 55 || lat > 70 || lng < 10 || lng > 25) {
                invalidCoordinates++;
                return;
            }

            // Create marker
            const marker = createSchoolMarker(school, lat, lng);
            if (marker) {
                allMarkers.push(marker);
                validMarkers++;
            }

        } catch (error) {
            console.warn(`⚠️ Error creating marker for school ${index}:`, error);
        }
    });

    console.log(`✅ Created ${validMarkers} valid markers`);
    if (invalidCoordinates > 0) {
        console.log(`⚠️ Skipped ${invalidCoordinates} schools with invalid coordinates`);
    }

    // Set initial filtered markers
    filteredMarkers = [...allMarkers];
    
    // Display markers
    displayMarkers();
}

// Create individual school marker
function createSchoolMarker(school, lat, lng) {
    try {
        // Determine marker color based on ownership
        const isKommunal = school.Huvudman === 'Kommunal';
        const markerColor = isKommunal ? APP_CONFIG.colors.kommunal : APP_CONFIG.colors.enskild;
        const ownershipText = isKommunal ? 'Kommunal' : 'Enskild';

        // Create custom icon
        const customIcon = L.divIcon({
            className: `custom-marker ${isKommunal ? 'kommunal' : 'enskild'}`,
            html: `<div style="background: ${markerColor}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8]
        });

        // Create marker
        const marker = L.marker([lat, lng], { icon: customIcon });

        // Create popup content
        const popupContent = createMarkerPopup(school);
        marker.bindPopup(popupContent, {
            maxWidth: 300,
            className: 'custom-popup'
        });

        // Store school data in marker
        marker.schoolData = school;

        // Add click event
        marker.on('click', () => {
            onMarkerClick(marker);
        });

        return marker;

    } catch (error) {
        console.warn('Error creating marker:', error);
        return null;
    }
}

// Create popup content for marker
function createMarkerPopup(school) {
    const childrenPerGroup = school['Antal barn per grupp, snitt'] || 0;
    const teacherQualification = school['Andel med förskollärarlegitimation'] || 0;
    const totalChildren = school['Antal barn'] || 0;
    const totalGroups = school['Antal barngrupper'] || 0;

    // Quality indicators
    const childrenQuality = getChildrenPerGroupQuality(childrenPerGroup);
    const teacherQuality = getTeacherQualificationQuality(teacherQualification);
    const childrenColor = getQualityColor(childrenQuality);
    const teacherColor = getQualityColor(teacherQuality);

    return `
        <div class="marker-popup">
            <h3 class="popup-title">${school.Namn}</h3>
            <div class="popup-location">${school.Adress}, ${school.Kommun}</div>
            
            <div class="popup-ownership">
                <span class="ownership-badge ${school.Huvudman === 'Kommunal' ? 'kommunal' : 'enskild'}">
                    ${school.Huvudman}
                </span>
            </div>
            
            <div class="popup-metrics">
                <div class="popup-metric" style="background: ${childrenColor.backgroundColor}; color: ${childrenColor.textColor};">
                    <span class="metric-value">${childrenPerGroup > 0 ? childrenPerGroup : '-'}</span>
                    <span class="metric-label">Barn/grupp</span>
                </div>
                
                <div class="popup-metric" style="background: ${teacherColor.backgroundColor}; color: ${teacherColor.textColor};">
                    <span class="metric-value">${teacherQualification > 0 ? teacherQualification + '%' : '-'}</span>
                    <span class="metric-label">Leg. förskollärare</span>
                </div>
                
                <div class="popup-metric">
                    <span class="metric-value">${totalChildren}</span>
                    <span class="metric-label">Totalt barn</span>
                </div>
                
                <div class="popup-metric">
                    <span class="metric-value">${totalGroups}</span>
                    <span class="metric-label">Barngrupper</span>
                </div>
            </div>
            
            <div class="popup-actions">
                <button onclick="addToComparison('${school.id || school.skolverkets_id}')" class="popup-btn primary">
                    Lägg till i jämförelse
                </button>
                <button onclick="focusOnSchool('${school.Namn}')" class="popup-btn secondary">
                    Visa i lista
                </button>
            </div>
        </div>
    `;
}

// Display markers on map
function displayMarkers() {
    if (!markerClusterGroup) {
        console.warn('⚠️ Marker cluster group not initialized');
        return;
    }

    // Clear existing markers
    markerClusterGroup.clearLayers();

    // Add filtered markers
    if (filteredMarkers.length > 0) {
        markerClusterGroup.addLayers(filteredMarkers);
        console.log(`📍 Displaying ${filteredMarkers.length} markers on map`);
    } else {
        console.log('📍 No markers to display');
    }

    // Update sidebar
    if (typeof updateSidebar === 'function') {
        updateSidebar();
    }

    // Update statistics
    updateVisibleStats();
}

// Map event handlers
function onMapZoomEnd() {
    const zoom = map.getZoom();
    console.log(`🔍 Map zoom changed to: ${zoom}`);
    
    // Update marker visibility based on zoom level
    updateMarkerVisibility();
}

function onMapMoveEnd() {
    const center = map.getCenter();
    const zoom = map.getZoom();
    console.log(`🗺️ Map moved to: ${center.lat.toFixed(3)}, ${center.lng.toFixed(3)} (zoom: ${zoom})`);
}

function onMapClick(e) {
    console.log(`🖱️ Map clicked at: ${e.latlng.lat.toFixed(3)}, ${e.latlng.lng.toFixed(3)}`);
    
    // Close any open popups
    map.closePopup();
}

function onMarkerClick(marker) {
    const school = marker.schoolData;
    console.log(`🏫 Marker clicked: ${school.Namn}`);
    
    // Optional: Highlight in sidebar
    if (typeof highlightSchoolInSidebar === 'function') {
        highlightSchoolInSidebar(school.id || school.skolverkets_id);
    }
}

// Update marker visibility based on zoom level
function updateMarkerVisibility() {
    const zoom = map.getZoom();
    
    // Hide individual markers at low zoom levels for performance
    if (zoom < 8 && filteredMarkers.length > 1000) {
        // Could implement level-of-detail here
        console.log('🎯 High marker count at low zoom - consider LOD');
    }
}

// Focus on specific school
function focusOnSchool(schoolName) {
    const marker = allMarkers.find(m => 
        m.schoolData.Namn.toLowerCase() === schoolName.toLowerCase()
    );
    
    if (marker) {
        const latLng = marker.getLatLng();
        map.setView(latLng, APP_CONFIG.detailZoom, { 
            animate: true, 
            duration: APP_CONFIG.animationDuration / 1000 
        });
        
        // Open popup after animation
        setTimeout(() => {
            marker.openPopup();
        }, APP_CONFIG.animationDuration);
        
        console.log(`🎯 Focused on school: ${schoolName}`);
    } else {
        console.warn(`⚠️ Could not find marker for school: ${schoolName}`);
    }
}

// Update visible statistics
function updateVisibleStats() {
    const bounds = map.getBounds();
    let visibleCount = 0;
    let kommunalCount = 0;
    let enskildCount = 0;

    filteredMarkers.forEach(marker => {
        const latLng = marker.getLatLng();
        if (bounds.contains(latLng)) {
            visibleCount++;
            if (marker.schoolData.Huvudman === 'Kommunal') {
                kommunalCount++;
            } else {
                enskildCount++;
            }
        }
    });

    // Update sidebar statistics
    const visibleElement = document.getElementById('sidebarVisibleCount');
    const kommunalElement = document.getElementById('sidebarKommunalCount');
    const enskildElement = document.getElementById('sidebarEnskildCount');

    if (visibleElement) visibleElement.textContent = visibleCount;
    if (kommunalElement) kommunalElement.textContent = kommunalCount;
    if (enskildElement) enskildElement.textContent = enskildCount;
}