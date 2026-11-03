/**
 * Campus Map Manager (Leaflet Integration)
 * Handles canvas initialization, tile layers, boundary polygon, custom markers, and popups.
 */

class CampusMap {
  constructor() {
    this.map = null;
    this.currentTileLayer = null;
    this.perimeterLayer = null;
    this.markers = new Map(); // id -> L.marker
    this.markerLayerGroup = null;
    this.selectedMarkerId = null;

    // Tile Layer Definitions
    this.tileLayers = {
      street: {
        name: 'Street View',
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      },
      satellite: {
        name: 'Satellite',
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
      },
      dark: {
        name: 'Dark Mode',
        url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      }
    };
  }

  /**
   * Initializes the Leaflet map instance and default layers
   */
  init() {
    // 1. Create Leaflet map instance
    this.map = L.map('map', {
      center: CAMPUS_CONFIG.center,
      zoom: CAMPUS_CONFIG.defaultZoom,
      minZoom: CAMPUS_CONFIG.minZoom,
      maxZoom: CAMPUS_CONFIG.maxZoom,
      maxBounds: CAMPUS_CONFIG.maxBounds,
      maxBoundsViscosity: 0.8,
      zoomControl: true
    });

    // 2. Set default base tile layer (Street)
    this.setTileLayer('street');

    // 3. Initialize marker layer group
    this.markerLayerGroup = L.layerGroup().addTo(this.map);

    // 4. Render campus boundary perimeter polygon
    this.renderCampusPerimeter();

    // 5. Populate landmarks with custom category-colored divIcons
    this.renderLandmarkMarkers(CAMPUS_LANDMARKS);

    // 6. Reposition zoom control for better UI spacing
    this.map.zoomControl.setPosition('bottomright');

    return this;
  }

  /**
   * Switches base tile layer
   * @param {string} layerKey - 'street' | 'satellite' | 'dark'
   */
  setTileLayer(layerKey) {
    const config = this.tileLayers[layerKey];
    if (!config) return;

    if (this.currentTileLayer) {
      this.map.removeLayer(this.currentTileLayer);
    }

    this.currentTileLayer = L.tileLayer(config.url, {
      maxZoom: CAMPUS_CONFIG.maxZoom,
      minZoom: CAMPUS_CONFIG.minZoom,
      attribution: config.attribution
    }).addTo(this.map);
  }

  /**
   * Draws the subtle campus boundary polygon
   */
  renderCampusPerimeter() {
    if (!CAMPUS_CONFIG.perimeter || CAMPUS_CONFIG.perimeter.length === 0) return;

    this.perimeterLayer = L.polygon(CAMPUS_CONFIG.perimeter, {
      color: '#2563eb',
      weight: 2.5,
      dashArray: '6, 6',
      fillColor: '#3b82f6',
      fillOpacity: 0.06,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(this.map);

    this.perimeterLayer.bindTooltip(
      `<strong>${CAMPUS_CONFIG.name}</strong><br><span style="font-size:11px;color:#64748b;">Official Campus Boundary</span>`,
      { sticky: true, className: 'perimeter-tooltip' }
    );
  }

  /**
   * Toggles perimeter visibility
   */
  togglePerimeter() {
    if (!this.perimeterLayer) return false;
    if (this.map.hasLayer(this.perimeterLayer)) {
      this.map.removeLayer(this.perimeterLayer);
      return false;
    } else {
      this.perimeterLayer.addTo(this.map);
      return true;
    }
  }

  /**
   * Creates SVG icon string based on category icon identifier
   */
  getCategoryIconSvg(iconName) {
    const svgMap = {
      'graduation-cap': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/></svg>`,
      'book-open': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`,
      'building-2': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>`,
      'utensils': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V2"/><path d="M18 2v20"/><path d="M6 2v20"/><path d="M6 6h6"/></svg>`,
      'bed': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/></svg>`,
      'trophy': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>`
    };

    return svgMap[iconName] || svgMap['building-2'];
  }

  /**
   * Creates a Leaflet divIcon with category-themed badge pin
   */
  createMarkerIcon(landmark, isSelected = false) {
    const categoryInfo = CATEGORIES[landmark.category] || CATEGORIES.administrative;
    const iconSvg = this.getCategoryIconSvg(categoryInfo.icon);

    return L.divIcon({
      className: 'custom-pin-container',
      html: `
        <div class="custom-pin-marker ${isSelected ? 'selected' : ''}" style="--marker-color: ${categoryInfo.color};" data-landmark-id="${landmark.id}" title="${landmark.name}">
          <div class="pin-bubble">
            <div class="pin-icon-inner">
              ${iconSvg}
            </div>
          </div>
        </div>
      `,
      iconSize: [38, 38],
      iconAnchor: [19, 38],
      popupAnchor: [0, -36]
    });
  }

  /**
   * Renders all landmarks onto the map
   */
  renderLandmarkMarkers(landmarks) {
    this.markerLayerGroup.clearLayers();
    this.markers.clear();

    landmarks.forEach(landmark => {
      const icon = this.createMarkerIcon(landmark, landmark.id === this.selectedMarkerId);
      const marker = L.marker(landmark.coords, { 
        icon: icon, 
        title: `${landmark.name} (Drag to move or tap to edit)`,
        draggable: true
      });

      // Drag event to update coordinates in builder mode
      marker.on('dragend', (e) => {
        const newLatLng = e.target.getLatLng();
        if (window.campusBuilder) {
          window.campusBuilder.updateLandmarkCoords(landmark.id, [newLatLng.lat, newLatLng.lng]);
        }
      });

      // Build popup content with builder edit actions
      const categoryInfo = CATEGORIES[landmark.category] || CATEGORIES.administrative;
      const popupContent = `
        <div class="popup-mini-card">
          <img src="${landmark.image}" alt="${landmark.name}" class="popup-mini-img" loading="lazy" />
          <div class="popup-mini-body">
            <span class="poi-category-badge" style="background:${categoryInfo.bgLight};color:${categoryInfo.color};align-self:flex-start;">
              ${categoryInfo.label} &bull; ${landmark.code}
            </span>
            <h4 class="popup-mini-title">${landmark.name}</h4>
            <div class="popup-builder-actions">
              <button class="popup-mini-btn btn-edit-poi" onclick="window.campusBuilder ? window.campusBuilder.openLandmarkEditor(CAMPUS_LANDMARKS.find(l => l.id === '${landmark.id}')) : window.campusApp.openBuildingDetail('${landmark.id}')">
                ✏️ Edit Building & Photo
              </button>
              <button class="popup-mini-btn btn-snap-poi" onclick="window.campusBuilder && window.campusBuilder.snapLandmarkToGps('${landmark.id}')">
                📍 Snap to My GPS
              </button>
            </div>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, { maxWidth: 280, minWidth: 230 });

      // Click event
      marker.on('click', () => {
        this.selectMarker(landmark.id);
        if (window.campusApp) {
          window.campusApp.onLandmarkSelected(landmark.id);
        }
      });

      // Double-click to open editor directly
      marker.on('dblclick', (e) => {
        L.DomEvent.stopPropagation(e);
        if (window.campusBuilder) {
          window.campusBuilder.openLandmarkEditor(landmark);
        }
      });

      this.markers.set(landmark.id, marker);
      this.markerLayerGroup.addLayer(marker);
    });
  }

  /**
   * Highlights and selects a marker
   */
  selectMarker(landmarkId) {
    this.selectedMarkerId = landmarkId;

    this.markers.forEach((marker, id) => {
      const landmark = CAMPUS_LANDMARKS.find(l => l.id === id);
      if (landmark) {
        marker.setIcon(this.createMarkerIcon(landmark, id === landmarkId));
      }
    });
  }

  /**
   * Filters marker visibility based on active matching IDs
   */
  filterMarkers(visibleIds) {
    const visibleSet = new Set(visibleIds);
    this.markers.forEach((marker, id) => {
      if (visibleSet.has(id)) {
        if (!this.markerLayerGroup.hasLayer(marker)) {
          this.markerLayerGroup.addLayer(marker);
        }
      } else {
        if (this.markerLayerGroup.hasLayer(marker)) {
          this.markerLayerGroup.removeLayer(marker);
        }
      }
    });
  }

  /**
   * Smoothly pans and zooms to a given coordinate
   */
  flyToLocation(coords, zoom = 17) {
    this.map.flyTo(coords, zoom, {
      duration: 1.2,
      easeLinearity: 0.25
    });
  }

  /**
   * Fits map to encompass the campus boundary
   */
  fitCampusPerimeter() {
    if (this.perimeterLayer) {
      this.map.fitBounds(this.perimeterLayer.getBounds(), {
        padding: [40, 40],
        maxZoom: 17
      });
    } else {
      this.map.setView(CAMPUS_CONFIG.center, CAMPUS_CONFIG.defaultZoom);
    }
  }

  /**
   * Toggles developer coordinate inspector mode
   */
  toggleDevMode(callback) {
    this.isDevMode = !this.isDevMode;
    const mapEl = document.getElementById('map');

    if (this.isDevMode) {
      if (mapEl) mapEl.classList.add('dev-mode-active');
      this.devCoordCallback = callback;

      // Attach map click handler for coordinate picking
      this.devClickHandler = (e) => {
        const { lat, lng } = e.latlng;
        this.placeDevMarker([lat, lng]);
        if (this.devCoordCallback) {
          this.devCoordCallback(lat, lng);
        }
      };

      this.map.on('click', this.devClickHandler);
    } else {
      if (mapEl) mapEl.classList.remove('dev-mode-active');
      if (this.devClickHandler) {
        this.map.off('click', this.devClickHandler);
        this.devClickHandler = null;
      }
      this.removeDevMarker();
    }

    return this.isDevMode;
  }

  /**
   * Places a draggable temporary marker for coordinate picking
   */
  placeDevMarker(coords) {
    if (this.devMarker) {
      this.devMarker.setLatLng(coords);
    } else {
      const devIcon = L.divIcon({
        className: 'dev-pin-container',
        html: `
          <div class="dev-pin-marker" title="Drag me to pinpoint exact building coordinates">
            <div class="dev-pin-circle">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="22" x2="18" y1="12" y2="12"/><line x1="6" x2="2" y1="12" y2="12"/><line x1="12" x2="12" y1="6" y2="2"/><line x1="12" x2="12" y1="22" y2="18"/></svg>
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      this.devMarker = L.marker(coords, {
        icon: devIcon,
        draggable: true,
        zIndexOffset: 2000
      }).addTo(this.map);

      this.devMarker.on('drag', (e) => {
        const { lat, lng } = e.target.getLatLng();
        if (this.devCoordCallback) {
          this.devCoordCallback(lat, lng);
        }
      });
    }

    this.devMarker.bindTooltip(
      `<strong>[${coords[0].toFixed(6)}, ${coords[1].toFixed(6)}]</strong><br><span style="font-size:10px;color:#cbd5e1;">(Drag to fine-tune)</span>`,
      { permanent: true, direction: 'top', offset: [0, -12], className: 'dev-tooltip' }
    ).openTooltip();
  }

  /**
   * Removes temporary dev coordinate marker
   */
  removeDevMarker() {
    if (this.devMarker) {
      this.map.removeLayer(this.devMarker);
      this.devMarker = null;
    }
  }
}


