/**
 * Campus Builder & Development Mode Engine
 * Transforms the application into a complete mobile-first campus editing studio.
 * Supports:
 * - Landmark editing (names, codes, categories, hours, floors, amenities)
 * - Real-time GPS coordinate snapping & on-map pin dragging
 * - Mobile camera photo capture with canvas compression for localStorage
 * - New landmark creation (at GPS or via map tap)
 * - Campus perimeter / boundary fence corner editing
 * - Instant data.js export, clipboard copy, and localStorage persistence
 */

class CampusBuilder {
  constructor(mapManager, app) {
    this.mapManager = mapManager;
    this.app = app;

    // Active state
    this.currentGps = null;
    this.gpsAccuracy = null;
    this.gpsWatchId = null;
    this.activeEditingLandmark = null;
    this.isPickLocationMode = false;
    this.isFenceEditMode = false;

    // Load data from localStorage or fallback to data.js constants
    this.landmarks = this.loadStoredLandmarks();
    this.perimeter = this.loadStoredPerimeter();

    // Map layers for builder mode
    this.fenceLayer = null;
    this.fenceMarkers = [];
    this.tempPickMarker = null;

    // Available amenity suggestions for quick-toggle
    this.suggestedAmenities = [
      'Wi-Fi',
      'Air Conditioned',
      'Restrooms',
      'Wheelchair Accessible',
      'Lecture Halls',
      'Computer Lab',
      'Power Backup',
      'Cafeteria',
      'Quiet Study',
      'ATM Gallery',
      'Solar Powered',
      'Parking Area'
    ];
  }

  /**
   * Initializes the Builder Module
   */
  init() {
    this.syncGlobalDataset();
    this.injectBuilderUI();
    this.attachEventListeners();
    this.startGpsTracking();
    return this;
  }

  /**
   * Loads stored landmarks from localStorage or data.js
   */
  loadStoredLandmarks() {
    try {
      const stored = localStorage.getItem('wellspring_campus_landmarks') || localStorage.getItem('wellspring_survey_landmarks');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Could not read stored landmarks:', e);
    }
    // Deep clone default landmarks
    return JSON.parse(JSON.stringify(CAMPUS_LANDMARKS));
  }

  /**
   * Loads stored perimeter from localStorage or data.js
   */
  loadStoredPerimeter() {
    try {
      const stored = localStorage.getItem('wellspring_campus_perimeter') || localStorage.getItem('wellspring_survey_perimeter');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Could not read stored perimeter:', e);
    }
    return JSON.parse(JSON.stringify(CAMPUS_CONFIG.perimeter || []));
  }

  /**
   * Saves dataset to localStorage
   */
  persistData() {
    try {
      localStorage.setItem('wellspring_campus_landmarks', JSON.stringify(this.landmarks));
      localStorage.setItem('wellspring_campus_perimeter', JSON.stringify(this.perimeter));
    } catch (e) {
      console.error('Failed to persist to localStorage (quota may be exceeded):', e);
      this.app?.showToast('Warning: Storage full. Export data.js soon!');
    }
  }

  /**
   * Synchronizes active dataset with global CAMPUS_LANDMARKS & CAMPUS_CONFIG
   */
  syncGlobalDataset() {
    CAMPUS_LANDMARKS.length = 0;
    CAMPUS_LANDMARKS.push(...this.landmarks);
    CAMPUS_CONFIG.perimeter = [...this.perimeter];

    if (this.mapManager && this.mapManager.map) {
      this.mapManager.renderLandmarkMarkers(CAMPUS_LANDMARKS);
      this.mapManager.renderCampusPerimeter();
    }

    if (this.app?.searchManager) {
      this.app.searchManager.renderCategoryChips();
      this.app.searchManager.filterAndRender();
    }

    this.updateStatusBadge();
  }

  /**
   * Injects the Builder UI elements into the DOM
   */
  injectBuilderUI() {
    // 1. Top Builder Bar
    const topBarHtml = `
      <header class="builder-top-bar" id="builderTopBar" role="banner" aria-label="Campus Builder Studio">
        <div class="builder-brand-group">
          <button class="builder-dir-toggle-btn" id="builderDirectoryBtn" title="Open Directory" aria-label="Open campus directory">
            <i data-lucide="menu"></i>
          </button>
          <div class="builder-live-badge">
            <span class="builder-pulse-dot"></span>
            <strong>BUILDER</strong>
          </div>
          <span class="builder-count-pill" id="builderPoiCount">${this.landmarks.length} POIs</span>
        </div>

        <div class="builder-toolbar-actions">
          <!-- GPS Status Pill -->
          <button class="builder-pill-btn gps-pill" id="builderGpsPill" title="Tap to fly to current location">
            <i data-lucide="satellite"></i>
            <span id="builderGpsLabel">GPS: --</span>
          </button>

          <!-- Add Building Button -->
          <button class="builder-action-btn btn-add" id="builderAddBuildingBtn" title="Add New Building">
            <i data-lucide="plus"></i>
            <span>Add</span>
          </button>

          <!-- Fence Perimeter Editor -->
          <button class="builder-action-btn btn-fence" id="builderFenceToggleBtn" title="Edit Campus Boundary Fence">
            <i data-lucide="shield"></i>
            <span>Fence</span>
          </button>

          <!-- Export data.js -->
          <button class="builder-action-btn btn-export" id="builderExportDataBtn" title="Download data.js">
            <i data-lucide="download"></i>
            <span>Export</span>
          </button>
        </div>
      </header>
    `;

    // 2. Fence Perimeter Edit Bottom Toolbar
    const fenceToolbarHtml = `
      <div class="fence-builder-toolbar" id="fenceBuilderToolbar" style="display: none;" role="toolbar">
        <div class="fence-toolbar-info">
          <i data-lucide="shield"></i>
          <span>Fence Corners: <strong id="fenceCornerCount">0</strong></span>
        </div>
        <div class="fence-toolbar-btns">
          <button class="btn btn-sm btn-primary" id="fenceAddGpsCornerBtn">
            <i data-lucide="map-pin-plus"></i>
            <span>Log Corner at GPS</span>
          </button>
          <button class="btn btn-sm btn-secondary" id="fenceRemoveLastCornerBtn">
            <i data-lucide="undo-2"></i>
            <span>Undo Last</span>
          </button>
          <button class="btn btn-sm btn-outline" id="fenceDoneBtn">
            <i data-lucide="check"></i>
            <span>Done</span>
          </button>
        </div>
      </div>
    `;

    // 3. Quick-Add Selection Modal / Sheet
    const quickAddModalHtml = `
      <div class="builder-modal-backdrop" id="quickAddModalBackdrop" style="display: none;">
        <div class="builder-modal-card" role="dialog" aria-labelledby="quickAddTitle">
          <div class="builder-modal-header">
            <h3 id="quickAddTitle"><i data-lucide="map-pin-plus"></i> Add Campus Landmark</h3>
            <button class="builder-modal-close" id="quickAddCloseBtn">&times;</button>
          </div>
          <div class="quick-add-options">
            <button class="quick-add-option-btn primary" id="addAtCurrentGpsBtn">
              <div class="option-icon"><i data-lucide="crosshair"></i></div>
              <div class="option-content">
                <strong>Create at My Current GPS</strong>
                <span id="quickAddGpsSubtext">Stand in front of entrance & tap</span>
              </div>
            </button>
            <button class="quick-add-option-btn secondary" id="addByMapTapBtn">
              <div class="option-icon"><i data-lucide="mouse-pointer-click"></i></div>
              <div class="option-content">
                <strong>Pick Location on Map</strong>
                <span>Tap directly on the building rooftop</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    `;

    // 4. Comprehensive Building Editor Modal / Sheet
    const editorModalHtml = `
      <div class="landmark-editor-drawer" id="landmarkEditorDrawer" aria-hidden="true" role="dialog">
        <div class="editor-drawer-backdrop" id="editorDrawerBackdrop"></div>
        <div class="editor-drawer-panel" id="editorDrawerPanel">
          <!-- Mobile Drag Handle -->
          <div class="sheet-drag-handle" id="editorDragHandle">
            <div class="drag-indicator-bar"></div>
          </div>

          <div class="editor-header">
            <div class="editor-header-title">
              <i data-lucide="edit-3"></i>
              <h2 id="editorModalTitle">Edit Building</h2>
            </div>
            <button class="editor-close-btn" id="editorCloseBtn" aria-label="Close editor">
              <i data-lucide="x"></i>
            </button>
          </div>

          <form id="landmarkEditorForm" class="editor-form">
            <input type="hidden" id="editLandmarkId" value="" />

            <!-- Photo Section -->
            <div class="editor-section photo-editor-section">
              <label class="editor-label">Building Image / Photo</label>
              <div class="photo-preview-wrapper">
                <img src="" alt="Building photo preview" id="editPhotoPreview" class="edit-photo-preview" />
                <div class="photo-overlay-actions">
                  <label class="btn-photo-upload" for="editPhotoFileInput" title="Upload from camera or gallery">
                    <i data-lucide="camera"></i>
                    <span>Take / Choose Photo</span>
                  </label>
                  <input type="file" id="editPhotoFileInput" accept="image/*" capture="environment" style="display:none;" />
                </div>
              </div>
              <div class="photo-url-row">
                <input type="url" id="editPhotoUrl" placeholder="Or paste image URL (https://...)" class="editor-input-sm" />
                <button type="button" class="btn btn-sm btn-secondary" id="applyPhotoUrlBtn">Apply</button>
              </div>
            </div>

            <!-- Location & Coordinates Section -->
            <div class="editor-section">
              <div class="section-title-row">
                <label class="editor-label">Location Coordinates</label>
                <span class="editor-dist-tag" id="editDistanceTag">0m away</span>
              </div>
              <div class="coords-input-row">
                <div class="coord-field">
                  <span class="coord-prefix">Lat</span>
                  <input type="number" step="0.000001" id="editLat" required class="editor-input" />
                </div>
                <div class="coord-field">
                  <span class="coord-prefix">Lng</span>
                  <input type="number" step="0.000001" id="editLng" required class="editor-input" />
                </div>
              </div>
              <div class="coords-action-row">
                <button type="button" class="btn btn-sm btn-gps-snap" id="snapToMyGpsBtn">
                  <i data-lucide="crosshair"></i>
                  <span>Snap to Current GPS</span>
                </button>
                <button type="button" class="btn btn-sm btn-secondary" id="pickOnMapBtn">
                  <i data-lucide="map-pin"></i>
                  <span>Move on Map</span>
                </button>
              </div>
            </div>

            <!-- Identity Section -->
            <div class="editor-section">
              <div class="form-row">
                <div class="form-col" style="flex: 2;">
                  <label for="editName" class="editor-label">Building Name *</label>
                  <input type="text" id="editName" required placeholder="e.g. Faculty of Science" class="editor-input" />
                </div>
                <div class="form-col" style="flex: 1;">
                  <label for="editCode" class="editor-label">Code *</label>
                  <input type="text" id="editCode" required placeholder="e.g. SCI-01" class="editor-input" />
                </div>
              </div>

              <div class="form-row" style="margin-top: 10px;">
                <div class="form-col">
                  <label class="editor-label">Category *</label>
                  <select id="editCategory" class="editor-select" required>
                    <option value="academic">Academics</option>
                    <option value="library">Libraries</option>
                    <option value="administrative">Admin</option>
                    <option value="cafeteria">Food & Dining</option>
                    <option value="hostel">Hostels & Housing</option>
                    <option value="sports">Sports & Rec</option>
                  </select>
                </div>
                <div class="form-col">
                  <label for="editFloors" class="editor-label">Floors</label>
                  <input type="number" id="editFloors" min="1" max="25" value="1" class="editor-input" />
                </div>
              </div>
            </div>

            <!-- Operating Hours & Contact -->
            <div class="editor-section">
              <div class="form-row">
                <div class="form-col">
                  <label for="editHours" class="editor-label">Operating Hours</label>
                  <input type="text" id="editHours" placeholder="e.g. 8:00 AM – 6:00 PM" class="editor-input" />
                </div>
                <div class="form-col">
                  <label for="editContact" class="editor-label">Contact / Dept</label>
                  <input type="text" id="editContact" placeholder="e.g. admin@wellspring.edu.ng" class="editor-input" />
                </div>
              </div>

              <div class="form-col" style="margin-top: 10px;">
                <label for="editDescription" class="editor-label">Overview & Description</label>
                <textarea id="editDescription" rows="2" placeholder="Facility description..." class="editor-textarea"></textarea>
              </div>
            </div>

            <!-- Facilities & Amenities Section -->
            <div class="editor-section">
              <label class="editor-label">Facilities & Amenities</label>
              <div class="active-tags-container" id="editActiveTags"></div>

              <div class="suggested-tags-wrapper">
                <span class="sub-label">Quick Add:</span>
                <div class="suggested-chips-list" id="suggestedChipsList"></div>
              </div>

              <div class="custom-tag-input-row">
                <input type="text" id="customTagInput" placeholder="Add custom amenity tag..." class="editor-input-sm" />
                <button type="button" class="btn btn-sm btn-secondary" id="addCustomTagBtn">Add Tag</button>
              </div>
            </div>

            <!-- Form Actions -->
            <div class="editor-footer-actions">
              <button type="button" class="btn btn-danger-outline" id="deleteLandmarkBtn">
                <i data-lucide="trash-2"></i>
                <span>Delete</span>
              </button>
              <div class="action-buttons-right">
                <button type="button" class="btn btn-secondary" id="cancelEditorBtn">Cancel</button>
                <button type="submit" class="btn btn-primary" id="saveLandmarkBtn">
                  <i data-lucide="check"></i>
                  <span>Save Building</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('afterbegin', topBarHtml);
    document.body.insertAdjacentHTML('beforeend', fenceToolbarHtml);
    document.body.insertAdjacentHTML('beforeend', quickAddModalHtml);
    document.body.insertAdjacentHTML('beforeend', editorModalHtml);

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  /**
   * Attaches event listeners for builder actions
   */
  attachEventListeners() {
    // Top Bar Actions
    const addBtn = document.getElementById('builderAddBuildingBtn');
    if (addBtn) addBtn.addEventListener('click', () => this.openQuickAddModal());

    const fenceBtn = document.getElementById('builderFenceToggleBtn');
    if (fenceBtn) fenceBtn.addEventListener('click', () => this.toggleFenceEditMode());

    const exportBtn = document.getElementById('builderExportDataBtn');
    if (exportBtn) exportBtn.addEventListener('click', () => this.exportDataset());

    const directoryBtn = document.getElementById('builderDirectoryBtn');
    if (directoryBtn) directoryBtn.addEventListener('click', () => this.app.openMobileSidebar());

    const gpsPill = document.getElementById('builderGpsPill');
    if (gpsPill) {
      gpsPill.addEventListener('click', () => {
        if (this.currentGps) {
          this.mapManager.flyToLocation(this.currentGps, 18);
          this.app?.showToast('Centered on GPS');
        } else {
          this.app?.showToast('Acquiring GPS position...');
        }
      });
    }

    // Quick Add Modal Listeners
    const quickAddBackdrop = document.getElementById('quickAddModalBackdrop');
    const quickAddClose = document.getElementById('quickAddCloseBtn');
    if (quickAddClose) quickAddClose.addEventListener('click', () => this.closeQuickAddModal());
    if (quickAddBackdrop) {
      quickAddBackdrop.addEventListener('click', (e) => {
        if (e.target === quickAddBackdrop) this.closeQuickAddModal();
      });
    }

    const addAtGpsBtn = document.getElementById('addAtCurrentGpsBtn');
    if (addAtGpsBtn) {
      addAtGpsBtn.addEventListener('click', () => {
        this.closeQuickAddModal();
        const coords = this.currentGps || CAMPUS_CONFIG.center;
        this.openLandmarkEditor(null, coords);
      });
    }

    const addByMapTapBtn = document.getElementById('addByMapTapBtn');
    if (addByMapTapBtn) {
      addByMapTapBtn.addEventListener('click', () => {
        this.closeQuickAddModal();
        this.startPickLocationOnMap((coords) => {
          this.openLandmarkEditor(null, coords);
        });
      });
    }

    // Editor Form Listeners
    const editorCloseBtn = document.getElementById('editorCloseBtn');
    const cancelEditorBtn = document.getElementById('cancelEditorBtn');
    const editorBackdrop = document.getElementById('editorDrawerBackdrop');
    [editorCloseBtn, cancelEditorBtn, editorBackdrop].forEach(btn => {
      if (btn) btn.addEventListener('click', () => this.closeLandmarkEditor());
    });

    const form = document.getElementById('landmarkEditorForm');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveLandmarkFromEditor();
      });
    }

    // Photo input handling (Client-side compression)
    const photoFileInput = document.getElementById('editPhotoFileInput');
    if (photoFileInput) {
      photoFileInput.addEventListener('change', async (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) {
          this.app?.showToast('Processing photo...');
          try {
            const compressedBase64 = await this.compressImage(file);
            const preview = document.getElementById('editPhotoPreview');
            const urlInput = document.getElementById('editPhotoUrl');
            if (preview) preview.src = compressedBase64;
            if (urlInput) urlInput.value = compressedBase64;
            this.app?.showToast('Photo attached!');
          } catch (err) {
            console.error('Image compression failed:', err);
            this.app?.showToast('Failed to process image');
          }
        }
      });
    }

    const applyPhotoUrlBtn = document.getElementById('applyPhotoUrlBtn');
    if (applyPhotoUrlBtn) {
      applyPhotoUrlBtn.addEventListener('click', () => {
        const urlInput = document.getElementById('editPhotoUrl');
        const preview = document.getElementById('editPhotoPreview');
        if (urlInput && preview && urlInput.value.trim()) {
          preview.src = urlInput.value.trim();
          this.app?.showToast('Image URL applied');
        }
      });
    }

    // Snap to Current GPS inside Editor
    const snapGpsBtn = document.getElementById('snapToMyGpsBtn');
    if (snapGpsBtn) {
      snapGpsBtn.addEventListener('click', () => {
        if (this.currentGps) {
          document.getElementById('editLat').value = this.currentGps[0].toFixed(6);
          document.getElementById('editLng').value = this.currentGps[1].toFixed(6);
          this.app?.showToast('Coordinates snapped to GPS');
        } else {
          this.app?.showToast('GPS not acquired yet');
        }
      });
    }

    // Move on Map inside Editor
    const pickOnMapBtn = document.getElementById('pickOnMapBtn');
    if (pickOnMapBtn) {
      pickOnMapBtn.addEventListener('click', () => {
        this.closeLandmarkEditor();
        this.startPickLocationOnMap((coords) => {
          document.getElementById('editLat').value = coords[0].toFixed(6);
          document.getElementById('editLng').value = coords[1].toFixed(6);
          this.openLandmarkEditor(this.activeEditingLandmark);
        });
      });
    }

    // Custom Tag addition
    const addCustomTagBtn = document.getElementById('addCustomTagBtn');
    const customTagInput = document.getElementById('customTagInput');
    if (addCustomTagBtn && customTagInput) {
      const addTag = () => {
        const tag = customTagInput.value.trim();
        if (tag) {
          this.addAmenityTag(tag);
          customTagInput.value = '';
        }
      };
      addCustomTagBtn.addEventListener('click', addTag);
      customTagInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          addTag();
        }
      });
    }

    // Delete Landmark Button
    const deleteBtn = document.getElementById('deleteLandmarkBtn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        if (this.activeEditingLandmark) {
          const confirmDelete = window.confirm(`Delete "${this.activeEditingLandmark.name}"?`);
          if (confirmDelete) {
            this.deleteLandmark(this.activeEditingLandmark.id);
            this.closeLandmarkEditor();
          }
        }
      });
    }

    // Fence Perimeter Toolbar Actions
    const fenceGpsBtn = document.getElementById('fenceAddGpsCornerBtn');
    if (fenceGpsBtn) {
      fenceGpsBtn.addEventListener('click', () => this.addFenceCornerAtGps());
    }

    const fenceUndoBtn = document.getElementById('fenceRemoveLastCornerBtn');
    if (fenceUndoBtn) {
      fenceUndoBtn.addEventListener('click', () => this.undoLastFenceCorner());
    }

    const fenceDoneBtn = document.getElementById('fenceDoneBtn');
    if (fenceDoneBtn) {
      fenceDoneBtn.addEventListener('click', () => this.toggleFenceEditMode(false));
    }
  }

  /**
   * Starts High-Precision GPS tracking
   */
  startGpsTracking() {
    if (!('geolocation' in navigator)) {
      this.updateGpsLabel('GPS Unavailable', false);
      return;
    }

    this.gpsWatchId = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const acc = pos.coords.accuracy;

        this.currentGps = [lat, lng];
        this.gpsAccuracy = acc;

        this.updateGpsLabel(`GPS: ±${Math.round(acc)}m`, true);

        if (this.app?.navManager) {
          this.app.navManager.setUserLocation([lat, lng], acc, false, 'Surveyor Position');
        }

        // Update distance tag if editor is open
        if (this.activeEditingLandmark) {
          this.updateEditorDistanceTag(this.activeEditingLandmark.coords);
        }
      },
      (err) => {
        console.warn('GPS watch error:', err.message);
        this.currentGps = CAMPUS_CONFIG.center;
        this.updateGpsLabel('GPS: Demo Quad', false);
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 12000 }
    );
  }

  /**
   * Updates topbar GPS indicator
   */
  updateGpsLabel(text, isGood = true) {
    const label = document.getElementById('builderGpsLabel');
    const pill = document.getElementById('builderGpsPill');
    const subtext = document.getElementById('quickAddGpsSubtext');

    if (label) label.textContent = text;
    if (pill) {
      pill.classList.toggle('good-gps', isGood);
    }
    if (subtext && this.currentGps) {
      subtext.textContent = `At [${this.currentGps[0].toFixed(5)}, ${this.currentGps[1].toFixed(5)}] (±${Math.round(this.gpsAccuracy || 0)}m)`;
    }
  }

  /**
   * Updates POI counter badge
   */
  updateStatusBadge() {
    const countEl = document.getElementById('builderPoiCount');
    if (countEl) countEl.textContent = `${this.landmarks.length} POIs`;
  }

  /**
   * Opens Quick Add Choice Modal
   */
  openQuickAddModal() {
    const modal = document.getElementById('quickAddModalBackdrop');
    if (modal) modal.style.display = 'flex';
  }

  /**
   * Closes Quick Add Choice Modal
   */
  closeQuickAddModal() {
    const modal = document.getElementById('quickAddModalBackdrop');
    if (modal) modal.style.display = 'none';
  }

  /**
   * Opens Landmark Editor (for existing landmark or newly created one)
   */
  openLandmarkEditor(landmark = null, defaultCoords = null) {
    this.activeEditingLandmark = landmark;
    const isNew = !landmark;

    const drawer = document.getElementById('landmarkEditorDrawer');
    const title = document.getElementById('editorModalTitle');
    const idInput = document.getElementById('editLandmarkId');
    const nameInput = document.getElementById('editName');
    const codeInput = document.getElementById('editCode');
    const catSelect = document.getElementById('editCategory');
    const floorsInput = document.getElementById('editFloors');
    const hoursInput = document.getElementById('editHours');
    const contactInput = document.getElementById('editContact');
    const descInput = document.getElementById('editDescription');
    const latInput = document.getElementById('editLat');
    const lngInput = document.getElementById('editLng');
    const photoPreview = document.getElementById('editPhotoPreview');
    const photoUrlInput = document.getElementById('editPhotoUrl');
    const deleteBtn = document.getElementById('deleteLandmarkBtn');

    if (isNew) {
      title.textContent = 'Add New Building';
      idInput.value = '';
      nameInput.value = '';
      codeInput.value = `BLD-${String(this.landmarks.length + 1).padStart(2, '0')}`;
      catSelect.value = 'academic';
      floorsInput.value = 1;
      hoursInput.value = '8:00 AM – 6:00 PM';
      contactInput.value = 'info@wellspring.edu.ng';
      descInput.value = '';

      const coords = defaultCoords || this.currentGps || CAMPUS_CONFIG.center;
      latInput.value = coords[0].toFixed(6);
      lngInput.value = coords[1].toFixed(6);

      const placeholderImg = 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=800&q=80';
      photoPreview.src = placeholderImg;
      photoUrlInput.value = placeholderImg;

      this.currentAmenities = ['Wi-Fi', 'Restrooms', 'Wheelchair Accessible'];
      if (deleteBtn) deleteBtn.style.display = 'none';
    } else {
      title.textContent = `Edit: ${landmark.name}`;
      idInput.value = landmark.id;
      nameInput.value = landmark.name;
      codeInput.value = landmark.code;
      catSelect.value = landmark.category;
      floorsInput.value = landmark.floors || 1;
      hoursInput.value = landmark.hours || '8:00 AM – 6:00 PM';
      contactInput.value = landmark.contact || '';
      descInput.value = landmark.description || '';

      latInput.value = landmark.coords[0].toFixed(6);
      lngInput.value = landmark.coords[1].toFixed(6);

      photoPreview.src = landmark.image || '';
      photoUrlInput.value = landmark.image || '';

      this.currentAmenities = Array.isArray(landmark.facilities) ? [...landmark.facilities] : [];
      if (deleteBtn) deleteBtn.style.display = 'inline-flex';
    }

    this.renderActiveAmenityTags();
    this.renderSuggestedAmenityChips();
    this.updateEditorDistanceTag([parseFloat(latInput.value), parseFloat(lngInput.value)]);

    if (drawer) {
      drawer.classList.add('open');
      drawer.setAttribute('aria-hidden', 'false');
    }

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  /**
   * Closes Landmark Editor
   */
  closeLandmarkEditor() {
    const drawer = document.getElementById('landmarkEditorDrawer');
    if (drawer) {
      drawer.classList.remove('open');
      drawer.setAttribute('aria-hidden', 'true');
    }
    this.activeEditingLandmark = null;
  }

  /**
   * Updates distance indicator tag inside editor
   */
  updateEditorDistanceTag(coords) {
    const distTag = document.getElementById('editDistanceTag');
    if (!distTag) return;

    if (this.currentGps && coords) {
      const dist = this.app?.navManager?.calculateDistance(this.currentGps, coords) || 0;
      distTag.textContent = dist >= 1000 ? `${(dist / 1000).toFixed(2)}km away` : `${Math.round(dist)}m away`;
    } else {
      distTag.textContent = 'Coords set';
    }
  }

  /**
   * Renders active amenities tags
   */
  renderActiveAmenityTags() {
    const container = document.getElementById('editActiveTags');
    if (!container) return;

    if (!this.currentAmenities || this.currentAmenities.length === 0) {
      container.innerHTML = `<span class="empty-tags-hint">No amenities added yet. Pick from below:</span>`;
      return;
    }

    container.innerHTML = this.currentAmenities.map((amenity, idx) => `
      <span class="builder-tag-chip">
        <span>${amenity}</span>
        <button type="button" class="tag-remove-btn" data-tag-idx="${idx}">&times;</button>
      </span>
    `).join('');

    container.querySelectorAll('.tag-remove-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.getAttribute('data-tag-idx'));
        this.currentAmenities.splice(idx, 1);
        this.renderActiveAmenityTags();
      });
    });
  }

  /**
   * Renders suggested amenity chips
   */
  renderSuggestedAmenityChips() {
    const container = document.getElementById('suggestedChipsList');
    if (!container) return;

    container.innerHTML = this.suggestedAmenities.map(amenity => {
      const isAlreadyAdded = this.currentAmenities.includes(amenity);
      return `
        <button 
          type="button" 
          class="suggested-chip ${isAlreadyAdded ? 'added' : ''}" 
          data-amenity="${amenity}">
          ${isAlreadyAdded ? '✓ ' : '+ '}${amenity}
        </button>
      `;
    }).join('');

    container.querySelectorAll('.suggested-chip').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const amenity = e.currentTarget.getAttribute('data-amenity');
        if (this.currentAmenities.includes(amenity)) {
          this.currentAmenities = this.currentAmenities.filter(a => a !== amenity);
        } else {
          this.currentAmenities.push(amenity);
        }
        this.renderActiveAmenityTags();
        this.renderSuggestedAmenityChips();
      });
    });
  }

  /**
   * Adds custom amenity tag
   */
  addAmenityTag(tag) {
    if (!this.currentAmenities.includes(tag)) {
      this.currentAmenities.push(tag);
      this.renderActiveAmenityTags();
      this.renderSuggestedAmenityChips();
    }
  }

  /**
   * Saves or creates landmark from editor inputs
   */
  saveLandmarkFromEditor() {
    const idInput = document.getElementById('editLandmarkId');
    const name = document.getElementById('editName').value.trim();
    const code = document.getElementById('editCode').value.trim();
    const category = document.getElementById('editCategory').value;
    const floors = parseInt(document.getElementById('editFloors').value) || 1;
    const hours = document.getElementById('editHours').value.trim() || '8:00 AM – 6:00 PM';
    const contact = document.getElementById('editContact').value.trim() || 'info@wellspring.edu.ng';
    const description = document.getElementById('editDescription').value.trim() || `${name} facility.`;
    const lat = parseFloat(document.getElementById('editLat').value);
    const lng = parseFloat(document.getElementById('editLng').value);
    const image = document.getElementById('editPhotoUrl').value.trim() || 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=800&q=80';

    if (isNaN(lat) || isNaN(lng)) {
      this.app?.showToast('Error: Invalid coordinates');
      return;
    }

    let landmarkId = idInput.value;
    if (!landmarkId) {
      landmarkId = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `bld-${Date.now()}`;
    }

    const landmarkData = {
      id: landmarkId,
      name,
      code,
      coords: [lat, lng],
      category,
      description,
      floors,
      hours,
      facilities: [...this.currentAmenities],
      image,
      contact
    };

    const existingIndex = this.landmarks.findIndex(l => l.id === landmarkId);
    if (existingIndex >= 0) {
      this.landmarks[existingIndex] = landmarkData;
    } else {
      this.landmarks.unshift(landmarkData);
    }

    this.persistData();
    this.syncGlobalDataset();
    this.closeLandmarkEditor();
    this.app?.showToast(`Saved ${name}!`);

    // Fly to saved building
    this.mapManager.flyToLocation([lat, lng], 18);
  }

  /**
   * Deletes a landmark
   */
  deleteLandmark(landmarkId) {
    const idx = this.landmarks.findIndex(l => l.id === landmarkId);
    if (idx >= 0) {
      const removed = this.landmarks.splice(idx, 1)[0];
      this.persistData();
      this.syncGlobalDataset();
      this.app?.showToast(`Deleted ${removed.name}`);
    }
  }

  /**
   * Updates a landmark's coordinates directly (e.g. from GPS snap or map drag)
   */
  updateLandmarkCoords(landmarkId, newCoords) {
    const landmark = this.landmarks.find(l => l.id === landmarkId);
    if (landmark) {
      landmark.coords = [parseFloat(newCoords[0].toFixed(6)), parseFloat(newCoords[1].toFixed(6))];
      this.persistData();
      this.syncGlobalDataset();

      // If editor drawer is currently open for this landmark, update form fields
      if (this.activeEditingLandmark && this.activeEditingLandmark.id === landmarkId) {
        const latInput = document.getElementById('editLat');
        const lngInput = document.getElementById('editLng');
        if (latInput) latInput.value = landmark.coords[0].toFixed(6);
        if (lngInput) lngInput.value = landmark.coords[1].toFixed(6);
        this.updateEditorDistanceTag(landmark.coords);
      }

      this.app?.showToast(`Updated location for ${landmark.name}`);
    }
  }

  /**
   * Snap an existing landmark directly to current GPS position
   */
  snapLandmarkToGps(landmarkId) {
    if (!this.currentGps) {
      this.app?.showToast('Acquiring GPS... try again in a moment');
      return;
    }
    this.updateLandmarkCoords(landmarkId, this.currentGps);
  }

  /**
   * Enters "Pick on Map" mode
   */
  startPickLocationOnMap(callback) {
    this.isPickLocationMode = true;
    const mapEl = document.getElementById('map');
    if (mapEl) mapEl.style.cursor = 'crosshair';

    this.app?.showToast('Tap on map to place pin');

    const clickHandler = (e) => {
      const { lat, lng } = e.latlng;
      this.mapManager.map.off('click', clickHandler);
      if (mapEl) mapEl.style.cursor = '';
      this.isPickLocationMode = false;

      callback([lat, lng]);
    };

    this.mapManager.map.on('click', clickHandler);
  }

  /**
   * Compress and resize images client-side for phone cameras
   */
  compressImage(file, maxWidth = 1000, quality = 0.78) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  }

  /**
   * Toggle Campus Boundary Fence Editor Mode
   */
  toggleFenceEditMode(forceState = null) {
    this.isFenceEditMode = forceState !== null ? forceState : !this.isFenceEditMode;

    const toolbar = document.getElementById('fenceBuilderToolbar');
    const toggleBtn = document.getElementById('builderFenceToggleBtn');

    if (toolbar) toolbar.style.display = this.isFenceEditMode ? 'flex' : 'none';
    if (toggleBtn) toggleBtn.classList.toggle('active', this.isFenceEditMode);

    if (this.isFenceEditMode) {
      this.renderFenceEditLayer();
      this.app?.showToast('Fence Editor Active: Walk corners or drag markers');
    } else {
      this.clearFenceEditLayer();
      this.app?.showToast('Fence Editor closed');
    }
  }

  /**
   * Renders interactive boundary corner markers & polyline
   */
  renderFenceEditLayer() {
    this.clearFenceEditLayer();

    const cornerCountEl = document.getElementById('fenceCornerCount');
    if (cornerCountEl) cornerCountEl.textContent = this.perimeter.length;

    if (this.perimeter.length >= 2) {
      const closedPoints = [...this.perimeter];
      if (closedPoints.length >= 3) closedPoints.push(closedPoints[0]);

      this.fenceLayer = L.polyline(closedPoints, {
        color: '#8b5cf6',
        weight: 3.5,
        dashArray: '6, 6'
      }).addTo(this.mapManager.map);
    }

    // Draggable vertex pins
    this.perimeter.forEach((pt, index) => {
      const cornerIcon = L.divIcon({
        className: 'fence-corner-pin',
        html: `<div class="fence-vertex-dot" title="Corner #${index + 1} (Drag to adjust)">${index + 1}</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const marker = L.marker(pt, { icon: cornerIcon, draggable: true }).addTo(this.mapManager.map);

      marker.on('dragend', (e) => {
        const newLatLng = e.target.getLatLng();
        this.perimeter[index] = [
          parseFloat(newLatLng.lat.toFixed(6)),
          parseFloat(newLatLng.lng.toFixed(6))
        ];
        this.persistData();
        this.syncGlobalDataset();
        this.renderFenceEditLayer();
      });

      this.fenceMarkers.push(marker);
    });
  }

  /**
   * Clears fence edit markers
   */
  clearFenceEditLayer() {
    this.fenceMarkers.forEach(m => this.mapManager.map.removeLayer(m));
    this.fenceMarkers = [];
    if (this.fenceLayer) {
      this.mapManager.map.removeLayer(this.fenceLayer);
      this.fenceLayer = null;
    }
  }

  /**
   * Adds fence corner at current GPS
   */
  addFenceCornerAtGps() {
    const coords = this.currentGps || [
      this.mapManager.map.getCenter().lat,
      this.mapManager.map.getCenter().lng
    ];
    const newPt = [parseFloat(coords[0].toFixed(6)), parseFloat(coords[1].toFixed(6))];

    this.perimeter.push(newPt);
    this.persistData();
    this.syncGlobalDataset();
    this.renderFenceEditLayer();
    this.app?.showToast(`Added fence corner #${this.perimeter.length}`);
  }

  /**
   * Undoes last fence corner
   */
  undoLastFenceCorner() {
    if (this.perimeter.length > 0) {
      this.perimeter.pop();
      this.persistData();
      this.syncGlobalDataset();
      this.renderFenceEditLayer();
      this.app?.showToast('Removed last corner');
    }
  }

  /**
   * Exports data.js with clean formatting and triggers download
   */
  exportDataset() {
    const centerLat = CAMPUS_CONFIG.center[0];
    const centerLng = CAMPUS_CONFIG.center[1];

    const jsContent = `/**
 * Campus Map Data & Configuration
 * Wellspring University, Benin City, Edo State, Nigeria
 * Generated by Wellspring Campus Builder Studio
 */

const CAMPUS_CONFIG = {
  name: 'Wellspring University',
  shortName: 'Wellspring',
  center: [${centerLat}, ${centerLng}],
  defaultZoom: 17,
  minZoom: 15,
  maxZoom: 19,
  defaultUserLocation: [${this.landmarks[0]?.coords[0] || centerLat}, ${this.landmarks[0]?.coords[1] || centerLng}],
  perimeter: ${JSON.stringify(this.perimeter, null, 2)},
  maxBounds: [
    [${(centerLat - 0.02).toFixed(6)}, ${(centerLng - 0.02).toFixed(6)}],
    [${(centerLat + 0.02).toFixed(6)}, ${(centerLng + 0.02).toFixed(6)}]
  ]
};

const CATEGORIES = ${JSON.stringify(CATEGORIES, null, 2)};

const CAMPUS_LANDMARKS = ${JSON.stringify(this.landmarks, null, 2)};
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
        this.app?.showToast('data.js downloaded & copied');
      });
    } else {
      this.app?.showToast('data.js downloaded');
    }
  }
}
