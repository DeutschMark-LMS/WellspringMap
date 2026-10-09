/**
 * Application Entry Point & Main Controller
 * Coordinates map initialization, search interactions, drawer panels, and UI events.
 */

class CampusApp {
  constructor() {
    this.mapManager = null;
    this.searchManager = null;
    this.navManager = null;
    this.activeLandmark = null;

    // Toast Timer
    this.toastTimeout = null;

    // DOM Elements
    this.sidebar = document.getElementById('sidebar');
    this.sidebarOpenBtn = document.getElementById('sidebarOpenBtn');
    this.sidebarCloseBtn = document.getElementById('sidebarCloseBtn');
    this.mobileDrawerToggle = document.getElementById('mobileDrawerToggle');

    // Detail Drawer Elements
    this.detailDrawer = document.getElementById('detailDrawer');
    this.detailDrawerBackdrop = document.getElementById('detailDrawerBackdrop');
    this.detailCloseBtn = document.getElementById('detailCloseBtn');
    this.detailImage = document.getElementById('detailImage');
    this.detailCategoryBadge = document.getElementById('detailCategoryBadge');
    this.detailCodeBadge = document.getElementById('detailCodeBadge');
    this.detailTitle = document.getElementById('detailDrawerTitle');
    this.detailStatusText = document.getElementById('detailStatusText');
    this.detailHours = document.getElementById('detailHours');
    this.detailDescription = document.getElementById('detailDescription');
    this.detailFloors = document.getElementById('detailFloors');
    this.detailContact = document.getElementById('detailContact');
    this.detailAmenities = document.getElementById('detailAmenities');
    this.detailDirectionsBtn = document.getElementById('detailDirectionsBtn');
    this.detailCenterBtn = document.getElementById('detailCenterBtn');
    this.detailShareBtn = document.getElementById('detailShareBtn');

    // Layer Controls
    this.layerDropdownBtn = document.getElementById('layerDropdownBtn');
    this.layerDropdownMenu = document.getElementById('layerDropdownMenu');

    // Action Controls
    this.recenterBtn = document.getElementById('recenterBtn');
    this.togglePerimeterBtn = document.getElementById('togglePerimeterBtn');

    // Legend
    this.mapLegend = document.getElementById('mapLegend');
    this.legendToggleBtn = document.getElementById('legendToggleBtn');
    this.legendBody = document.getElementById('legendBody');

    // Toast
    this.toastEl = document.getElementById('toastNotification');
    this.toastMessage = document.getElementById('toastMessage');
  }

  /**
   * Application Bootstrapping
   */
  init() {
    // 1. Initialize core managers
    this.mapManager = new CampusMap().init();
    this.searchManager = new CampusSearch(this.mapManager).init();
    this.navManager = new CampusNavigation(this.mapManager).init();
    this.surveyor = new CampusSurveyor(this.mapManager, this).init();

    // Attach global instances for cross-module callbacks
    window.campusApp = this;
    window.campusMap = this.mapManager;
    window.campusSearch = this.searchManager;
    window.campusNavigation = this.navManager;
    window.campusSurveyor = this.surveyor;

    // 2. Setup UI listeners and components
    this.setupUIEvents();
    this.setupBottomSheetGestures();
    this.populateLegend();

    // 3. Render Lucide icons
    if (window.lucide) {
      window.lucide.createIcons();
    }

    return this;
  }

  /**
   * Sets up UI event bindings
   */
  setupUIEvents() {
    // Sidebar Mobile Drawer Controls
    this.sidebarBackdrop = document.getElementById('sidebarBackdrop');
    if (this.sidebarOpenBtn) {
      this.sidebarOpenBtn.addEventListener('click', () => this.openMobileSidebar());
    }
    if (this.mobileDrawerToggle) {
      this.mobileDrawerToggle.addEventListener('click', () => this.openMobileSidebar());
    }
    if (this.sidebarCloseBtn) {
      this.sidebarCloseBtn.addEventListener('click', () => this.closeMobileSidebar());
    }
    if (this.sidebarBackdrop) {
      this.sidebarBackdrop.addEventListener('click', () => this.closeMobileSidebar());
    }

    // Detail Drawer Listeners
    if (this.detailCloseBtn) {
      this.detailCloseBtn.addEventListener('click', () => this.closeBuildingDetail());
    }
    if (this.detailDrawerBackdrop) {
      this.detailDrawerBackdrop.addEventListener('click', () => this.closeBuildingDetail());
    }

    // Detail Action Buttons
    if (this.detailDirectionsBtn) {
      this.detailDirectionsBtn.addEventListener('click', () => {
        if (this.activeLandmark) {
          this.closeBuildingDetail();
          this.closeMobileSidebar();
          this.navManager.drawRouteTo(this.activeLandmark);
        }
      });
    }

    if (this.detailCenterBtn) {
      this.detailCenterBtn.addEventListener('click', () => {
        if (this.activeLandmark) {
          this.mapManager.flyToLocation(this.activeLandmark.coords, 18);
          this.closeBuildingDetail();
        }
      });
    }

    if (this.detailShareBtn) {
      this.detailShareBtn.addEventListener('click', () => {
        if (this.activeLandmark) {
          const shareUrl = `${window.location.origin}${window.location.pathname}#${this.activeLandmark.id}`;
          if (navigator.clipboard) {
            navigator.clipboard.writeText(shareUrl).then(() => {
              this.showToast(`Link to ${this.activeLandmark.name} copied!`);
            });
          } else {
            this.showToast(`Location: ${this.activeLandmark.name} (${this.activeLandmark.code})`);
          }
        }
      });
    }

    // Layer Switcher Dropdown
    if (this.layerDropdownBtn && this.layerDropdownMenu) {
      this.layerDropdownBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = this.layerDropdownMenu.classList.toggle('open');
        this.layerDropdownBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });

      document.addEventListener('click', () => {
        this.layerDropdownMenu.classList.remove('open');
        this.layerDropdownBtn.setAttribute('aria-expanded', 'false');
      });

      const layerButtons = this.layerDropdownMenu.querySelectorAll('.layer-option-btn');
      layerButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          const layerType = btn.getAttribute('data-layer');
          layerButtons.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');

          const labelEl = this.layerDropdownBtn.querySelector('.btn-label');
          if (labelEl) {
            const nameMap = { street: 'Street', satellite: 'Satellite', dark: 'Dark' };
            labelEl.textContent = nameMap[layerType] || 'Layer';
          }

          this.mapManager.setTileLayer(layerType);
          this.layerDropdownMenu.classList.remove('open');
          this.showToast(`${layerType.toUpperCase()} View`);
        });
      });
    }

    // Map Action Controls
    if (this.recenterBtn) {
      this.recenterBtn.addEventListener('click', () => {
        this.mapManager.fitCampusPerimeter();
        this.showToast('Campus centered');
      });
    }

    if (this.togglePerimeterBtn) {
      this.togglePerimeterBtn.addEventListener('click', () => {
        const isVisible = this.mapManager.togglePerimeter();
        this.togglePerimeterBtn.classList.toggle('active', isVisible);
        this.showToast(isVisible ? 'Boundary shown' : 'Boundary hidden');
      });
    }

    // Developer Coordinate Inspector (Dev Mode)
    this.devModeBtn = document.getElementById('devModeBtn');
    this.coordInspectorPanel = document.getElementById('coordInspectorPanel');
    this.closeInspectorBtn = document.getElementById('closeInspectorBtn');
    this.inspectorLat = document.getElementById('inspectorLat');
    this.inspectorLng = document.getElementById('inspectorLng');
    this.copyCoordsBtn = document.getElementById('copyCoordsBtn');
    this.copyPoiSnippetBtn = document.getElementById('copyPoiSnippetBtn');
    this.lastPickedCoords = null;

    if (this.devModeBtn) {
      this.devModeBtn.addEventListener('click', () => {
        const isActive = this.mapManager.toggleDevMode((lat, lng) => {
          this.updateInspectorReadout(lat, lng);
        });

        this.devModeBtn.classList.toggle('active', isActive);
        if (this.coordInspectorPanel) {
          this.coordInspectorPanel.style.display = isActive ? 'flex' : 'none';
        }

        if (isActive) {
          this.showToast('Dev Mode: Click map to pick');
        }
      });
    }

    if (this.closeInspectorBtn) {
      this.closeInspectorBtn.addEventListener('click', () => {
        this.mapManager.toggleDevMode();
        if (this.devModeBtn) this.devModeBtn.classList.remove('active');
        if (this.coordInspectorPanel) this.coordInspectorPanel.style.display = 'none';
      });
    }

    if (this.copyCoordsBtn) {
      this.copyCoordsBtn.addEventListener('click', () => {
        if (!this.lastPickedCoords) return;
        const coordStr = `[${this.lastPickedCoords[0].toFixed(6)}, ${this.lastPickedCoords[1].toFixed(6)}]`;
        if (navigator.clipboard) {
          navigator.clipboard.writeText(coordStr).then(() => {
            this.showToast('Coordinates copied');
          });
        }
      });
    }

    if (this.copyPoiSnippetBtn) {
      this.copyPoiSnippetBtn.addEventListener('click', () => {
        if (!this.lastPickedCoords) return;
        const lat = this.lastPickedCoords[0].toFixed(6);
        const lng = this.lastPickedCoords[1].toFixed(6);
        const snippet = `  {
    id: 'new-building-id',
    name: 'New Building Name',
    code: 'BLD-01',
    coords: [${lat}, ${lng}],
    category: 'academic',
    description: 'Overview description of this facility.',
    floors: 3,
    hours: '8:00 AM – 6:00 PM',
    facilities: ['Wi-Fi', 'Restrooms', 'Wheelchair Accessible'],
    image: 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=800&q=80',
    contact: 'info@wellspring.edu.ng'
  },`;

        if (navigator.clipboard) {
          navigator.clipboard.writeText(snippet).then(() => {
            this.showToast('POI snippet copied');
          });
        }
      });
    }

    const launchSurveyorBtn = document.getElementById('launchSurveyorFromDevBtn');
    if (launchSurveyorBtn) {
      launchSurveyorBtn.addEventListener('click', () => {
        if (this.coordInspectorPanel) this.coordInspectorPanel.style.display = 'none';
        if (this.devModeBtn) this.devModeBtn.classList.remove('active');
        this.mapManager.toggleDevMode(false);
        this.surveyor.toggleSurveyMode(true);
      });
    }

    // Direct Download data.js buttons (in Sidebar and Inspector)
    const sidebarExportBtn = document.getElementById('sidebarExportBtn');
    if (sidebarExportBtn) {
      sidebarExportBtn.addEventListener('click', () => {
        this.surveyor.exportDataset();
      });
    }

    const inspectorExportBtn = document.getElementById('inspectorExportBtn');
    if (inspectorExportBtn) {
      inspectorExportBtn.addEventListener('click', () => {
        this.surveyor.exportDataset();
      });
    }

    // Legend Toggle
    if (this.legendToggleBtn) {
      this.legendToggleBtn.addEventListener('click', () => {
        this.mapLegend.classList.toggle('collapsed');
      });
    }

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
      // '/' to focus search input
      if (e.key === '/' && document.activeElement !== this.searchManager.searchInput) {
        e.preventDefault();
        this.searchManager.searchInput.focus();
        this.showToast('Search activated');
      }

      // 'Escape' to close drawer, search, or route
      if (e.key === 'Escape') {
        if (this.detailDrawer.classList.contains('open')) {
          this.closeBuildingDetail();
        } else if (this.navManager.activeRoutePolyline) {
          this.navManager.clearRoute();
        } else if (this.searchManager.searchQuery.length > 0) {
          this.searchManager.resetAllFilters();
        }
      }
    });

    // Handle initial URL hash navigation (e.g. #central-library)
    if (window.location.hash) {
      const slug = window.location.hash.replace('#', '');
      const matched = CAMPUS_LANDMARKS.find(l => l.id === slug);
      if (matched) {
        setTimeout(() => {
          this.openBuildingDetail(matched.id);
          this.mapManager.flyToLocation(matched.coords, 18);
        }, 500);
      }
    }
  }

  /**
   * Opens the building detail slide-over drawer
   */
  openBuildingDetail(landmarkId) {
    const landmark = CAMPUS_LANDMARKS.find(l => l.id === landmarkId);
    if (!landmark) return;

    this.activeLandmark = landmark;
    const catMeta = CATEGORIES[landmark.category] || CATEGORIES.administrative;

    // Populate data
    this.detailImage.src = landmark.image;
    this.detailImage.alt = landmark.name;
    this.detailCategoryBadge.textContent = catMeta.label;
    this.detailCategoryBadge.style.color = catMeta.color;
    this.detailCodeBadge.textContent = landmark.code;
    this.detailTitle.textContent = landmark.name;
    this.detailHours.textContent = landmark.hours;
    this.detailDescription.textContent = landmark.description;
    this.detailFloors.textContent = `${landmark.floors} Level${landmark.floors > 1 ? 's' : ''}`;
    this.detailContact.textContent = landmark.contact;

    // Amenities tags
    this.detailAmenities.innerHTML = landmark.facilities.map(fac => `
      <span class="amenity-tag">
        <i data-lucide="check-circle-2" style="width:14px;height:14px;color:var(--primary);"></i>
        ${fac}
      </span>
    `).join('');

    // Highlight map marker & sync sidebar
    this.mapManager.selectMarker(landmark.id);
    this.searchManager.highlightCard(landmark.id);

    // Open drawer
    if (window.innerWidth <= 900) {
      this.closeMobileSidebar();
    }
    this.detailDrawer.classList.add('open');
    this.detailDrawer.setAttribute('aria-hidden', 'false');

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  /**
   * Closes the building detail drawer
   */
  closeBuildingDetail() {
    this.detailDrawer.classList.remove('open');
    this.detailDrawer.setAttribute('aria-hidden', 'true');
    this.activeLandmark = null;
  }

  /**
   * Handles map marker selection callback
   */
  onLandmarkSelected(landmarkId) {
    this.searchManager.highlightCard(landmarkId);
  }

  /**
   * Mobile Directory Drawer Controllers
   */
  openMobileSidebar() {
    if (this.sidebar) {
      this.sidebar.classList.add('open');
    }
    if (this.sidebarBackdrop) {
      this.sidebarBackdrop.classList.add('active');
    }
  }

  closeMobileSidebar() {
    if (this.sidebar) {
      this.sidebar.classList.remove('open');
    }
    if (this.sidebarBackdrop) {
      this.sidebarBackdrop.classList.remove('active');
    }
  }

  setupBottomSheetGestures() {
    // Backdrop / touch dismissal for mobile detail drawer
    this.setupDrawerSwipeToDismiss();
  }

  /**
   * Swipe down on mobile building detail drawer to dismiss
   */
  setupDrawerSwipeToDismiss() {
    this.detailDragHandle = document.getElementById('detailDragHandle');
    this.detailDrawerPanel = document.getElementById('detailDrawerPanel');

    if (!this.detailDrawerPanel) return;

    let startY = 0;
    let isDragging = false;

    const onStart = (e) => {
      if (window.innerWidth > 900) return;
      startY = e.touches[0].clientY;
      isDragging = true;
      this.detailDrawerPanel.classList.add('dragging');
    };

    const onMove = (e) => {
      if (!isDragging) return;
      const currentY = e.touches[0].clientY;
      const deltaY = currentY - startY;

      if (deltaY > 0) {
        this.detailDrawerPanel.style.transform = `translateY(${deltaY}px)`;
      }
    };

    const onEnd = (e) => {
      if (!isDragging) return;
      isDragging = false;
      this.detailDrawerPanel.classList.remove('dragging');
      this.detailDrawerPanel.style.transform = '';

      const endY = e.changedTouches[0].clientY;
      const deltaY = endY - startY;

      if (deltaY > 90) {
        this.closeBuildingDetail();
      }
    };

    const dragEl = this.detailDragHandle || this.detailDrawerPanel;
    dragEl.addEventListener('touchstart', onStart, { passive: true });
    dragEl.addEventListener('touchmove', onMove, { passive: true });
    dragEl.addEventListener('touchend', onEnd, { passive: true });
  }

  /**
   * Populates the map legend dynamically with category styles
   */
  populateLegend() {
    if (!this.legendBody) return;

    const legendHtml = Object.values(CATEGORIES).map(cat => `
      <div class="legend-item">
        <span class="legend-dot" style="background-color: ${cat.color};"></span>
        <span>${cat.label}</span>
      </div>
    `).join('');

    this.legendBody.innerHTML = legendHtml;
  }

  /**
   * Updates coordinate inspector readout inputs
   */
  updateInspectorReadout(lat, lng) {
    this.lastPickedCoords = [lat, lng];

    if (this.inspectorLat) this.inspectorLat.value = lat.toFixed(6);
    if (this.inspectorLng) this.inspectorLng.value = lng.toFixed(6);

    if (this.copyCoordsBtn) this.copyCoordsBtn.disabled = false;
    if (this.copyPoiSnippetBtn) this.copyPoiSnippetBtn.disabled = false;
  }

  /**
   * Displays transient toast notification banner
   */
  showToast(message, duration = 3000) {
    if (!this.toastEl) return;

    clearTimeout(this.toastTimeout);
    this.toastMessage.textContent = message;
    this.toastEl.classList.add('show');

    this.toastTimeout = setTimeout(() => {
      this.toastEl.classList.remove('show');
    }, duration);
  }
}

// Instantiate application upon DOM readiness
document.addEventListener('DOMContentLoaded', () => {
  const app = new CampusApp();
  app.init();
});

