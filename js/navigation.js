/**
 * Campus Navigation & Wayfinding Module
 * Handles user geolocation, Haversine distance, walking time calculation, and route polyline rendering.
 */

class CampusNavigation {
  constructor(mapManager) {
    this.mapManager = mapManager;
    this.userLocation = null; // [lat, lng]
    this.userMarker = null;
    this.userAccuracyCircle = null;
    this.activeRoutePolyline = null;
    this.activeDestination = null;
    this.isTracking = false;

    // DOM Elements
    this.locateMeBtn = document.getElementById('locateMeBtn');
    this.routeHud = document.getElementById('routeHud');
    this.routeTargetName = document.getElementById('routeTargetName');
    this.routeDistance = document.getElementById('routeDistance');
    this.routeDuration = document.getElementById('routeDuration');
    this.routeOriginLabel = document.getElementById('routeOriginLabel');
    this.routeCloseBtn = document.getElementById('routeCloseBtn');
  }

  /**
   * Initializes navigation controls
   */
  init() {
    this.attachEventListeners();
    return this;
  }

  /**
   * Attaches click handlers for geolocation and route dismissal
   */
  attachEventListeners() {
    if (this.locateMeBtn) {
      this.locateMeBtn.addEventListener('click', () => {
        this.requestUserLocation(true);
      });
    }

    if (this.routeCloseBtn) {
      this.routeCloseBtn.addEventListener('click', () => {
        this.clearRoute();
      });
    }
  }

  /**
   * Requests device geolocation, with graceful fallback to campus default
   */
  requestUserLocation(shouldFlyTo = false) {
    if (window.campusApp) {
      window.campusApp.showToast('Locating your position...');
    }

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const accuracy = position.coords.accuracy;

          // Check if coordinates are reasonably near campus (within 20km)
          const distToCampus = this.calculateDistance([lat, lng], CAMPUS_CONFIG.center);
          
          if (distToCampus < 20000) {
            this.setUserLocation([lat, lng], accuracy, shouldFlyTo, 'GPS Location');
          } else {
            // If user is far from campus, spawn at Campus Quad for demonstration
            this.setUserLocation(CAMPUS_CONFIG.defaultUserLocation, 15, shouldFlyTo, 'Demo: Campus Quad');
            if (window.campusApp) {
              window.campusApp.showToast('Placed at Campus Quad for simulation');
            }
          }
        },
        (error) => {
          console.warn('Geolocation denied or unavailable, using campus default:', error.message);
          this.setUserLocation(CAMPUS_CONFIG.defaultUserLocation, 20, shouldFlyTo, 'Demo: Campus Quad');
          if (window.campusApp) {
            window.campusApp.showToast('Using Campus Quad location');
          }
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
      );
    } else {
      this.setUserLocation(CAMPUS_CONFIG.defaultUserLocation, 20, shouldFlyTo, 'Demo: Campus Quad');
    }
  }

  /**
   * Sets and renders user location marker and accuracy ring on the map
   */
  setUserLocation(coords, accuracy = 20, shouldFlyTo = false, label = 'Your Location') {
    this.userLocation = coords;

    // 1. Remove previous marker if any
    if (this.userMarker) {
      this.mapManager.map.removeLayer(this.userMarker);
    }
    if (this.userAccuracyCircle) {
      this.mapManager.map.removeLayer(this.userAccuracyCircle);
    }

    // 2. Render user accuracy circle
    this.userAccuracyCircle = L.circle(coords, {
      radius: Math.min(accuracy, 60),
      color: '#2563eb',
      weight: 1,
      fillColor: '#3b82f6',
      fillOpacity: 0.12
    }).addTo(this.mapManager.map);

    // 3. Render pulsing blue dot
    const userDivIcon = L.divIcon({
      className: 'user-location-wrapper',
      html: `
        <div class="user-location-marker" title="${label}">
          <div class="user-pulse"></div>
          <div class="user-dot"></div>
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    this.userMarker = L.marker(coords, { icon: userDivIcon, zIndexOffset: 1000 }).addTo(this.mapManager.map);
    this.userMarker.bindTooltip(`<strong>${label}</strong>`, { direction: 'top', offset: [0, -10] });

    // 4. Update locate button state
    if (this.locateMeBtn) {
      this.locateMeBtn.classList.add('active');
    }

    // 5. Update POI distance indicators in the directory sidebar
    if (window.campusSearch) {
      window.campusSearch.renderLandmarkCards();
    }

    // 6. Pan map if requested
    if (shouldFlyTo) {
      this.mapManager.flyToLocation(coords, 17);
    }

    // 7. If route was active, recalculate route path
    if (this.activeDestination) {
      this.drawRouteTo(this.activeDestination);
    }
  }

  /**
   * Calculates Haversine distance between two coordinates in meters
   * @param {[number, number]} coord1 - [lat1, lng1]
   * @param {[number, number]} coord2 - [lat2, lng2]
   * @returns {number} Distance in meters
   */
  calculateDistance(coord1, coord2) {
    const R = 6371e3; // Earth radius in meters
    const lat1Rad = (coord1[0] * Math.PI) / 180;
    const lat2Rad = (coord2[0] * Math.PI) / 180;
    const deltaLat = ((coord2[0] - coord1[0]) * Math.PI) / 180;
    const deltaLng = ((coord2[1] - coord1[1]) * Math.PI) / 180;

    const a =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1Rad) * Math.cos(lat2Rad) *
      Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Calculates estimated walking time based on average campus walking speed (~80 m/min or 4.8 km/h)
   * @param {number} distanceMeters 
   * @returns {number} Estimated minutes
   */
  calculateWalkingMinutes(distanceMeters) {
    const WALKING_METERS_PER_MIN = 80;
    return Math.max(1, Math.round(distanceMeters / WALKING_METERS_PER_MIN));
  }

  /**
   * Draws animated walking route connecting user location to target landmark
   * @param {Object} landmark - POI object
   */
  drawRouteTo(landmark) {
    // If no user location is set, initialize with default
    if (!this.userLocation) {
      this.setUserLocation(CAMPUS_CONFIG.defaultUserLocation, 20, false, 'Campus Quad (Default)');
    }

    this.activeDestination = landmark;

    // Clear existing polyline
    if (this.activeRoutePolyline) {
      this.mapManager.map.removeLayer(this.activeRoutePolyline);
    }

    const startCoords = this.userLocation;
    const endCoords = landmark.coords;

    // Create a smooth waypoint or straight path
    // Intermediate waypoint for organic campus pathway feeling
    const midLat = (startCoords[0] + endCoords[0]) / 2 + (startCoords[1] - endCoords[1]) * 0.08;
    const midLng = (startCoords[1] + endCoords[1]) / 2 - (startCoords[0] - endCoords[0]) * 0.08;

    const pathPoints = [startCoords, [midLat, midLng], endCoords];

    // Render polyline
    this.activeRoutePolyline = L.polyline(pathPoints, {
      color: '#2563eb',
      weight: 5,
      opacity: 0.9,
      dashArray: '8, 10',
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(this.mapManager.map);

    // Calculate metrics
    const dist1 = this.calculateDistance(startCoords, [midLat, midLng]);
    const dist2 = this.calculateDistance([midLat, midLng], endCoords);
    const totalDistance = dist1 + dist2;
    const walkingMins = this.calculateWalkingMinutes(totalDistance);

    // Update Route HUD
    this.updateRouteHud(landmark, totalDistance, walkingMins);

    // Fit map bounds to encompass the route
    const bounds = L.latLngBounds([startCoords, endCoords, [midLat, midLng]]);
    this.mapManager.map.fitBounds(bounds, {
      padding: [80, 80],
      maxZoom: 18
    });

    if (window.campusApp) {
      window.campusApp.showToast(`Route to ${landmark.name} mapped`);
    }
  }

  /**
   * Updates HUD statistics display
   */
  updateRouteHud(landmark, distanceMeters, durationMinutes) {
    if (!this.routeHud) return;

    this.routeTargetName.textContent = landmark.name;
    
    const distFormatted = distanceMeters >= 1000 
      ? `${(distanceMeters / 1000).toFixed(2)} km` 
      : `${Math.round(distanceMeters)} m`;
    
    this.routeDistance.textContent = distFormatted;
    this.routeDuration.textContent = `~${durationMinutes} min walk`;

    this.routeHud.style.display = 'flex';
  }

  /**
   * Clears active walking route and hides HUD
   */
  clearRoute() {
    if (this.activeRoutePolyline) {
      this.mapManager.map.removeLayer(this.activeRoutePolyline);
      this.activeRoutePolyline = null;
    }
    this.activeDestination = null;

    if (this.routeHud) {
      this.routeHud.style.display = 'none';
    }

    if (window.campusApp) {
      window.campusApp.showToast('Walking route cleared');
    }
  }
}

