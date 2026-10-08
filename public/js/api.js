/**
 * Trip Planner - API Client Module
 * Communicates with Node.js Express REST API backend
 */

const API_BASE = '/api';

async function apiFetch(endpoint, method = 'GET', data = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  };

  if (data && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}?t=${Date.now()}`, options);
    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(errBody.message || errBody.error || `HTTP ${response.status}`);
    }
    return await response.json();
  } catch (err) {
    console.error(`API Error [${method} ${endpoint}]:`, err.message);
    throw err;
  }
}

// REST helper functions
const API = {
  fetchData: () => apiFetch('/data'),
  loginAdmin: (username, password) => apiFetch('/login', 'POST', { username, password }),
  getTrips: () => apiFetch('/trips'),
  getTripById: (id) => apiFetch(`/trips/${id}`),
  createTrip: (tripData) => apiFetch('/trips', 'POST', tripData),
  updateTrip: (id, tripData) => apiFetch(`/trips/${id}`, 'PUT', tripData),
  deleteTrip: (id) => apiFetch(`/trips/${id}`, 'DELETE'),
  updatePayment: (tripId, personId, paid) => apiFetch(`/trips/${tripId}/payments`, 'POST', { personId, paid }),
  resetPayments: (tripId) => apiFetch(`/trips/${tripId}/reset-payments`, 'POST')
};
