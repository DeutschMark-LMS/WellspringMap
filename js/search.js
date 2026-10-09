/**
 * Campus Search & Category Filter Module
 * Manages search inputs, category chip pills, directory listings, and marker synchronization.
 */

class CampusSearch {
  constructor(mapManager) {
    this.mapManager = mapManager;
    this.activeCategory = 'all';
    this.searchQuery = '';
    this.filteredLandmarks = [...CAMPUS_LANDMARKS];

    // DOM Elements
    this.searchInput = document.getElementById('searchInput');
    this.searchClearBtn = document.getElementById('searchClearBtn');
    this.categoryChipsList = document.getElementById('categoryChipsList');
    this.poiList = document.getElementById('poiList');
    this.resultsCountText = document.getElementById('resultsCountText');
    this.resetFiltersBtn = document.getElementById('resetFiltersBtn');
    this.emptyState = document.getElementById('emptyState');
    this.clearSearchStateBtn = document.getElementById('clearSearchStateBtn');
  }

  /**
   * Initializes search and category filter UI listeners
   */
  init() {
    this.renderCategoryChips();
    this.attachEventListeners();
    this.filterAndRender();
    return this;
  }

  /**
   * Dynamically renders category chips with accurate POI counts
   */
  renderCategoryChips() {
    // Count per category
    const counts = { all: CAMPUS_LANDMARKS.length };
    Object.keys(CATEGORIES).forEach(catKey => {
      counts[catKey] = CAMPUS_LANDMARKS.filter(l => l.category === catKey).length;
    });

    // Update 'All' chip count
    const countAllEl = document.getElementById('count-all');
    if (countAllEl) countAllEl.textContent = counts.all;

    // Generate remaining category chips
    let chipsHtml = `
      <button class="filter-chip active" data-category="all" role="tab" aria-selected="true">
        <i data-lucide="layout-grid"></i>
        <span>All</span>
        <span class="chip-count">${counts.all}</span>
      </button>
    `;

    Object.entries(CATEGORIES).forEach(([key, meta]) => {
      chipsHtml += `
        <button class="filter-chip" data-category="${key}" role="tab" aria-selected="false">
          <i data-lucide="${meta.icon}"></i>
          <span>${meta.label}</span>
          <span class="chip-count">${counts[key] || 0}</span>
        </button>
      `;
    });

    this.categoryChipsList.innerHTML = chipsHtml;
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  /**
   * Attaches event listeners for real-time input and chip clicks
   */
  attachEventListeners() {
    // Search input typing
    this.searchInput.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.trim().toLowerCase();
      this.searchClearBtn.classList.toggle('visible', this.searchQuery.length > 0);
      this.filterAndRender();
    });

    // Search clear button
    this.searchClearBtn.addEventListener('click', () => {
      this.searchInput.value = '';
      this.searchQuery = '';
      this.searchClearBtn.classList.remove('visible');
      this.filterAndRender();
      this.searchInput.focus();
    });

    // Empty state reset button
    if (this.clearSearchStateBtn) {
      this.clearSearchStateBtn.addEventListener('click', () => {
        this.resetAllFilters();
      });
    }

    // Reset filters button
    if (this.resetFiltersBtn) {
      this.resetFiltersBtn.addEventListener('click', () => {
        this.resetAllFilters();
      });
    }

    // Category chips click delegation
    this.categoryChipsList.addEventListener('click', (e) => {
      const chip = e.target.closest('.filter-chip');
      if (!chip) return;

      const category = chip.getAttribute('data-category');
      this.setCategory(category);
    });
  }

  /**
   * Sets active category filter
   */
  setCategory(categoryKey) {
    this.activeCategory = categoryKey;

    // Update active class on chips
    const chips = this.categoryChipsList.querySelectorAll('.filter-chip');
    chips.forEach(chip => {
      const isSelected = chip.getAttribute('data-category') === categoryKey;
      chip.classList.toggle('active', isSelected);
      chip.setAttribute('aria-selected', isSelected ? 'true' : 'false');
    });

    this.filterAndRender();
  }

  /**
   * Resets all search queries and filters to default
   */
  resetAllFilters() {
    this.searchQuery = '';
    this.activeCategory = 'all';
    this.searchInput.value = '';
    this.searchClearBtn.classList.remove('visible');

    // Reset active chip
    const chips = this.categoryChipsList.querySelectorAll('.filter-chip');
    chips.forEach(chip => {
      const isAll = chip.getAttribute('data-category') === 'all';
      chip.classList.toggle('active', isAll);
      chip.setAttribute('aria-selected', isAll ? 'true' : 'false');
    });

    this.filterAndRender();
  }

  /**
   * Filters landmarks array by active query and category, then updates UI & Map pins
   */
  filterAndRender() {
    this.filteredLandmarks = CAMPUS_LANDMARKS.filter(landmark => {
      // 1. Category check
      const matchesCategory = (this.activeCategory === 'all') || (landmark.category === this.activeCategory);
      if (!matchesCategory) return false;

      // 2. Query check (Name, Code, Description, Facilities, Category Label)
      if (!this.searchQuery) return true;

      const catLabel = (CATEGORIES[landmark.category]?.label || '').toLowerCase();
      const nameMatch = landmark.name.toLowerCase().includes(this.searchQuery);
      const codeMatch = landmark.code.toLowerCase().includes(this.searchQuery);
      const descMatch = landmark.description.toLowerCase().includes(this.searchQuery);
      const catMatch = catLabel.includes(this.searchQuery);
      const facilityMatch = landmark.facilities.some(f => f.toLowerCase().includes(this.searchQuery));

      return nameMatch || codeMatch || descMatch || catMatch || facilityMatch;
    });

    // Update count labels and reset button
    const hasActiveFilters = (this.searchQuery.length > 0) || (this.activeCategory !== 'all');
    if (this.resetFiltersBtn) {
      this.resetFiltersBtn.style.display = hasActiveFilters ? 'block' : 'none';
    }

    if (this.resultsCountText) {
      if (hasActiveFilters) {
        this.resultsCountText.textContent = `${this.filteredLandmarks.length} result${this.filteredLandmarks.length === 1 ? '' : 's'} found`;
      } else {
        this.resultsCountText.textContent = `Showing all ${CAMPUS_LANDMARKS.length} locations`;
      }
    }

    // Render cards
    this.renderLandmarkCards();

    // Synchronize Map Marker visibility
    const visibleIds = this.filteredLandmarks.map(l => l.id);
    this.mapManager.filterMarkers(visibleIds);

    // Toggle empty state
    if (this.emptyState) {
      this.emptyState.style.display = this.filteredLandmarks.length === 0 ? 'flex' : 'none';
    }
  }

  /**
   * Generates POI card elements in the sidebar
   */
  renderLandmarkCards() {
    if (this.filteredLandmarks.length === 0) {
      this.poiList.innerHTML = '';
      return;
    }

    const cardsHtml = this.filteredLandmarks.map(landmark => {
      const catMeta = CATEGORIES[landmark.category] || CATEGORIES.administrative;
      const isSelected = landmark.id === this.mapManager.selectedMarkerId;
      
      // Calculate live distance if user position is known
      let distanceBadge = '';
      if (window.campusNavigation && window.campusNavigation.userLocation) {
        const distMeters = window.campusNavigation.calculateDistance(
          window.campusNavigation.userLocation,
          landmark.coords
        );
        const distStr = distMeters >= 1000 
          ? `${(distMeters / 1000).toFixed(1)} km` 
          : `${Math.round(distMeters)} m`;
        const walkMin = Math.max(1, Math.round(distMeters / 80));
        distanceBadge = `
          <span class="poi-card-distance" title="${distStr} (~${walkMin} min walk)">
            <i data-lucide="footprints" style="width:13px;height:13px;"></i>
            ${distStr} &bull; ${walkMin}m
          </span>
        `;
      }

      const topFacilities = landmark.facilities.slice(0, 3).map(f => 
        `<span class="amenity-chip-tiny">${f}</span>`
      ).join('');

      return `
        <article 
          class="poi-card ${isSelected ? 'active-selected' : ''}" 
          data-id="${landmark.id}" 
          style="--card-color: ${catMeta.color};"
          tabindex="0"
          role="button"
          aria-label="${landmark.name}, ${catMeta.label}"
        >
          <div class="poi-card-header">
            <div class="poi-card-title-group">
              <h3 class="poi-card-name">${landmark.name}</h3>
              <span class="poi-card-code">${landmark.code}</span>
            </div>
            <span class="poi-category-badge" style="background:${catMeta.bgLight};color:${catMeta.color};">
              ${catMeta.label}
            </span>
          </div>

          <p class="poi-card-desc">${landmark.description}</p>

          <div class="poi-card-meta">
            <div class="poi-card-facilities-preview">
              ${topFacilities}
            </div>
            ${distanceBadge}
          </div>
        </article>
      `;
    }).join('');

    this.poiList.innerHTML = cardsHtml;

    // Attach card click handlers
    const cardElements = this.poiList.querySelectorAll('.poi-card');
    cardElements.forEach(card => {
      const landmarkId = card.getAttribute('data-id');
      
      const selectCard = () => {
        const landmark = CAMPUS_LANDMARKS.find(l => l.id === landmarkId);
        if (!landmark) return;

        // Highlight card
        cardElements.forEach(c => c.classList.remove('active-selected'));
        card.classList.add('active-selected');

        // Select marker & fly to coordinate
        this.mapManager.selectMarker(landmarkId);
        this.mapManager.flyToLocation(landmark.coords, 17);

        // Open detailed drawer
        if (window.campusApp) {
          window.campusApp.openBuildingDetail(landmarkId);
        }
      };

      card.addEventListener('click', selectCard);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectCard();
        }
      });
    });

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  /**
   * Highlights a specific card in the sidebar when marker is clicked on the map
   */
  highlightCard(landmarkId) {
    const cards = this.poiList.querySelectorAll('.poi-card');
    cards.forEach(card => {
      if (card.getAttribute('data-id') === landmarkId) {
        card.classList.add('active-selected');
        card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        card.classList.remove('active-selected');
      }
    });
  }
}

