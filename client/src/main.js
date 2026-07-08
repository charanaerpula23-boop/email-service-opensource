/* ========================================
   SecureMail — Main Entry Point
   ======================================== */

/* ── Import Styles ── */
import './styles/variables.css';
import './styles/base.css';
import './styles/animations.css';
import './styles/components.css';

/* ── Import SPA Infrastructure ── */
import { registerRoute, onNavigate, initRouter, navigate } from './router.js';
import { getAuthToken } from './services/api.client.js';
import { isAuthenticated } from './services/auth.client.js';

/* ── Import Pages ── */
import { renderLoginPage } from './pages/login.js';
import { renderRegisterPage } from './pages/register.js';
import { renderInboxPage } from './pages/inbox.js';
import { renderSettingsPage } from './pages/settings.js';

/* ── App State ── */
const appState = {
  get currentUser() {
    const { getCurrentUser } = require('./services/auth.client.js');
    return getCurrentUser();
  },
  get isAuthenticated() {
    return !!getAuthToken();
  }
};

/* Helper to dynamically import auth user */
function require(mod) {
  /* Stub — actual imports are ES modules above */
  return {};
}

/* ── Register Routes ── */
registerRoute('/login', {
  render: renderLoginPage,
  guard: false
});

registerRoute('/register', {
  render: renderRegisterPage,
  guard: false
});

registerRoute('/inbox', {
  render: (container) => renderInboxPage(container, 'inbox'),
  guard: true
});

registerRoute('/sent', {
  render: (container) => renderInboxPage(container, 'sent'),
  guard: true
});

registerRoute('/drafts', {
  render: (container) => renderInboxPage(container, 'drafts'),
  guard: true
});

registerRoute('/starred', {
  render: (container) => renderInboxPage(container, 'starred'),
  guard: true
});

registerRoute('/trash', {
  render: (container) => renderInboxPage(container, 'trash'),
  guard: true
});

registerRoute('/settings', {
  render: renderSettingsPage,
  guard: true
});

/* ── Navigation Handler ── */
onNavigate((path, route) => {
  const app = document.getElementById('app');
  if (!app) return;

  /* Add page transition */
  app.style.opacity = '0';
  app.style.transition = 'opacity 0.15s ease-out';

  setTimeout(() => {
    route.render(app);
    app.style.opacity = '1';
  }, 150);
});

/* ── Initialize ── */
initRouter();

/* ── Export for debugging ── */
if (typeof window !== 'undefined') {
  window.__secureMail = {
    navigate,
    getAuthToken,
    isAuthenticated
  };
}

console.log(
  '%c🔒 SecureMail %cClient Loaded',
  'color: #6366f1; font-weight: bold; font-size: 14px;',
  'color: #94a3b8; font-size: 14px;'
);
