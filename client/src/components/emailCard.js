/* ========================================
   SecureMail Email Card Component
   ======================================== */

/**
 * Render a single email list item.
 * @param {object} email
 * @param {function} onClick
 * @param {function} onStar
 * @returns {HTMLElement}
 */
export function renderEmailCard(email, onClick, onStar) {
  const {
    id,
    from = {},
    subject = '(No subject)',
    preview = '',
    date,
    read = true,
    starred = false
  } = email;

  const senderName = from.name || from.email || 'Unknown';
  const initials = getInitials(senderName);
  const timeStr = formatTime(date);

  const card = document.createElement('div');
  card.className = `email-card${read ? '' : ' unread'}`;
  card.dataset.emailId = id;

  card.innerHTML = `
    <div class="email-card-avatar">
      <div class="avatar" style="background:${getAvatarGradient(senderName)}">
        ${initials}
      </div>
    </div>
    <div class="email-card-content">
      <div class="email-card-top">
        <span class="email-card-sender">${escapeHtml(senderName)}</span>
        <span class="email-card-time">${timeStr}</span>
      </div>
      <div class="email-card-subject">${escapeHtml(subject)}</div>
      <div class="email-card-preview">${escapeHtml(preview)}</div>
    </div>
    <button class="email-card-star${starred ? ' starred' : ''}" aria-label="Star email">
      ${starred ? '★' : '☆'}
    </button>
  `;

  /* Click handler */
  card.addEventListener('click', (e) => {
    if (e.target.closest('.email-card-star')) return;
    if (onClick) onClick(email);
  });

  /* Star toggle */
  const starBtn = card.querySelector('.email-card-star');
  starBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isNowStarred = !starBtn.classList.contains('starred');
    starBtn.classList.toggle('starred');
    starBtn.textContent = isNowStarred ? '★' : '☆';
    starBtn.style.animation = 'bounceIn 0.4s ease both';
    setTimeout(() => { starBtn.style.animation = ''; }, 400);
    if (onStar) onStar(email, isNowStarred);
  });

  injectEmailCardStyles();
  return card;
}

/**
 * Render skeleton loading cards.
 */
export function renderEmailSkeleton(count = 5) {
  const frag = document.createDocumentFragment();
  for (let i = 0; i < count; i++) {
    const skel = document.createElement('div');
    skel.className = 'email-card skeleton-card';
    skel.style.animationDelay = `${i * 80}ms`;
    skel.innerHTML = `
      <div class="skeleton skeleton-avatar"></div>
      <div style="flex:1;display:flex;flex-direction:column;gap:8px">
        <div class="skeleton skeleton-text" style="width:40%"></div>
        <div class="skeleton skeleton-text" style="width:70%"></div>
        <div class="skeleton skeleton-text" style="width:55%"></div>
      </div>
    `;
    frag.appendChild(skel);
  }
  return frag;
}

/* ── Helpers ── */
function getInitials(name) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function getAvatarGradient(name) {
  const gradients = [
    'linear-gradient(135deg, #6366f1, #8b5cf6)',
    'linear-gradient(135deg, #ec4899, #f43f5e)',
    'linear-gradient(135deg, #10b981, #14b8a6)',
    'linear-gradient(135deg, #f59e0b, #f97316)',
    'linear-gradient(135deg, #3b82f6, #6366f1)',
    'linear-gradient(135deg, #8b5cf6, #ec4899)',
    'linear-gradient(135deg, #14b8a6, #06b6d4)'
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return gradients[Math.abs(hash) % gradients.length];
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  const oneDay = 86400000;

  if (diff < oneDay && d.getDate() === now.getDate()) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (diff < 7 * oneDay) {
    return d.toLocaleDateString([], { weekday: 'short' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* ── Styles ── */
let stylesInjected = false;
function injectEmailCardStyles() {
  if (stylesInjected) return;
  stylesInjected = true;

  const style = document.createElement('style');
  style.textContent = `
    .email-card {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px 18px;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      border-left: 3px solid transparent;
      background: transparent;
    }
    .email-card:hover {
      background: rgba(99, 102, 241, 0.06);
      transform: translateX(2px);
      box-shadow: 0 2px 12px rgba(0,0,0,0.15);
    }
    .email-card.active {
      background: rgba(99, 102, 241, 0.1);
      border-left-color: #6366f1;
    }
    .email-card.unread {
      border-left-color: #6366f1;
    }
    .email-card.unread .email-card-sender {
      font-weight: 700;
      color: #f1f5f9;
    }
    .email-card.unread .email-card-subject {
      font-weight: 600;
      color: #e2e8f0;
    }

    .email-card-avatar { flex-shrink: 0; }
    .email-card-avatar .avatar {
      width: 42px;
      height: 42px;
      font-size: 14px;
    }

    .email-card-content {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .email-card-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .email-card-sender {
      font-size: 14px;
      font-weight: 500;
      color: #cbd5e1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .email-card-time {
      font-size: 12px;
      color: #64748b;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .email-card-subject {
      font-size: 13px;
      font-weight: 500;
      color: #94a3b8;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .email-card-preview {
      font-size: 12px;
      color: #64748b;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .email-card-star {
      background: none;
      border: none;
      font-size: 20px;
      color: #475569;
      cursor: pointer;
      padding: 4px;
      transition: all 0.2s;
      flex-shrink: 0;
      line-height: 1;
    }
    .email-card-star:hover { color: #fbbf24; transform: scale(1.2); }
    .email-card-star.starred { color: #fbbf24; }

    .email-card.skeleton-card {
      padding: 16px 18px;
      cursor: default;
      animation: fadeIn 0.4s ease both;
    }
    .email-card.skeleton-card:hover {
      background: transparent;
      transform: none;
      box-shadow: none;
    }
  `;
  document.head.appendChild(style);
}
