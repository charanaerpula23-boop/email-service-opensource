/* ========================================
   SecureMail Auth Client Service
   ======================================== */

import { api, setAuthToken, setRefreshToken, clearAuth, getAuthToken } from './api.client.js';

let currentUser = null;

/**
 * Register a new account.
 */
export async function register(email, password, displayName) {
  const data = await api.post('/auth/register', {
    email,
    password,
    displayName
  });
  return data;
}

/**
 * Login and store tokens in memory.
 */
export async function login(email, password) {
  const data = await api.post('/auth/login', { email, password });

  const token = data.token || data.accessToken;
  const refresh = data.refreshToken || null;

  setAuthToken(token, refresh);

  currentUser = data.user || {
    email,
    displayName: data.displayName || email.split('@')[0],
    id: data.userId || data.id
  };

  return currentUser;
}

/**
 * Logout — POST to server and clear memory.
 */
export async function logout() {
  try {
    await api.post('/auth/logout');
  } catch (_) {
    /* Best-effort logout */
  }
  currentUser = null;
  clearAuth();
}

/**
 * Get the cached current user.
 */
export function getCurrentUser() {
  return currentUser;
}

/**
 * Set the current user (for restore from token).
 */
export function setCurrentUser(user) {
  currentUser = user;
}

/**
 * Check if authenticated.
 */
export function isAuthenticated() {
  return !!getAuthToken();
}

/**
 * Fetch the current user profile from the server.
 */
export async function fetchProfile() {
  try {
    const data = await api.get('/auth/profile');
    currentUser = data.user || data;
    return currentUser;
  } catch (err) {
    currentUser = null;
    clearAuth();
    return null;
  }
}
