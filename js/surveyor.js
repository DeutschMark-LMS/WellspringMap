/**
 * Campus Field Surveyor & Admin Mapping Module
 * Enables on-the-ground GPS landmark capture, perimeter tracing, localStorage persistence,
 * and one-click data.js export.
 */

class CampusSurveyor {
  constructor(mapManager, app) {
    this.mapManager = mapManager;
    this.app = app;
    this.isActive = false;
    this.currentGps = null;
    this.gpsAccuracy = null;
    this.watchId = null;

    // Surveyed Dataset (initialized from localStorage or CAMPUS_LANDMARKS)
    this.surveyLandmarks = this.loadStoredLandmarks();
    this.surveyPerimeter = this.loadStoredPerimeter();
    this.perimeterPolyline = null;
    this.cornerMarkers = [];

    // DOM Elements
    this.surveyFab = null;
    this.surveyModal = null;
  }

  /**
   * Initializes the Surveyor Module
   */
  init() {
    this.createSurveyUI();
    this.attachEvents();
    this.syncSurveyDataToApp();
    return this;
  }

  /**
   * Loads stored landmarks from localStorage or falls back to data.js
   */
  loadStoredLandmarks() {
    try {
      const stored = localStorage.getItem('wellspring_survey_landmarks');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Could not read stored landmarks:', e);
    }
    return [...CAMPUS_LANDMARKS];
  }

  /**
   * Loads stored perimeter from localStorage or falls back to data.js
   */
  loadStoredPerimeter() {
    try {
      const stored = localStorage.getItem('wellspring_survey_perimeter');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Could not read stored perimeter:', e);
    }
    return [...CAMPUS_CONFIG.perimeter];
  }

  /**
   * Saves current survey state to localStorage
   */
  persistData() {
    try {
      localStorage.setItem('wellspring_survey_landmarks', JSON.stringify(this.surveyLandmarks));
      localStorage.setItem('wellspring_survey_perimeter', JSON.stringify(this.surveyPerimeter));
    } catch (e) {
      console.error('Failed to save survey data:', e);
    }
  }

  /**
   * Dynamically constructs the Mobile Field Surveyor Panel and Capture Modal
   */
  createSurveyUI() {
    // 1. Floating Surveyor Banner & Action Button
    const surveyToolbarHtml = `
      <aside class="surveyor-toolbar" id="surveyorToolbar" style="display: none;" aria-label="Field Survey Toolbar">
        <div class="surveyor-status-bar">
          <div class="surveyor-live-badge">
            <span class="pulse-dot"></span>
            <strong>FIELD SURVEYOR</strong>
          </div>
          <div class="surveyor-gps-readout" id="surveyGpsReadout">
            <i data-lucide="satellite"></i>
            <span id="surveyGpsStatus">Acquiring GPS...</span>
          </div>
          <button class="surveyor-close-btn" id="surveyorCloseBtn" title="Close Surveyor" aria-label="Close surveyor toolbar">
            <i data-lucide="x"></i>
          </button>
        </div>

        <div class="surveyor-actions-grid">
          <button class="btn btn-survey-primary" id="surveyCaptureBuildingBtn">
            <i data-lucide="map-pin-plus"></i>
            <span>Capture Building Here</span>
          </button>
          <button class="btn btn-survey-secondary" id="surveyAddCornerBtn">
            <i data-lucide="shield-check"></i>
            <span>Log Boundary Corner (<span id="cornerCount">0</span>)</span>
          </button>
          <button class="btn btn-survey-outline" id="surveyExportBtn">
            <i data-lucide="download"></i>
            <span>Export data.js</span>
          </button>
        </div>
      </aside>

      <!-- Building Capture Dialog Modal -->
      <div class="survey-modal-backdrop" id="surveyModalBackdrop" style="display: none;">
        <div class="survey-modal-card" role="dialog" aria-labelledby="surveyModalTitle">
          <div class="survey-modal-header">
            <div class="survey-modal-title-group">
              <i data-lucide="building"></i>
              <h3 id="surveyModalTitle">Record Building Entrance</h3>
            </div>
            <button class="survey-modal-close" id="surveyModalCancelBtn">&times;</button>
          </div>

          <form id="surveyBuildingForm" class="survey-form">
            <div class="survey-form-gps-tag">
              <i data-lucide="crosshair"></i>
              <span>Coordinates: <strong id="surveyFormCoordsText">6.280986, 5.585459</strong></span>
            </div>

            <div class="form-group">
              <label for="surveyName">Building / Facility Name *</label>
              <input type="text" id="surveyName" required placeholder="e.g. Faculty of Engineering Complex" />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="surveyCode">Building Code *</label>
                <input type="text" id="surveyCode" required placeholder="e.g. ENG-01" />
              </div>
              <div class="form-group">
                <label for="surveyCategory">Category *</label>
                <select id="surveyCategory" required>
                  <option value="academic">Academics</option>
                  <option value="library">Library</option>
                  <option value="administrative">Administrative</option>
                  <option value="cafeteria">Food & Dining</option>
                  <option value="hostel">Hostels & Housing</option>
                  <option value="sports">Sports & Rec</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="surveyFloors">Floors</label>
                <input type="number" id="surveyFloors" min="1" max="20" value="1" />
              </div>
              <div class="form-group">
                <label for="surveyHours">Operating Hours</label>
                <input type="text" id="surveyHours" value="8:00 AM – 6:00 PM" placeholder="e.g. 24/7 or 8:00 AM – 6:00 PM" />
              </div>
            </div>

            <div class="form-group">
              <label for="surveyDesc">Short Description</label>
              <textarea id="surveyDesc" rows="2" placeholder="Brief overview of departments or facilities inside..."></textarea>
            </div>

            <div class="form-group">
              <label for="surveyFacilities">Amenities & Tags (comma separated)</label>
              <input type="text" id="surveyFacilities" value="Wi-Fi, Restrooms, Wheelchair Accessible" />
            </div>

            <div class="form-actions">
              <button type="button" class="btn btn-secondary" id="surveyFormCancelBtn">Cancel</button>
              <button type="submit" class="btn btn-primary">
                <i data-lucide="check"></i>
                <span>Save Landmark</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', surveyToolbarHtml);
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  /**
   * Attaches event listeners
   */
  attachEvents() {
    // Toolbar toggle from dev menu or URL
    const devBtn = document.getElementById('devModeBtn');
    if (devBtn) {
      devBtn.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this.toggleSurveyMode();
      });
    }

    // Surveyor Close button
    const closeBtn = document.getElementById('surveyorCloseBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.toggleSurveyMode(false));
    }

    // Capture building button
    const captureBtn = document.getElementById('surveyCaptureBuildingBtn');
    if (captureBtn) {
      captureBtn.addEventListener('click', () => this.openCaptureModal());
    }

    // Add perimeter corner button
    const addCornerBtn = document.getElementById('surveyAddCornerBtn');
    if (addCornerBtn) {
      addCornerBtn.addEventListener('click', () => this.recordPerimeterCorner());
    }

    // Export button
    const exportBtn = document.getElementById('surveyExportBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportDataset());
    }

    // Modal close & form submit
    const modalBackdrop = document.getElementById('surveyModalBackdrop');
    const modalCancel1 = document.getElementById('surveyModalCancelBtn');
    const modalCancel2 = document.getElementById('surveyFormCancelBtn');
    const form = document.getElementById('surveyBuildingForm');

    [modalCancel1, modalCancel2].forEach(btn => {
      if (btn) btn.addEventListener('click', () => this.closeCaptureModal());
    });

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveLandmarkFromForm();
      });
    }

    // Check URL parameters for ?survey=1 or #survey
    if (window.location.search.includes('survey=1') || window.location.hash === '#survey') {
      setTimeout(() => this.toggleSurveyMode(true), 600);
    }
  }

  /**
   * Starts high-accuracy GPS watch
   */
  startGpsTracking() {
    if (!('geolocation' in navigator)) {
      this.updateGpsStatus('GPS Unavailable on this device', false);
      return;
    }

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const acc = pos.coords.accuracy;

        this.currentGps = [lat, lng];
        this.gpsAccuracy = acc;

        this.updateGpsStatus(`GPS: ±${Math.round(acc)}m accuracy`, true);

        // Update map live position
        if (this.app?.navManager) {
          this.app.navManager.setUserLocation([lat, lng], acc, false, 'Surveyor Position');
        }
      },
      (err) => {
        console.warn('GPS watch error:', err.message);
        // Fallback for simulation
        this.currentGps = CAMPUS_CONFIG.center;
        this.updateGpsStatus('Using Simulation Coordinates', false);
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    );
  }

  /**
   * Stops GPS watch
   */
  stopGpsTracking() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  /**
   * Updates GPS status text
   */
  updateGpsStatus(text, isGood = true) {
    const el = document.getElementById('surveyGpsStatus');
    if (el) {
      el.textContent = text;
      el.style.color = isGood ? '#10b981' : '#f59e0b';
    }
  }

  /**
   * Toggles Survey Mode On/Off
   */
  toggleSurveyMode(forceState = null) {
    this.isActive = forceState !== null ? forceState : !this.isActive;

    const toolbar = document.getElementById('surveyorToolbar');
    if (toolbar) {
      toolbar.style.display = this.isActive ? 'flex' : 'none';
    }

    if (this.isActive) {
      this.startGpsTracking();
      this.renderSurveyPerimeter();
      this.updateCornerCount();
      this.app.showToast('Surveyor mode active');
    } else {
      this.stopGpsTracking();
      this.clearCornerMarkers();
      this.app.showToast('Surveyor closed');
    }
  }

  /**
   * Opens Building Entrance Capture Dialog
   */
  openCaptureModal() {
    const coords = this.currentGps || this.mapManager.map.getCenter();
    const lat = coords[0] || coords.lat;
    const lng = coords[1] || coords.lng;

    const coordsText = document.getElementById('surveyFormCoordsText');
    if (coordsText) {
      coordsText.textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }

    const backdrop = document.getElementById('surveyModalBackdrop');
    if (backdrop) backdrop.style.display = 'flex';

    const nameInput = document.getElementById('surveyName');
    if (nameInput) {
      nameInput.value = '';
      nameInput.focus();
    }
  }

  /**
   * Closes Building Capture Dialog
   */
  closeCaptureModal() {
    const backdrop = document.getElementById('surveyModalBackdrop');
    if (backdrop) backdrop.style.display = 'none';
  }

  /**
   * Saves landmark from form
   */
  saveLandmarkFromForm() {
    const coords = this.currentGps || [
      this.mapManager.map.getCenter().lat,
      this.mapManager.map.getCenter().lng
    ];

    const name = document.getElementById('surveyName').value.trim();
    const code = document.getElementById('surveyCode').value.trim();
    const category = document.getElementById('surveyCategory').value;
    const floors = parseInt(document.getElementById('surveyFloors').value) || 1;
    const hours = document.getElementById('surveyHours').value.trim() || '8:00 AM – 6:00 PM';
    const desc = document.getElementById('surveyDesc').value.trim() || `${name} facility.`;
    const facilitiesRaw = document.getElementById('surveyFacilities').value;
    const facilities = facilitiesRaw.split(',').map(f => f.trim()).filter(Boolean);

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const newLandmark = {
      id: slug || `bld-${Date.now()}`,
      name: name,
      code: code,
      coords: [parseFloat(coords[0].toFixed(6)), parseFloat(coords[1].toFixed(6))],
      category: category,
      description: desc,
      floors: floors,
      hours: hours,
      facilities: facilities.length > 0 ? facilities : ['Restrooms', 'Wheelchair Accessible'],
      image: 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=800&q=80',
      contact: 'info@wellspring.edu.ng'
    };

    // Add to survey array (or update if duplicate id)
    const existingIdx = this.surveyLandmarks.findIndex(l => l.id === newLandmark.id);
    if (existingIdx >= 0) {
      this.surveyLandmarks[existingIdx] = newLandmark;
    } else {
      this.surveyLandmarks.unshift(newLandmark);
    }

    this.persistData();
    this.syncSurveyDataToApp();
    this.closeCaptureModal();

    this.app.showToast(`Saved ${newLandmark.name}`);
  }

  /**
   * Records a boundary corner at user's current GPS
   */
  recordPerimeterCorner() {
    const coords = this.currentGps || [
      this.mapManager.map.getCenter().lat,
      this.mapManager.map.getCenter().lng
    ];
    const point = [parseFloat(coords[0].toFixed(6)), parseFloat(coords[1].toFixed(6))];

    this.surveyPerimeter.push(point);
    this.persistData();
    this.renderSurveyPerimeter();
    this.updateCornerCount();

    this.app.showToast(`Corner #${this.surveyPerimeter.length} logged`);
  }

  /**
   * Renders perimeter polygon and corner pins
   */
  renderSurveyPerimeter() {
    this.clearCornerMarkers();

    if (this.surveyPerimeter.length > 1) {
      // Connect first point at end if needed
      const closedPoints = [...this.surveyPerimeter];
      if (closedPoints.length >= 3) {
        closedPoints.push(closedPoints[0]);
      }

      if (this.perimeterPolyline) {
        this.mapManager.map.removeLayer(this.perimeterPolyline);
      }

      this.perimeterPolyline = L.polyline(closedPoints, {
        color: '#8b5cf6',
        weight: 3,
        dashArray: '5, 5'
      }).addTo(this.mapManager.map);
    }

    // Drop corner pin markers
    this.surveyPerimeter.forEach((pt, index) => {
      const cornerIcon = L.divIcon({
        className: 'corner-pin',
        html: `<div class="corner-dot" title="Corner #${index + 1}">${index + 1}</div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });
      const marker = L.marker(pt, { icon: cornerIcon }).addTo(this.mapManager.map);
      this.cornerMarkers.push(marker);
    });
  }

  /**
   * Clears corner markers
   */
  clearCornerMarkers() {
    this.cornerMarkers.forEach(m => this.mapManager.map.removeLayer(m));
    this.cornerMarkers = [];
    if (this.perimeterPolyline) {
      this.mapManager.map.removeLayer(this.perimeterPolyline);
      this.perimeterPolyline = null;
    }
  }

  /**
   * Updates corner counter badge
   */
  updateCornerCount() {
    const el = document.getElementById('cornerCount');
    if (el) el.textContent = this.surveyPerimeter.length;
  }

  /**
   * Synchronizes surveyed landmarks into live map and search directory
   */
  syncSurveyDataToApp() {
    // Replace global CAMPUS_LANDMARKS array
    CAMPUS_LANDMARKS.length = 0;
    CAMPUS_LANDMARKS.push(...this.surveyLandmarks);

    // Refresh map markers and search directory
    if (this.mapManager) {
      this.mapManager.renderLandmarkMarkers(CAMPUS_LANDMARKS);
    }
    if (this.app?.searchManager) {
      this.app.searchManager.renderCategoryChips();
      this.app.searchManager.filterAndRender();
    }
  }

  /**
   * Generates clean data.js file and prompts browser download
   */
  exportDataset() {
    const centerLat = CAMPUS_CONFIG.center[0];
    const centerLng = CAMPUS_CONFIG.center[1];

    const jsContent = `/**
 * Campus Map Data & Configuration
 * Wellspring University, Benin City, Nigeria
 * Generated by Wellspring Campus GPS Surveyor
 */

const CAMPUS_CONFIG = {
  name: 'Wellspring University',
  shortName: 'Wellspring',
  center: [${centerLat}, ${centerLng}],
  defaultZoom: 17,
  minZoom: 15,
  maxZoom: 19,
  defaultUserLocation: [${this.surveyLandmarks[0]?.coords[0] || centerLat}, ${this.surveyLandmarks[0]?.coords[1] || centerLng}],
  perimeter: ${JSON.stringify(this.surveyPerimeter, null, 2)},
  maxBounds: [
    [${(centerLat - 0.02).toFixed(6)}, ${(centerLng - 0.02).toFixed(6)}],
    [${(centerLat + 0.02).toFixed(6)}, ${(centerLng + 0.02).toFixed(6)}]
  ]
};

const CATEGORIES = ${JSON.stringify(CATEGORIES, null, 2)};

const CAMPUS_LANDMARKS = ${JSON.stringify(this.surveyLandmarks, null, 2)};
`;

    // Download blob
    const blob = new Blob([jsContent], { type: 'application/javascript;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'data.js');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Also copy to clipboard
    if (navigator.clipboard) {
      navigator.clipboard.writeText(jsContent).then(() => {
        this.app.showToast('data.js downloaded & copied');
      });
    } else {
      this.app.showToast('data.js downloaded');
    }
  }
}

