/**
 * Trip Planner - Main Client Application Initializer
 * Wires routes, page initialization logic, and header auth listeners.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Ensure toast container exists
  if (!document.getElementById('toast-container')) {
    const toastBox = document.createElement('div');
    toastBox.id = 'toast-container';
    document.body.appendChild(toastBox);
  }

  // Render header user state
  if (typeof renderHeaderUserUI === 'function') {
    renderHeaderUserUI();
  }

  // Determine current page route
  const path = window.location.pathname;
  const page = path.split('/').pop() || 'index.html';

  if (page === 'index.html' || page === '') {
    initLoginPage();
  } else if (page === 'dashboard.html') {
    if (typeof initDashboard === 'function') {
      initDashboard();
    }
  } else if (page === 'create-trip.html') {
    if (typeof checkAuth === 'function') checkAuth('admin');
    if (typeof initTripForm === 'function') {
      initTripForm(false);
    }
  } else if (page === 'edit-trip.html') {
    if (typeof checkAuth === 'function') checkAuth('admin');
    if (typeof initTripForm === 'function') {
      initTripForm(true);
    }
  } else if (page === 'trip-details.html') {
    if (typeof initTripDetailsPage === 'function') {
      initTripDetailsPage();
    }
  }
});

/**
 * Initialize Light-Theme Admin Login Page
 */
function initLoginPage() {
  const loginForm = document.getElementById('admin-login-form');
  if (!loginForm) return;

  // Clear prefilled values so user input is clean
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  
  if (usernameInput) usernameInput.value = '';
  if (passwordInput) passwordInput.value = '';

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = usernameInput ? usernameInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value : '';

    if (!username || !password) {
      showToast('Please enter both username and password', 'warning');
      return;
    }

    const submitBtn = loginForm.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `
        <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg> Logging in...
      `;
    }

    const res = await loginAdmin(username, password);

    if (res.success) {
      showToast(`Welcome back, ${res.user.name}!`, 'success');
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 500);
    } else {
      showToast(res.message || 'Invalid username or password', 'error');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Log In as Admin';
      }
    }
  });

  // Direct viewer action listener
  const viewerLink = document.getElementById('viewer-access-btn');
  if (viewerLink) {
    viewerLink.addEventListener('click', (e) => {
      e.preventDefault();
      loginViewer();
      showToast('Entered as Viewer (Read-Only Mode)', 'info');
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 300);
    });
  }
}
