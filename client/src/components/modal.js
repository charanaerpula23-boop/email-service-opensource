/* ========================================
   SecureMail Modal Component
   ======================================== */

let activeModal = null;

/**
 * Open a modal dialog.
 * @param {object} options
 * @param {string} options.title
 * @param {string|HTMLElement} options.content — HTML string or DOM element
 * @param {Array} options.actions — [{label, variant, onClick}]
 * @param {'sm'|'md'|'lg'|'full'} options.size
 * @param {boolean} options.closable — show close button, default true
 * @param {function} options.onClose — called when modal closes
 */
export function openModal(options = {}) {
  closeModal(); // close any existing

  const {
    title = '',
    content = '',
    actions = [],
    size = 'md',
    closable = true,
    onClose = null
  } = options;

  const widths = { sm: '400px', md: '540px', lg: '720px', full: '90vw' };

  /* Backdrop */
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  Object.assign(backdrop.style, {
    position: 'fixed',
    inset: '0',
    background: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
    zIndex: '900',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    animation: 'fadeIn 0.2s ease-out both'
  });

  if (closable) {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeModal();
    });
  }

  /* Card */
  const card = document.createElement('div');
  card.className = 'modal-card';
  Object.assign(card.style, {
    background: 'rgba(17, 24, 39, 0.9)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(99, 102, 241, 0.2)',
    borderRadius: '16px',
    padding: '0',
    maxWidth: widths[size] || widths.md,
    width: '100%',
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 16px 64px rgba(0,0,0,0.5), 0 0 40px rgba(99,102,241,0.1)',
    animation: 'scaleIn 0.25s cubic-bezier(0.34,1.56,0.64,1) both',
    overflow: 'hidden'
  });

  /* Header */
  if (title || closable) {
    const header = document.createElement('div');
    Object.assign(header.style, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '20px 24px',
      borderBottom: '1px solid rgba(99,102,241,0.15)'
    });

    const titleEl = document.createElement('h3');
    Object.assign(titleEl.style, {
      fontSize: '18px',
      fontWeight: '600',
      color: '#f1f5f9',
      margin: '0'
    });
    titleEl.textContent = title;
    header.appendChild(titleEl);

    if (closable) {
      const closeBtn = document.createElement('button');
      Object.assign(closeBtn.style, {
        background: 'none',
        border: 'none',
        color: '#64748b',
        fontSize: '20px',
        cursor: 'pointer',
        padding: '4px 8px',
        borderRadius: '8px',
        transition: 'all 0.15s',
        lineHeight: '1'
      });
      closeBtn.textContent = '✕';
      closeBtn.onmouseenter = () => {
        closeBtn.style.color = '#f1f5f9';
        closeBtn.style.background = 'rgba(99,102,241,0.1)';
      };
      closeBtn.onmouseleave = () => {
        closeBtn.style.color = '#64748b';
        closeBtn.style.background = 'none';
      };
      closeBtn.onclick = () => closeModal();
      header.appendChild(closeBtn);
    }

    card.appendChild(header);
  }

  /* Body */
  const body = document.createElement('div');
  Object.assign(body.style, {
    padding: '24px',
    overflowY: 'auto',
    flex: '1'
  });

  if (typeof content === 'string') {
    body.innerHTML = content;
  } else if (content instanceof HTMLElement) {
    body.appendChild(content);
  }
  card.appendChild(body);

  /* Footer / Actions */
  if (actions.length > 0) {
    const footer = document.createElement('div');
    Object.assign(footer.style, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: '12px',
      padding: '16px 24px',
      borderTop: '1px solid rgba(99,102,241,0.15)'
    });

    actions.forEach(action => {
      const btn = document.createElement('button');
      btn.className = `btn btn-${action.variant || 'secondary'}`;
      btn.textContent = action.label;
      if (action.onClick) {
        btn.addEventListener('click', () => action.onClick(closeModal));
      }
      footer.appendChild(btn);
    });

    card.appendChild(footer);
  }

  backdrop.appendChild(card);
  document.body.appendChild(backdrop);
  document.body.style.overflow = 'hidden';

  activeModal = { backdrop, card, onClose };

  /* ESC to close */
  const escHandler = (e) => {
    if (e.key === 'Escape' && closable) closeModal();
  };
  document.addEventListener('keydown', escHandler);
  activeModal.escHandler = escHandler;

  return { backdrop, card, body, close: closeModal };
}

/**
 * Close the active modal.
 */
export function closeModal() {
  if (!activeModal) return;

  const { backdrop, onClose, escHandler } = activeModal;
  document.removeEventListener('keydown', escHandler);

  const card = backdrop.querySelector('.modal-card');
  if (card) card.style.animation = 'scaleOut 0.2s ease-in both';
  backdrop.style.animation = 'fadeOut 0.2s ease-in both';

  backdrop.addEventListener('animationend', () => {
    backdrop.remove();
    document.body.style.overflow = '';
  });

  if (onClose) onClose();
  activeModal = null;
}
