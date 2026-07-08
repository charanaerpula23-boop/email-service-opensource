/* ========================================
   SecureMail Router — Hash-based SPA
   ======================================== */

import { getAuthToken } from './services/api.client.js';

const routes = {};
let currentPath = '';
let onNavigateCallback = null;

/**
 * Register a route.
 * @param {string} path - Hash path e.g. '/login'
 * @param {object} config - { render: fn, guard?: boolean }
 */
export function registerRoute(path, config) {
  routes[path] = config;
}

/**
 * Navigate to a path by updating the hash.
 */
export function navigate(path) {
  window.location.hash = '#' + path;
}

/**
 * Get current route path (without the leading #).
 */
export function getCurrentRoute() {
  const hash = window.location.hash.slice(1) || '/login';
  return hash;
}

/**
 * Set the navigation callback invoked on every route change.
 */
export function onNavigate(callback) {
  onNavigateCallback = callback;
}

/**
 * Resolve and render the current route.
 */
function resolveRoute() {
  const path = getCurrentRoute();

  /* Avoid re-rendering if already on same route */
  if (path === currentPath) return;
  currentPath = path;

  const route = routes[path];

  if (!route) {
    /* 404 — redirect to login or inbox */
    const fallback = getAuthToken() ? '/inbox' : '/login';
    navigate(fallback);
    return;
  }

  /* Auth guard */
  if (route.guard && !getAuthToken()) {
    navigate('/login');
    return;
  }

  /* Already authenticated but on login/register? */
  if ((path === '/login' || path === '/register') && getAuthToken()) {
    navigate('/inbox');
    return;
  }

  if (onNavigateCallback) {
    onNavigateCallback(path, route);
  }
}

/**
 * Initialize the router.
 */
export function initRouter() {
  window.addEventListener('hashchange', () => {
    currentPath = ''; // force re-render
    resolveRoute();
  });

  /* Handle initial load */
  if (!window.location.hash) {
    window.location.hash = '#/login';
  } else {
    resolveRoute();
  }
}

/**
 * Force re-resolve (useful after login/logout)
 */
export function forceResolve() {
  currentPath = '';
  resolveRoute();
}
