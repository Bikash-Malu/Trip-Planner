/**
 * Trip Planner - Dashboard Controller Module
 */

let currentSearchQuery = '';
let currentFilterStatus = 'all';
let currentSortOption = 'newest';
let allTripsCache = [];

/**
 * Initialize Dashboard UI and fetch trips from REST API
 */
async function initDashboard() {
  await loadAndRenderDashboardData();
  setupDashboardEventListeners();
}

/**
 * Fetch trips from API and update Stats + Cards
 */
async function loadAndRenderDashboardData() {
  try {
    allTripsCache = await API.getTrips();
  } catch (err) {
    showToast('Failed to load trips from server', 'error');
    allTripsCache = [];
  }

  renderDashboardStats(allTripsCache);
  renderTripsList();
}

/**
 * Render Top Summary Metrics Bar (Excludes completed trips from top 4 cards)
 */
function renderDashboardStats(trips) {
  let activeTripsCount = 0;
  let totalBudgetSum = 0;
  let totalCollectedSum = 0;
  let totalPendingSum = 0;

  trips.forEach(trip => {
    const statusObj = getTripStatus(trip.startDate, trip.endDate);
    const isCompleted = statusObj.label === 'Completed';

    // Exclude completed trips from the 4 top metric cards
    if (!isCompleted) {
      activeTripsCount++;
      const summary = calculateTripSummary(trip);
      totalBudgetSum += summary.totalBudget;
      totalCollectedSum += summary.totalPaid;
      totalPendingSum += summary.totalPending;
    }
  });

  const totalTripsEl = document.getElementById('total-trips-count');
  const totalBudgetEl = document.getElementById('total-budget-sum');
  const totalCollectedEl = document.getElementById('total-collected-sum');
  const totalPendingEl = document.getElementById('total-pending-sum');

  if (totalTripsEl) totalTripsEl.textContent = activeTripsCount;
  if (totalBudgetEl) totalBudgetEl.textContent = formatCurrency(totalBudgetSum);
  if (totalCollectedEl) totalCollectedEl.textContent = formatCurrency(totalCollectedSum);
  if (totalPendingEl) totalPendingEl.textContent = formatCurrency(totalPendingSum);
}

/**
 * Filter, Sort, and Render Trips Grid
 */
function renderTripsList() {
  const container = document.getElementById('trips-grid');
  const emptyState = document.getElementById('empty-trips-state');

  if (!container) return;

  let trips = [...allTripsCache];

  // 1. Filter by Search Query
  if (currentSearchQuery.trim() !== '') {
    const query = currentSearchQuery.toLowerCase().trim();
    trips = trips.filter(trip => {
      const nameMatch = (trip.name || '').toLowerCase().includes(query);
      const personMatch = (trip.people || []).some(p => (p.name || '').toLowerCase().includes(query));
      return nameMatch || personMatch;
    });
  }

  // 2. Filter by Status / Budget
  if (currentFilterStatus !== 'all') {
    trips = trips.filter(trip => {
      const statusObj = getTripStatus(trip.startDate, trip.endDate);
      const summary = calculateTripSummary(trip);

      if (currentFilterStatus === 'active') {
        return statusObj.label === 'Active' || statusObj.label === 'Upcoming';
      } else if (currentFilterStatus === 'completed') {
        return statusObj.label === 'Completed' || summary.isFullyPaid;
      } else if (currentFilterStatus === 'overbudget') {
        return summary.totalPaid > summary.totalBudget;
      }
      return true;
    });
  }

  // 3. Sort Trips
  trips.sort((a, b) => {
    switch (currentSortOption) {
      case 'newest':
        return new Date(b.startDate || 0) - new Date(a.startDate || 0);
      case 'oldest':
        return new Date(a.startDate || 0) - new Date(b.startDate || 0);
      case 'budget-desc':
      case 'budget_desc':
        return (parseFloat(b.budget) || 0) - (parseFloat(a.budget) || 0);
      case 'budget-asc':
      case 'budget_asc':
        return (parseFloat(a.budget) || 0) - (parseFloat(b.budget) || 0);
      default:
        return 0;
    }
  });

  // Empty Data Check
  if (trips.length === 0) {
    container.innerHTML = '';
    if (emptyState) emptyState.classList.remove('hidden');
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');

  // Render cards
  let cardsHtml = '';
  trips.forEach(trip => {
    cardsHtml += renderTripCardHtml(trip);
  });

  container.innerHTML = cardsHtml;

  // Delete trip handlers
  container.querySelectorAll('.btn-delete-trip').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const tripId = btn.getAttribute('data-id');
      const tripName = btn.getAttribute('data-name');
      confirmDeleteTrip(tripId, tripName);
    });
  });
}

/**
 * Generate Trip Card HTML string
 */
function renderTripCardHtml(trip) {
  const summary = calculateTripSummary(trip);
  const status = getTripStatus(trip.startDate, trip.endDate);
  const thumbnailSrc = trip.thumbnail || getDefaultThumbnail(trip.name);

  const adminControls = isAdmin() ? `
    <a href="edit-trip.html?id=${trip.id}" class="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all" title="Edit Trip">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
    </a>
    <button type="button" data-id="${trip.id}" data-name="${escapeHtml(trip.name)}" class="btn-delete-trip p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all" title="Delete Trip">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
    </button>
  ` : '';

  return `
    <div class="trip-card bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-xl transition-all duration-300">
      <div>
        <!-- Card Image & Status Badge -->
        <div class="relative aspect-video w-full overflow-hidden bg-slate-900">
          <img src="${escapeHtml(thumbnailSrc)}" alt="${escapeHtml(trip.name)}" class="w-full h-full object-cover object-center transition-transform duration-500 hover:scale-105 opacity-90" onerror="this.src='${getDefaultThumbnail(trip.name)}'">
          <div class="absolute top-3 right-3">
            <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold shadow-md backdrop-blur-md ${status.badgeClass}">
              ${status.label}
            </span>
          </div>
        </div>

        <!-- Card Body -->
        <div class="p-6 space-y-4">
          <div>
            <h3 class="text-lg font-extrabold text-slate-900 line-clamp-1 tracking-tight">${escapeHtml(trip.name)}</h3>
            <p class="text-xs font-semibold text-slate-500 mt-1 flex items-center gap-1.5">
              <svg class="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
              <span>${formatDateRange(trip.startDate, trip.endDate)}</span>
            </p>
          </div>

          <!-- Budget & Split Specs -->
          <div class="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <div>
              <span class="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Total Budget</span>
              <p class="text-sm font-black text-indigo-600">${formatCurrency(summary.totalBudget)}</p>
            </div>
            <div>
              <span class="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Per Person</span>
              <p class="text-sm font-black text-slate-800">${formatCurrency(summary.equalShare)}</p>
            </div>
          </div>

          <!-- Progress & Headcount -->
          <div>
            <div class="flex justify-between items-center text-xs font-bold mb-1.5">
              <span class="text-slate-600 flex items-center gap-1.5">
                <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                ${summary.numPeople} ${summary.numPeople === 1 ? 'Person' : 'People'}
              </span>
              <span class="text-indigo-600 font-extrabold">${summary.progressPercent}% Funded</span>
            </div>
            
            <div class="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
              <div class="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-500 rounded-full" style="width: ${summary.progressPercent}%"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Card Footer -->
      <div class="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
        <a href="trip-details.html?id=${trip.id}" class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-all">
          <span>View Details</span>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
        </a>
        
        <div class="flex items-center gap-1">
          ${adminControls}
        </div>
      </div>
    </div>
  `;
}

/**
 * Confirm delete trip modal
 */
function confirmDeleteTrip(id, name) {
  const modal = document.getElementById('delete-trip-modal');
  const titleEl = document.getElementById('modal-trip-title');
  const confirmBtn = document.getElementById('confirm-delete-btn');
  const cancelBtn = document.getElementById('cancel-delete-btn');

  if (!modal) return;

  if (titleEl) titleEl.textContent = `"${name}"`;

  modal.classList.remove('hidden');
  setTimeout(() => modal.classList.add('show'), 10);

  const closeModal = () => {
    modal.classList.remove('show');
    setTimeout(() => modal.classList.add('hidden'), 250);
  };

  if (cancelBtn) cancelBtn.onclick = closeModal;

  if (confirmBtn) {
    confirmBtn.onclick = async () => {
      try {
        await API.deleteTrip(id);
        showToast('Trip deleted successfully from data.json', 'success');
        closeModal();
        await loadAndRenderDashboardData();
      } catch (err) {
        showToast(err.message || 'Failed to delete trip', 'error');
      }
    };
  }
}

/**
 * Setup Listeners for Search, Tabs, and Sorting
 */
function setupDashboardEventListeners() {
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentSearchQuery = e.target.value;
      renderTripsList();
    });
  }

  const filterBtns = document.querySelectorAll('.filter-tab');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => {
        b.classList.remove('bg-white', 'text-indigo-600', 'shadow-sm');
        b.classList.add('text-slate-600');
      });

      btn.classList.remove('text-slate-600');
      btn.classList.add('bg-white', 'text-indigo-600', 'shadow-sm');

      currentFilterStatus = btn.getAttribute('data-filter') || 'all';
      renderTripsList();
    });
  });

  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      currentSortOption = e.target.value;
      renderTripsList();
    });
  }
}
