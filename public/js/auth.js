/**
 * Trip Planner - Authentication & Authorization Module
 */

const CURRENT_USER_KEY = 'tripPlannerCurrentUser';

// Default Viewer User object for guest visitors
const DEFAULT_VIEWER_USER = {
  id: 2,
  name: "Viewer User",
  username: "viewer",
  role: "viewer"
};

/**
 * Get currently logged in user from localStorage.
 * Defaults to Viewer User if no session is set.
 */
function getCurrentUser() {
  const userStr = localStorage.getItem(CURRENT_USER_KEY);
  if (!userStr) {
    return DEFAULT_VIEWER_USER;
  }
  try {
    return JSON.parse(userStr) || DEFAULT_VIEWER_USER;
  } catch (e) {
    return DEFAULT_VIEWER_USER;
  }
}

/**
 * Check if current user is logged in as explicit session
 */
function isLoggedIn() {
  const userStr = localStorage.getItem(CURRENT_USER_KEY);
  return userStr !== null;
}

/**
 * Helper to check if current user is Admin
 */
function isAdmin() {
  const user = getCurrentUser();
  return user && user.role === 'admin';
}

/**
 * Helper to check if current user is Viewer
 */
function isViewer() {
  const user = getCurrentUser();
  return !user || user.role === 'viewer';
}

/**
 * Admin Login via Node.js backend REST API
 */
async function loginAdmin(username, password) {
  try {
    const result = await API.loginAdmin(username, password);
    if (result.success && result.user) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(result.user));
      return { success: true, user: result.user };
    }
    return { success: false, message: 'Invalid admin username or password' };
  } catch (err) {
    return { success: false, message: err.message || 'Login failed' };
  }
}

/**
 * Log in directly as Viewer without password
 */
function loginViewer() {
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(DEFAULT_VIEWER_USER));
  return DEFAULT_VIEWER_USER;
}

/**
 * Logout / switch back to default Viewer role
 */
function logout() {
  localStorage.removeItem(CURRENT_USER_KEY);
  window.location.href = 'dashboard.html';
}

/**
 * Protect page route based on required role
 */
function checkAuth(requiredRole = null) {
  const user = getCurrentUser();

  if (requiredRole === 'admin' && user.role !== 'admin') {
    showToast('Access Denied: Only Admin can create, edit, or delete trips.', 'warning');
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 600);
    return;
  }
}

/**
 * Update Header UI across pages with user details and hide/show role-restricted elements
 */
function renderHeaderUserUI() {
  const user = getCurrentUser();
  if (!user) return;

  // Render User Name
  const userNameEls = document.querySelectorAll('.user-name-display');
  userNameEls.forEach(el => {
    el.textContent = user.name;
  });

  // Render User Role Badge
  const userRoleEls = document.querySelectorAll('.user-role-badge');
  userRoleEls.forEach(el => {
    if (user.role === 'admin') {
      el.textContent = 'Admin';
      el.className = 'user-role-badge inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700/50';
    } else {
      el.textContent = 'Viewer (Read-Only)';
      el.className = 'user-role-badge inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 border border-amber-200 dark:border-amber-700/50';
    }
  });

  // Hide or display Admin-only DOM elements based on role
  const adminOnlyEls = document.querySelectorAll('[data-admin-only]');
  adminOnlyEls.forEach(el => {
    if (!isAdmin()) {
      el.style.display = 'none';
      el.setAttribute('aria-hidden', 'true');
    } else {
      el.style.display = '';
      el.removeAttribute('aria-hidden');
    }
  });

  // Update Login / Logout button in Header
  const authActionContainer = document.getElementById('header-auth-action');
  if (authActionContainer) {
    if (isAdmin()) {
      authActionContainer.innerHTML = `
        <button type="button" class="btn-logout inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 transition-all border border-slate-200 dark:border-slate-700">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path></svg>
          Logout Admin
        </button>
      `;
    } else {
      authActionContainer.innerHTML = `
        <a href="index.html" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 transition-all border border-indigo-200 dark:border-indigo-800">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path></svg>
          Admin Login
        </a>
      `;
    }

    const logoutBtn = authActionContainer.querySelector('.btn-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        logout();
      });
    }
  }
}
