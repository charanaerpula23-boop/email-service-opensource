/* ========================================
   SecureMail Toast Notification System
   ======================================== */

const TOAST_ICONS = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ'
};

const TOAST_COLORS = {
  success: { bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.4)', icon: '#10b981' },
  error:   { bg: 'rgba(239, 68, 68, 0.15)',   border: 'rgba(239, 68, 68, 0.4)',   icon: '#ef4444' },
  warning: { bg: 'rgba(245, 158, 11, 0.15)',  border: 'rgba(245, 158, 11, 0.4)',  icon: '#f59e0b' },
  info:    { bg: 'rgba(99, 102, 241, 0.15)',   border: 'rgba(99, 102, 241, 0.4)', icon: '#6366f1' }
};

let toastContainer = null;

function ensureContainer() {
  if (toastContainer && document.body.contains(toastContainer)) return;

  toastContainer = document.createElement('div');
  toastContainer.id = 'toast-container';
  Object.assign(toastContainer.style, {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    display: 'flex',
    flexDirection: 'column-reverse',
    gap: '12px',
    zIndex: '1100',
    pointerEvents: 'none',
    maxWidth: '380px',
    width: '100%'
  });
  document.body.appendChild(toastContainer);
}

/**
 * Show a toast notification.
 * @param {string} message
 * @param {'success'|'error'|'warning'|'info'} type
 * @param {number} duration — ms, default 4000
 */
export function showToast(message, type = 'info', duration = 4000) {
  ensureContainer();

  const colors = TOAST_COLORS[type] || TOAST_COLORS.info;
  const icon = TOAST_ICONS[type] || TOAST_ICONS.info;

  const toast = document.createElement('div');
  toast.className = 'toast-item';
  Object.assign(toast.style, {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '14px 18px',
    background: colors.bg,
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: `1px solid ${colors.border}`,
    borderRadius: '12px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    color: '#f1f5f9',
    fontSize: '14px',
    lineHeight: '1.5',
    pointerEvents: 'auto',
    animation: 'slideInRight 0.35s cubic-bezier(0.34,1.56,0.64,1) both',
    maxWidth: '100%'
  });

  const iconEl = document.createElement('span');
  Object.assign(iconEl.style, {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: '0',
    fontSize: '13px',
    fontWeight: '700',
    background: colors.border,
    color: colors.icon
  });
  iconEl.textContent = icon;

  const textEl = document.createElement('span');
  textEl.style.flex = '1';
  textEl.style.paddingTop = '2px';
  textEl.textContent = message;

  const closeBtn = document.createElement('button');
  Object.assign(closeBtn.style, {
    background: 'none',
    border: 'none',
    color: '#64748b',
    cursor: 'pointer',
    fontSize: '16px',
    lineHeight: '1',
    padding: '2px',
    flexShrink: '0',
    transition: 'color 0.15s'
  });
  closeBtn.textContent = '✕';
  closeBtn.onmouseenter = () => { closeBtn.style.color = '#f1f5f9'; };
  closeBtn.onmouseleave = () => { closeBtn.style.color = '#64748b'; };
  closeBtn.onclick = () => dismissToast(toast);

  toast.appendChild(iconEl);
  toast.appendChild(textEl);
  toast.appendChild(closeBtn);
  toastContainer.appendChild(toast);

  /* Auto-dismiss */
  const timer = setTimeout(() => dismissToast(toast), duration);
  toast._timer = timer;

  return toast;
}

function dismissToast(toast) {
  if (toast._dismissed) return;
  toast._dismissed = true;
  clearTimeout(toast._timer);
  toast.style.animation = 'slideOutRight 0.3s ease-in both';
  toast.addEventListener('animationend', () => {
    toast.remove();
  });
}
