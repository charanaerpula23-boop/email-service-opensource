/* ========================================
   SecureMail Sidebar Component
   ======================================== */

import { navigate } from '../router.js';

const FOLDERS = [
  { id: 'inbox',   label: 'Inbox',   icon: '📥', path: '/inbox' },
  { id: 'sent',    label: 'Sent',    icon: '📤', path: '/sent' },
  { id: 'drafts',  label: 'Drafts',  icon: '📝', path: '/drafts' },
  { id: 'starred', label: 'Starred', icon: '⭐', path: '/starred' },
  { id: 'trash',   label: 'Trash',   icon: '🗑️', path: '/trash' }
];

const LABELS = [
  { name: 'Personal', color: '#6366f1' },
  { name: 'Work',     color: '#10b981' },
  { name: 'Finance',  color: '#f59e0b' },
  { name: 'Updates',  color: '#ec4899' }
];

/**
 * Render the sidebar.
 * @param {HTMLElement} container
 * @param {string} activeFolder — e.g. 'inbox'
 * @param {object} counts — e.g. { inbox: 5, drafts: 2 }
 * @param {function} onCompose — called when compose is clicked
 */
export function renderSidebar(container, activeFolder = 'inbox', counts = {}, onCompose = null) {
  container.innerHTML = '';
  container.className = 'sidebar';

  /* ── Mobile toggle (hamburger) ── */
  const mobileToggle = document.createElement('button');
  mobileToggle.className = 'sidebar-mobile-toggle';
  mobileToggle.innerHTML = `<span></span><span></span><span></span>`;
  mobileToggle.setAttribute('aria-label', 'Toggle sidebar');

  /* ── Sidebar inner ── */
  const inner = document.createElement('div');
  inner.className = 'sidebar-inner';

  /* Logo */
  const logo = document.createElement('div');
  logo.className = 'sidebar-logo';
  logo.innerHTML = `
    <div class="sidebar-logo-icon">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <rect x="2" y="5" width="20" height="14" rx="3" stroke="url(#logoGrad)" stroke-width="1.5"/>
        <path d="M2 8l10 6 10-6" stroke="url(#logoGrad)" stroke-width="1.5" stroke-linecap="round"/>
        <defs>
          <linearGradient id="logoGrad" x1="2" y1="5" x2="22" y2="19">
            <stop stop-color="#6366f1"/><stop offset="1" stop-color="#a78bfa"/>
          </linearGradient>
        </defs>
      </svg>
    </div>
    <span class="sidebar-logo-text">SecureMail</span>
  `;

  /* Compose button */
  const composeBtn = document.createElement('button');
  composeBtn.className = 'sidebar-compose-btn';
  composeBtn.innerHTML = `
    <span class="compose-icon">+</span>
    <span>Compose</span>
  `;
  if (onCompose) {
    composeBtn.addEventListener('click', onCompose);
  }

  /* Folders */
  const foldersSection = document.createElement('nav');
  foldersSection.className = 'sidebar-folders';

  FOLDERS.forEach(folder => {
    const item = document.createElement('button');
    item.className = `sidebar-folder-item${activeFolder === folder.id ? ' active' : ''}`;
    item.dataset.folder = folder.id;

    const count = counts[folder.id];
    item.innerHTML = `
      <span class="folder-icon">${folder.icon}</span>
      <span class="folder-label">${folder.label}</span>
      ${count ? `<span class="folder-count badge-count">${count}</span>` : ''}
    `;

    item.addEventListener('click', () => {
      navigate(folder.path);
    });

    foldersSection.appendChild(item);
  });

  /* Divider */
  const divider = document.createElement('hr');
  divider.className = 'divider';
  divider.style.margin = '16px 12px';

  /* Labels */
  const labelsHeader = document.createElement('div');
  labelsHeader.className = 'sidebar-section-header';
  labelsHeader.textContent = 'Labels';

  const labelsSection = document.createElement('div');
  labelsSection.className = 'sidebar-labels';

  LABELS.forEach(label => {
    const item = document.createElement('div');
    item.className = 'sidebar-label-item';
    item.innerHTML = `
      <span class="label-dot" style="background:${label.color}"></span>
      <span class="label-name">${label.name}</span>
    `;
    labelsSection.appendChild(item);
  });

  /* Assemble */
  inner.appendChild(logo);
  inner.appendChild(composeBtn);
  inner.appendChild(foldersSection);
  inner.appendChild(divider);
  inner.appendChild(labelsHeader);
  inner.appendChild(labelsSection);

  container.appendChild(mobileToggle);
  container.appendChild(inner);

  /* Mobile toggle handler */
  mobileToggle.addEventListener('click', () => {
    inner.classList.toggle('open');
    mobileToggle.classList.toggle('open');
  });

  /* Close sidebar on folder click (mobile) */
  foldersSection.addEventListener('click', () => {
    inner.classList.remove('open');
    mobileToggle.classList.remove('open');
  });

  injectSidebarStyles();
}

/* ── Styles (injected once) ── */
let stylesInjected = false;
function injectSidebarStyles() {
  if (stylesInjected) return;
  stylesInjected = true;

  const style = document.createElement('style');
  style.textContent = `
    .sidebar {
      width: 260px;
      height: 100vh;
      position: relative;
      flex-shrink: 0;
      z-index: 200;
    }
    .sidebar-inner {
      width: 260px;
      height: 100vh;
      background: rgba(17, 24, 39, 0.85);
      border-right: 1px solid rgba(99, 102, 241, 0.12);
      display: flex;
      flex-direction: column;
      padding: 20px 12px;
      overflow-y: auto;
      position: fixed;
      left: 0;
      top: 0;
    }

    /* Logo */
    .sidebar-logo {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 4px 12px 20px;
    }
    .sidebar-logo-icon {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .sidebar-logo-text {
      font-size: 20px;
      font-weight: 700;
      background: linear-gradient(135deg, #6366f1, #a78bfa);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    /* Compose */
    .sidebar-compose-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      padding: 12px;
      border: none;
      border-radius: 12px;
      background: linear-gradient(135deg, #6366f1, #8b5cf6, #a78bfa);
      color: #fff;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      margin-bottom: 20px;
      box-shadow: 0 4px 16px rgba(99, 102, 241, 0.3);
    }
    .sidebar-compose-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 8px 28px rgba(99, 102, 241, 0.45);
    }
    .sidebar-compose-btn:active { transform: scale(0.97); }
    .compose-icon {
      font-size: 20px;
      font-weight: 400;
      line-height: 1;
    }

    /* Folders */
    .sidebar-folders {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .sidebar-folder-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 16px;
      border: none;
      border-radius: 10px;
      background: transparent;
      color: #94a3b8;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      position: relative;
      width: 100%;
      text-align: left;
    }
    .sidebar-folder-item:hover {
      background: rgba(99, 102, 241, 0.08);
      color: #f1f5f9;
    }
    .sidebar-folder-item.active {
      background: rgba(99, 102, 241, 0.12);
      color: #f1f5f9;
      font-weight: 600;
    }
    .sidebar-folder-item.active::before {
      content: '';
      position: absolute;
      left: 0;
      top: 6px;
      bottom: 6px;
      width: 3px;
      border-radius: 0 3px 3px 0;
      background: var(--accent-gradient);
    }
    .folder-icon { font-size: 18px; line-height: 1; }
    .folder-label { flex: 1; }
    .folder-count {
      min-width: 22px;
      height: 20px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0 6px;
      background: #6366f1;
      color: #fff;
      font-size: 11px;
      font-weight: 700;
      border-radius: 999px;
    }

    /* Section header */
    .sidebar-section-header {
      font-size: 11px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 1px;
      padding: 0 16px 8px;
    }

    /* Labels */
    .sidebar-labels {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .sidebar-label-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 16px;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.15s;
      color: #94a3b8;
      font-size: 13px;
    }
    .sidebar-label-item:hover {
      background: rgba(99, 102, 241, 0.06);
      color: #f1f5f9;
    }
    .label-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    /* Mobile toggle */
    .sidebar-mobile-toggle {
      display: none;
      position: fixed;
      top: 16px;
      left: 16px;
      z-index: 250;
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: rgba(17, 24, 39, 0.9);
      border: 1px solid rgba(99, 102, 241, 0.2);
      cursor: pointer;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 5px;
      padding: 10px;
      backdrop-filter: blur(12px);
    }
    .sidebar-mobile-toggle span {
      display: block;
      width: 18px;
      height: 2px;
      background: #94a3b8;
      border-radius: 2px;
      transition: all 0.3s;
    }
    .sidebar-mobile-toggle.open span:nth-child(1) {
      transform: rotate(45deg) translate(5px, 5px);
    }
    .sidebar-mobile-toggle.open span:nth-child(2) { opacity: 0; }
    .sidebar-mobile-toggle.open span:nth-child(3) {
      transform: rotate(-45deg) translate(5px, -5px);
    }

    @media (max-width: 768px) {
      .sidebar { width: 0; }
      .sidebar-mobile-toggle { display: flex; }
      .sidebar-inner {
        transform: translateX(-100%);
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: none;
        z-index: 210;
      }
      .sidebar-inner.open {
        transform: translateX(0);
        box-shadow: 4px 0 32px rgba(0,0,0,0.5);
      }
    }
  `;
  document.head.appendChild(style);
}
