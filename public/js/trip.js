/**
 * Trip Planner - Trip Operations & Details Controller Module
 */

let currentTripData = null;
let currentThumbnailBase64 = '';

/**
 * Initialize Create / Edit Trip Form Page
 */
async function initTripForm(isEditMode = false) {
  const urlParams = new URLSearchParams(window.location.search);
  const tripId = urlParams.get('id');

  const formTitleEl = document.getElementById('trip-form-title');
  const submitBtnEl = document.getElementById('btn-submit-trip');

  if (isEditMode) {
    if (!tripId) {
      showToast('No trip ID provided for editing', 'error');
      window.location.href = 'dashboard.html';
      return;
    }

    try {
      currentTripData = await API.getTripById(tripId);
    } catch (err) {
      showToast('Trip not found', 'error');
      window.location.href = 'dashboard.html';
      return;
    }

    if (formTitleEl) formTitleEl.textContent = 'Edit Trip';
    if (submitBtnEl) submitBtnEl.innerHTML = `
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
      Save Changes
    `;

    populateTripFormFields(currentTripData);
  } else {
    // Create Mode: Start completely clean
    if (formTitleEl) formTitleEl.textContent = 'Create New Trip';
    if (submitBtnEl) submitBtnEl.innerHTML = `
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
      Create Trip
    `;

    renderPeopleInputs([]);
  }

  setupTripFormListeners(isEditMode);
  updateLiveEqualShareCalculation();
}

/**
 * Populate form inputs in Edit mode
 */
function populateTripFormFields(trip) {
  const nameInput = document.getElementById('trip-name');
  const startDateInput = document.getElementById('trip-start-date');
  const endDateInput = document.getElementById('trip-end-date');
  const budgetInput = document.getElementById('trip-budget');
  const previewImg = document.getElementById('image-preview');
  const previewContainer = document.getElementById('preview-container');

  if (nameInput) nameInput.value = trip.name || '';
  if (startDateInput) startDateInput.value = trip.startDate || '';
  if (endDateInput) endDateInput.value = trip.endDate || '';
  if (budgetInput) budgetInput.value = trip.budget || '';

  if (trip.thumbnail) {
    currentThumbnailBase64 = trip.thumbnail;
    if (previewImg) previewImg.src = trip.thumbnail;
    if (previewContainer) previewContainer.classList.remove('hidden');
  }

  renderPeopleInputs(trip.people || []);
}

/**
 * Dynamically render rows of person input fields
 */
function renderPeopleInputs(peopleList = []) {
  const container = document.getElementById('people-inputs-container');
  if (!container) return;

  container.innerHTML = '';

  const listToRender = peopleList.length > 0 ? peopleList : [{ id: 1, name: '', paid: 0 }];

  listToRender.forEach((person, index) => {
    addPersonRow(person.name || '', person.id || (index + 1), person.paid || 0);
  });

  updateLiveEqualShareCalculation();
}

/**
 * Add a single person row to the form
 */
function addPersonRow(name = '', personId = null, paid = 0) {
  const container = document.getElementById('people-inputs-container');
  if (!container) return;

  const id = personId || Date.now() + Math.floor(Math.random() * 1000);
  const rowIndex = container.children.length + 1;

  const rowDiv = document.createElement('div');
  rowDiv.className = 'person-input-row flex items-center gap-3 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80';
  rowDiv.setAttribute('data-id', id);
  rowDiv.setAttribute('data-paid', paid);

  rowDiv.innerHTML = `
    <span class="row-number w-7 h-7 flex items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-900/40 text-xs font-bold text-indigo-600 dark:text-indigo-400">
      ${rowIndex}
    </span>
    <input type="text" class="person-name-input flex-1 px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" placeholder="Enter person name..." value="${escapeHtml(name)}">
    <button type="button" class="btn-remove-person p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Remove Person">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
    </button>
  `;

  container.appendChild(rowDiv);

  const nameInput = rowDiv.querySelector('.person-name-input');
  nameInput.addEventListener('input', updateLiveEqualShareCalculation);

  rowDiv.querySelector('.btn-remove-person').addEventListener('click', () => {
    const paidAmount = parseFloat(rowDiv.getAttribute('data-paid')) || 0;
    const personName = nameInput.value.trim() || 'This person';

    if (container.children.length <= 1) {
      showToast('A trip must have at least one person.', 'warning');
      return;
    }

    if (paidAmount > 0) {
      showModal({
        title: 'Remove Person?',
        message: `${personName} has existing payment information (${formatCurrency(paidAmount)}). Are you sure you want to remove them?`,
        confirmText: 'Remove',
        cancelText: 'Cancel',
        confirmClass: 'bg-red-600 hover:bg-red-700 text-white',
        onConfirm: () => {
          rowDiv.remove();
          reindexPeopleRows();
          updateLiveEqualShareCalculation();
        }
      });
    } else {
      rowDiv.remove();
      reindexPeopleRows();
      updateLiveEqualShareCalculation();
    }
  });

  reindexPeopleRows();
  updateLiveEqualShareCalculation();
}

function reindexPeopleRows() {
  const container = document.getElementById('people-inputs-container');
  if (!container) return;

  const rows = container.querySelectorAll('.person-input-row');
  rows.forEach((row, idx) => {
    const numSpan = row.querySelector('.row-number');
    if (numSpan) numSpan.textContent = idx + 1;
  });

  const countBadge = document.getElementById('people-count-badge');
  if (countBadge) countBadge.textContent = `${rows.length} ${rows.length === 1 ? 'person' : 'people'}`;
}

function updateLiveEqualShareCalculation() {
  const budgetInput = document.getElementById('trip-budget');
  const container = document.getElementById('people-inputs-container');
  const equalShareDisplay = document.getElementById('calc-equal-share-display');
  const totalPeopleDisplay = document.getElementById('calc-total-people-display');

  if (!budgetInput || !container || !equalShareDisplay) return;

  const budget = parseFloat(budgetInput.value) || 0;
  const numPeople = container.querySelectorAll('.person-input-row').length;

  const equalShare = calculateEqualShare(budget, numPeople);

  if (totalPeopleDisplay) totalPeopleDisplay.textContent = numPeople;
  equalShareDisplay.textContent = formatCurrency(equalShare) + ' / person';
}

function setupTripFormListeners(isEditMode) {
  const budgetInput = document.getElementById('trip-budget');
  if (budgetInput) {
    budgetInput.addEventListener('input', updateLiveEqualShareCalculation);
  }

  const addPersonBtn = document.getElementById('btn-add-person');
  if (addPersonBtn) {
    addPersonBtn.addEventListener('click', () => {
      addPersonRow('', null, 0);
    });
  }

  const imageInput = document.getElementById('trip-thumbnail-input');
  const previewImg = document.getElementById('image-preview');
  const previewContainer = document.getElementById('preview-container');
  const removeImgBtn = document.getElementById('btn-remove-image');

  if (imageInput) {
    imageInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (!file.type.match(/^image\/(jpeg|jpg|png|webp)$/i)) {
        showToast('Please select a valid image file (JPG, PNG, or WEBP).', 'error');
        imageInput.value = '';
        return;
      }

      try {
        const base64 = await compressImage(file, 900, 500, 0.8);
        currentThumbnailBase64 = base64;

        if (previewImg) previewImg.src = base64;
        if (previewContainer) previewContainer.classList.remove('hidden');
        showToast('Image uploaded and previewed successfully', 'success');
      } catch (err) {
        showToast('Failed to process image file.', 'error');
      }
    });
  }

  if (removeImgBtn) {
    removeImgBtn.addEventListener('click', () => {
      currentThumbnailBase64 = '';
      if (imageInput) imageInput.value = '';
      if (previewContainer) previewContainer.classList.add('hidden');
    });
  }

  const form = document.getElementById('trip-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      handleTripFormSubmit(isEditMode);
    });
  }
}

async function handleTripFormSubmit(isEditMode) {
  const nameInput = document.getElementById('trip-name');
  const startDateInput = document.getElementById('trip-start-date');
  const endDateInput = document.getElementById('trip-end-date');
  const budgetInput = document.getElementById('trip-budget');
  const container = document.getElementById('people-inputs-container');

  const name = nameInput.value.trim();
  const startDate = startDateInput.value;
  const endDate = endDateInput.value;
  const budget = parseFloat(budgetInput.value);

  document.querySelectorAll('.error-msg').forEach(el => el.textContent = '');

  let isValid = true;

  if (!name) {
    showFieldError('err-trip-name', 'Trip name is required.');
    isValid = false;
  }

  if (!startDate) {
    showFieldError('err-start-date', 'Start date is required.');
    isValid = false;
  }
  if (!endDate) {
    showFieldError('err-end-date', 'End date is required.');
    isValid = false;
  }

  if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
    showFieldError('err-end-date', 'End date cannot be earlier than start date.');
    isValid = false;
  }

  if (isNaN(budget) || budget <= 0) {
    showFieldError('err-trip-budget', 'Please enter a valid total budget greater than ₹0.');
    isValid = false;
  }

  const personRows = container.querySelectorAll('.person-input-row');
  if (personRows.length === 0) {
    showFieldError('err-people', 'At least one person must be added to the trip.');
    isValid = false;
  }

  const people = [];
  const nameSet = new Set();
  let hasDuplicateName = false;
  let hasEmptyName = false;

  personRows.forEach(row => {
    const id = row.getAttribute('data-id');
    const paid = parseFloat(row.getAttribute('data-paid')) || 0;
    const nameVal = row.querySelector('.person-name-input').value.trim();

    if (!nameVal) {
      hasEmptyName = true;
    } else {
      const lowerName = nameVal.toLowerCase();
      if (nameSet.has(lowerName)) {
        hasDuplicateName = true;
      }
      nameSet.add(lowerName);
    }

    people.push({
      id: parseInt(id, 10) || id,
      name: nameVal,
      paid: paid
    });
  });

  if (hasEmptyName) {
    showFieldError('err-people', 'All person names must be filled out.');
    isValid = false;
  }

  if (hasDuplicateName) {
    showFieldError('err-people', 'Duplicate person names are not allowed.');
    isValid = false;
  }

  if (!isValid) return;

  const tripPayload = {
    name: name,
    thumbnail: currentThumbnailBase64,
    startDate: startDate,
    endDate: endDate,
    budget: budget,
    people: people
  };

  try {
    if (isEditMode && currentTripData) {
      await API.updateTrip(currentTripData.id, tripPayload);
      showToast('Trip updated successfully in data.json!', 'success');
    } else {
      await API.createTrip(tripPayload);
      showToast('Trip created successfully in data.json!', 'success');
    }

    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 600);
  } catch (err) {
    showToast(err.message || 'Failed to save trip to data.json', 'error');
  }
}

function showFieldError(elementId, message) {
  const el = document.getElementById(elementId);
  if (el) el.textContent = message;
}

/**
 * Initialize Trip Details Page Controller
 */
async function initTripDetailsPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const tripId = urlParams.get('id');

  if (!tripId) {
    showToast('No trip ID provided', 'error');
    window.location.href = 'dashboard.html';
    return;
  }

  try {
    currentTripData = await API.getTripById(tripId);
    renderTripDetailsUI(currentTripData);
  } catch (err) {
    showToast('Trip not found', 'error');
    window.location.href = 'dashboard.html';
  }
}

/**
 * Render complete Trip Details screen
 */
function renderTripDetailsUI(trip) {
  const summary = calculateTripSummary(trip);
  const status = getTripStatus(trip.startDate, trip.endDate);

  const titleEl = document.getElementById('details-trip-title');
  const dateEl = document.getElementById('details-trip-date');
  const statusEl = document.getElementById('details-trip-status');
  const thumbnailImg = document.getElementById('details-trip-thumbnail');

  if (titleEl) titleEl.textContent = trip.name;
  if (dateEl) dateEl.textContent = formatDateRange(trip.startDate, trip.endDate);

  if (statusEl) {
    statusEl.textContent = status.label;
    statusEl.className = `inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md ${status.badgeClass}`;
  }

  if (thumbnailImg) {
    thumbnailImg.src = trip.thumbnail || getDefaultThumbnail(trip.name);
    thumbnailImg.alt = trip.name;
    thumbnailImg.onerror = () => {
      thumbnailImg.src = getDefaultThumbnail(trip.name);
    };
  }

  const totalBudgetEl = document.getElementById('details-total-budget');
  const totalPeopleEl = document.getElementById('details-total-people');
  const perPersonEl = document.getElementById('details-per-person');
  const totalPaidEl = document.getElementById('details-total-paid');
  const totalPendingEl = document.getElementById('details-total-pending');
  const progressBarEl = document.getElementById('details-progress-bar');
  const progressTextEl = document.getElementById('details-progress-text');

  if (totalBudgetEl) totalBudgetEl.textContent = formatCurrency(summary.totalBudget);
  if (totalPeopleEl) totalPeopleEl.textContent = summary.numPeople;
  if (perPersonEl) perPersonEl.textContent = formatCurrency(summary.equalShare);
  if (totalPaidEl) totalPaidEl.textContent = formatCurrency(summary.totalPaid);
  if (totalPendingEl) totalPendingEl.textContent = formatCurrency(summary.totalPending);

  if (progressBarEl) progressBarEl.style.width = `${summary.progressPercent}%`;
  if (progressTextEl) progressTextEl.textContent = `${summary.progressPercent}% Paid`;

  const editLink = document.getElementById('details-edit-link');
  if (editLink) {
    if (isAdmin()) {
      editLink.href = `edit-trip.html?id=${trip.id}`;
      editLink.style.display = 'inline-flex';
    } else {
      editLink.style.display = 'none';
    }
  }

  renderPaymentTable(trip);

  const resetBtn = document.getElementById('btn-reset-payments');
  if (resetBtn) {
    if (isAdmin()) {
      resetBtn.style.display = 'inline-flex';
      resetBtn.onclick = () => confirmResetPayments(trip.id);
    } else {
      resetBtn.style.display = 'none';
    }
  }
}

/**
 * Render Payment Table (Desktop Table + Mobile Cards with Progress Bars)
 */
/**
 * Render Payment Table (Desktop Table + Mobile Cards with High-Contrast Typography)
 */
function renderPaymentTable(trip) {
  const tbody = document.getElementById('payment-table-tbody');
  const mobileContainer = document.getElementById('payment-cards-mobile');

  const equalShare = calculateEqualShare(trip.budget, (trip.people || []).length);
  let rowsHtml = '';
  let cardsHtml = '';

  (trip.people || []).forEach((person, index) => {
    const paid = parseFloat(person.paid) || 0;
    const pending = calculatePending(equalShare, paid);
    const statusObj = calculatePaymentStatus(paid, equalShare);
    const personPercent = equalShare > 0 ? Math.min(100, Math.round((paid / equalShare) * 100)) : 0;

    const paidInputOrTextDesktop = isAdmin() ? `
      <div class="relative max-w-[150px]">
        <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-xs text-slate-500 font-bold pointer-events-none">₹</span>
        <input type="number" step="any" min="0" max="${equalShare}" data-person-id="${person.id}" class="paid-amount-input w-full pl-7 pr-3 py-2 text-sm font-extrabold bg-white border border-slate-300 rounded-xl text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-600 transition-all" value="${paid}">
      </div>
    ` : `
      <span class="font-extrabold text-slate-900 text-sm">${formatCurrency(paid)}</span>
    `;

    const paidInputOrTextMobile = isAdmin() ? `
      <div class="relative w-full">
        <span class="absolute inset-y-0 left-0 pl-2.5 flex items-center text-xs text-slate-500 font-bold pointer-events-none">₹</span>
        <input type="number" step="any" min="0" max="${equalShare}" data-person-id="${person.id}" class="paid-amount-input w-full pl-6 pr-2 py-1.5 text-xs font-extrabold bg-white border border-slate-300 rounded-lg text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-600" value="${paid}">
      </div>
    ` : `
      <span class="font-extrabold text-slate-900 text-xs">${formatCurrency(paid)}</span>
    `;

    const rowBg = index % 2 === 0 ? 'bg-white' : 'bg-slate-50/70';

    // 1. Desktop Table Row
    rowsHtml += `
      <tr class="${rowBg} hover:bg-indigo-50/50 transition-colors border-b border-slate-200/80" data-person-id="${person.id}">
        <td class="px-6 py-4 font-bold text-slate-900">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-black text-xs flex items-center justify-center shadow-sm">
              ${escapeHtml(person.name.substring(0, 2).toUpperCase())}
            </div>
            <span class="text-sm font-extrabold text-slate-900">${escapeHtml(person.name)}</span>
          </div>
        </td>
        <td class="px-6 py-4 font-bold text-slate-800 text-sm">
          ${formatCurrency(equalShare)}
        </td>
        <td class="px-6 py-4">
          ${paidInputOrTextDesktop}
        </td>
        <td class="px-6 py-4 font-black text-amber-700 text-sm pending-cell">
          ${formatCurrency(pending)}
        </td>
        <td class="px-6 py-4">
          <div class="flex flex-col gap-1.5 min-w-[150px]">
            <div class="flex items-center justify-between gap-2">
              <span class="status-badge inline-flex items-center px-3 py-0.5 rounded-full text-xs ${statusObj.badgeClass}">
                ${statusObj.status}
              </span>
              <span class="person-progress-text text-xs font-black text-slate-700">${personPercent}%</span>
            </div>
            <div class="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
              <div class="person-progress-bar h-full transition-all duration-300 rounded-full ${personPercent === 100 ? 'bg-emerald-500' : (personPercent > 0 ? 'bg-amber-500' : 'bg-slate-300')}" style="width: ${personPercent}%"></div>
            </div>
          </div>
        </td>
      </tr>
    `;

    // 2. Mobile Participant Card
    cardsHtml += `
      <div class="person-payment-card bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3" data-person-id="${person.id}">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2.5 font-bold text-slate-900">
            <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-black text-xs flex items-center justify-center">
              ${escapeHtml(person.name.substring(0, 2).toUpperCase())}
            </div>
            <span class="text-sm font-extrabold">${escapeHtml(person.name)}</span>
          </div>
          <span class="status-badge inline-flex items-center px-2.5 py-0.5 rounded-full text-xs ${statusObj.badgeClass}">
            ${statusObj.status}
          </span>
        </div>

        <div class="space-y-1">
          <div class="flex justify-between text-xs font-bold">
            <span class="text-slate-500">Payment Progress</span>
            <span class="person-progress-text text-indigo-600 font-extrabold">${personPercent}%</span>
          </div>
          <div class="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
            <div class="person-progress-bar h-full transition-all duration-300 rounded-full ${personPercent === 100 ? 'bg-emerald-500' : (personPercent > 0 ? 'bg-amber-500' : 'bg-slate-300')}" style="width: ${personPercent}%"></div>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-xs items-center">
          <div>
            <span class="text-[10px] uppercase font-bold text-slate-400 block">Equal Share</span>
            <span class="font-extrabold text-slate-800">${formatCurrency(equalShare)}</span>
          </div>
          <div>
            <span class="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Paid</span>
            ${paidInputOrTextMobile}
          </div>
          <div>
            <span class="text-[10px] uppercase font-bold text-slate-400 block">Pending</span>
            <span class="font-black text-amber-700 pending-cell">${formatCurrency(pending)}</span>
          </div>
        </div>
      </div>
    `;
  });

  if (tbody) tbody.innerHTML = rowsHtml;
  if (mobileContainer) mobileContainer.innerHTML = cardsHtml;

  if (isAdmin()) {
    document.querySelectorAll('.paid-amount-input').forEach(input => {
      input.addEventListener('input', (e) => {
        handlePaidInputChange(e.target, trip);
      });
      input.addEventListener('change', async (e) => {
        const personId = e.target.getAttribute('data-person-id');
        const paidVal = parseFloat(e.target.value) || 0;
        try {
          await API.updatePayment(trip.id, personId, paidVal);
          showToast('Payment updated and saved successfully', 'success');
        } catch (err) {
          showToast('Failed to update payment on server', 'error');
        }
      });
    });
  }
}

/**
 * Handle input event on Paid amount inputs
 */
function handlePaidInputChange(inputEl, trip) {
  const personId = inputEl.getAttribute('data-person-id');
  const equalShare = calculateEqualShare(trip.budget, (trip.people || []).length);

  let newPaid = parseFloat(inputEl.value);

  if (isNaN(newPaid) || newPaid < 0) {
    newPaid = 0;
  }

  if (newPaid > equalShare) {
    newPaid = equalShare;
    inputEl.value = equalShare;
  }

  document.querySelectorAll(`.paid-amount-input[data-person-id="${personId}"]`).forEach(inp => {
    if (inp !== inputEl) inp.value = newPaid;
  });

  const person = (trip.people || []).find(p => p.id === parseInt(personId, 10) || p.id === String(personId));
  if (person) {
    person.paid = newPaid;
  }

  const pending = calculatePending(equalShare, newPaid);
  const statusObj = calculatePaymentStatus(newPaid, equalShare);
  const personPercent = equalShare > 0 ? Math.min(100, Math.round((newPaid / equalShare) * 100)) : 0;

  const matchingContainers = document.querySelectorAll(`[data-person-id="${personId}"]`);
  matchingContainers.forEach(container => {
    const pendingCell = container.querySelector('.pending-cell');
    const statusBadge = container.querySelector('.status-badge');
    const personProgressText = container.querySelector('.person-progress-text');
    const personProgressBar = container.querySelector('.person-progress-bar');

    if (pendingCell) pendingCell.textContent = formatCurrency(pending);
    if (statusBadge) {
      statusBadge.textContent = statusObj.status;
      statusBadge.className = `status-badge inline-flex items-center px-3 py-0.5 rounded-full text-xs ${statusObj.badgeClass}`;
    }
    if (personProgressText) {
      personProgressText.textContent = `${personPercent}%`;
    }
    if (personProgressBar) {
      personProgressBar.style.width = `${personPercent}%`;
      personProgressBar.className = `person-progress-bar h-full transition-all duration-300 rounded-full ${personPercent === 100 ? 'bg-emerald-500' : (personPercent > 0 ? 'bg-amber-500' : 'bg-slate-300')}`;
    }
  });

  const summary = calculateTripSummary(trip);
  const totalPaidEl = document.getElementById('details-total-paid');
  const totalPendingEl = document.getElementById('details-total-pending');
  const progressBarEl = document.getElementById('details-progress-bar');
  const progressTextEl = document.getElementById('details-progress-text');

  if (totalPaidEl) totalPaidEl.textContent = formatCurrency(summary.totalPaid);
  if (totalPendingEl) totalPendingEl.textContent = formatCurrency(summary.totalPending);
  if (progressBarEl) progressBarEl.style.width = `${summary.progressPercent}%`;
  if (progressTextEl) progressTextEl.textContent = `${summary.progressPercent}% Paid`;
}

/**
 * Reset all payments confirmation modal
 */
function confirmResetPayments(tripId) {
  showModal({
    title: 'Reset Payments?',
    message: 'Are you sure you want to reset all payment records for this trip to ₹0?',
    confirmText: 'Reset Payments',
    cancelText: 'Cancel',
    confirmClass: 'bg-red-600 hover:bg-red-700 text-white',
    onConfirm: async () => {
      try {
        await API.resetPayments(tripId);
        currentTripData = await API.getTripById(tripId);
        renderTripDetailsUI(currentTripData);
        showToast('All payments reset successfully in data.json.', 'success');
      } catch (err) {
        showToast(err.message || 'Failed to reset payments', 'error');
      }
    }
  });
}
