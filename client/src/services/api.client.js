/* ========================================
   SecureMail API Client — Fetch Wrapper
   ======================================== */

const BASE_URL = '/api';

let authToken = null;
let refreshToken = null;
let refreshPromise = null;

/* ── Token management ── */
export function setAuthToken(token, refresh) {
  authToken = token;
  if (refresh) refreshToken = refresh;
}

export function getAuthToken() {
  return authToken;
}

export function setRefreshToken(token) {
  refreshToken = token;
}

export function getRefreshToken() {
  return refreshToken;
}

export function clearAuth() {
  authToken = null;
  refreshToken = null;
}

/* ── Refresh handler ── */
async function attemptRefresh() {
  if (!refreshToken) {
    clearAuth();
    throw new Error('No refresh token');
  }

  /* Deduplicate concurrent refresh calls */
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });

      if (!res.ok) {
        clearAuth();
        throw new Error('Refresh failed');
      }

      const data = await res.json();
      authToken = data.token || data.accessToken;
      if (data.refreshToken) refreshToken = data.refreshToken;
      return authToken;
    } catch (err) {
      clearAuth();
      throw err;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/* ── Core request ── */
export async function apiRequest(method, endpoint, body = null, options = {}) {
  const url = `${BASE_URL}${endpoint}`;

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const config = {
    method,
    headers,
  };

  if (body && method !== 'GET') {
    config.body = JSON.stringify(body);
  }

  let response = await fetch(url, config);

  /* Auto-refresh on 401 */
  if (response.status === 401 && refreshToken) {
    try {
      await attemptRefresh();
      headers['Authorization'] = `Bearer ${authToken}`;
      config.headers = headers;
      response = await fetch(url, config);
    } catch (_) {
      /* Refresh failed — will return 401 to caller */
    }
  }

  /* Parse response */
  const contentType = response.headers.get('content-type');
  let data = null;

  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const error = new Error(
      (typeof data === 'object' && data.message) || data || `HTTP ${response.status}`
    );
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

/* ── Convenience shortcuts ── */
export const api = {
  get:    (endpoint, opts) => apiRequest('GET', endpoint, null, opts),
  post:   (endpoint, body, opts) => apiRequest('POST', endpoint, body, opts),
  put:    (endpoint, body, opts) => apiRequest('PUT', endpoint, body, opts),
  patch:  (endpoint, body, opts) => apiRequest('PATCH', endpoint, body, opts),
  delete: (endpoint, body, opts) => apiRequest('DELETE', endpoint, body, opts),
};
