/**
 * Trip Planner - Utility Functions Module
 */

// Toast notification helper
function showToast(message, type = 'success', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const iconMap = {
    success: `<svg class="w-5 h-5 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`,
    error: `<svg class="w-5 h-5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>`,
    warning: `<svg class="w-5 h-5 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>`,
    info: `<svg class="w-5 h-5 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`
  };

  toast.innerHTML = `
    ${iconMap[type] || iconMap.info}
    <span class="text-sm font-semibold text-white">${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => toast.classList.add('show'), 10);

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// Custom Modal Dialog helper
function showModal({ title, message, confirmText = 'Confirm', cancelText = 'Cancel', confirmClass = 'bg-red-600 hover:bg-red-700 text-white', onConfirm }) {
  const modalId = 'custom-app-modal';
  let existingModal = document.getElementById(modalId);
  if (existingModal) existingModal.remove();

  const modalHtml = `
    <div id="${modalId}" class="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div class="modal-content bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-100 dark:border-slate-800">
        <div class="flex items-center gap-3 mb-4 text-slate-800 dark:text-white">
          <div class="p-2.5 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
          </div>
          <h3 class="text-lg font-bold">${escapeHtml(title)}</h3>
        </div>
        <p class="text-sm text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">${escapeHtml(message)}</p>
        <div class="flex items-center justify-end gap-3">
          <button id="modal-cancel-btn" type="button" class="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
            ${escapeHtml(cancelText)}
          </button>
          <button id="modal-confirm-btn" type="button" class="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm ${confirmClass}">
            ${escapeHtml(confirmText)}
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  const modalEl = document.getElementById(modalId);

  setTimeout(() => modalEl.classList.add('show'), 10);

  const closeModal = () => {
    modalEl.classList.remove('show');
    setTimeout(() => modalEl.remove(), 250);
  };

  document.getElementById('modal-cancel-btn').addEventListener('click', closeModal);
  document.getElementById('modal-confirm-btn').addEventListener('click', () => {
    closeModal();
    if (typeof onConfirm === 'function') onConfirm();
  });
}

// Currency Formatter for Indian Rupee (INR ₹)
function formatCurrency(amount) {
  const val = parseFloat(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: val % 1 === 0 ? 0 : 2
  }).format(val);
}

// Date Formatter: YYYY-MM-DD -> 10 Oct 2026
function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

// Date Range Formatter
function formatDateRange(startDateStr, endDateStr) {
  if (!startDateStr || !endDateStr) return '';
  return `${formatDate(startDateStr)} — ${formatDate(endDateStr)}`;
}

// Determine status based on dates
function getTripStatus(startDateStr, endDateStr) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const start = new Date(startDateStr);
  start.setHours(0, 0, 0, 0);

  const end = new Date(endDateStr);
  end.setHours(23, 59, 59, 999);

  if (now < start) {
    return { label: 'Upcoming', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800' };
  } else if (now >= start && now <= end) {
    return { label: 'Ongoing', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800' };
  } else {
    return { label: 'Completed', badgeClass: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700' };
  }
}

// Escape HTML helper
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Canvas Image Compression helper (preserves natural aspect ratio)
function compressImage(file, maxWidth = 900, maxHeight = 500, quality = 0.8) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.match(/image.*/)) {
      return reject(new Error('Invalid image file'));
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const ratio = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
        const width = Math.round(img.width * ratio);
        const height = Math.round(img.height * ratio);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const base64Str = canvas.toDataURL(file.type, quality);
        resolve(base64Str);
      };
      img.onerror = (err) => reject(err);
      img.src = event.target.result;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

// Dynamic SVG fallback image generator
function getDefaultThumbnail(title = 'Trip') {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400" viewBox="0 0 800 400">
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#4f46e5;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#06b6d4;stop-opacity:1" />
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#grad)" />
    <circle cx="700" cy="80" r="140" fill="rgba(255,255,255,0.08)" />
    <circle cx="100" cy="320" r="180" fill="rgba(255,255,255,0.06)" />
    <path d="M 0 350 Q 200 250 400 350 T 800 300 L 800 400 L 0 400 Z" fill="rgba(255,255,255,0.15)" />
    <text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-family="system-ui, sans-serif" font-size="38" font-weight="700" letter-spacing="1">
      ${escapeHtml(title)}
    </text>
    <text x="50%" y="58%" dominant-baseline="middle" text-anchor="middle" fill="rgba(255,255,255,0.85)" font-family="system-ui, sans-serif" font-size="18" font-weight="500">
      ✈️ Adventure Awaits
    </text>
  </svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}
