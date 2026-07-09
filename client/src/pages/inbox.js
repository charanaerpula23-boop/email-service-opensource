/* ========================================
   SecureMail Inbox / Dashboard Page
   ======================================== */

import { renderSidebar } from '../components/sidebar.js';
import { renderEmailCard, renderEmailSkeleton } from '../components/emailCard.js';
import { api } from '../services/api.client.js';
import { showToast } from '../components/toast.js';
import { navigate } from '../router.js';
import { renderComposePage } from './compose.js';

let currentFolder = 'inbox';
let selectedEmail = null;
let emails = [];



export function renderInboxPage(container, folder = 'inbox') {
  currentFolder = folder;
  selectedEmail = null;
  container.innerHTML = '';

  const layout = document.createElement('div');
  layout.className = 'inbox-layout';

  /* Sidebar */
  const sidebarEl = document.createElement('div');
  renderSidebar(sidebarEl, currentFolder, { inbox: 0, drafts: 0 }, () => {
    renderComposePage(document.getElementById('app'));
  });

  /* Email List Panel */
  const listPanel = document.createElement('div');
  listPanel.className = 'inbox-list-panel';

  const listHeader = document.createElement('div');
  listHeader.className = 'inbox-list-header';
  listHeader.innerHTML = `
    <div class="inbox-list-title">
      <h2>${capitalize(currentFolder)}</h2>
      <span class="inbox-list-count" id="listCount">0 messages</span>
    </div>
    <div class="inbox-search">
      <span class="inbox-search-icon">🔍</span>
      <input type="text" class="input inbox-search-input" placeholder="Search emails…" id="emailSearch" />
    </div>
  `;
  listPanel.appendChild(listHeader);

  const listBody = document.createElement('div');
  listBody.className = 'inbox-list-body';
  listPanel.appendChild(listBody);

  /* Detail Panel */
  const detailPanel = document.createElement('div');
  detailPanel.className = 'inbox-detail-panel';
  detailPanel.id = 'emailDetail';
  renderEmptyState(detailPanel);

  layout.appendChild(sidebarEl);
  layout.appendChild(listPanel);
  layout.appendChild(detailPanel);
  container.appendChild(layout);

  /* Load emails */
  loadEmails(listBody, detailPanel);

  /* Search */
  const searchInput = listPanel.querySelector('#emailSearch');
  searchInput.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase().trim();
    const filtered = emails.filter(e =>
      e.subject.toLowerCase().includes(query) ||
      (e.from.name || '').toLowerCase().includes(query) ||
      (e.preview || '').toLowerCase().includes(query)
    );
    renderEmailList(listBody, filtered, detailPanel);
  });

  /* FAB */
  const fab = document.createElement('button');
  fab.className = 'inbox-fab';
  fab.innerHTML = `<span>+</span>`;
  fab.title = 'Compose';
  fab.addEventListener('click', () => {
    renderComposePage(document.getElementById('app'));
  });
  container.appendChild(fab);

  injectInboxStyles();
}

async function loadEmails(listBody, detailPanel) {
  /* Show skeletons */
  listBody.innerHTML = '';
  listBody.appendChild(renderEmailSkeleton(5));

  try {
    const data = await api.get(`/emails?folder=${currentFolder}`);
    emails = Array.isArray(data) ? data : (data.emails || []);
    
    // Update count in header
    const listCount = document.getElementById('listCount');
    if (listCount) listCount.textContent = `${emails.length} messages`;

    renderEmailList(listBody, emails, detailPanel);
  } catch (err) {
    listBody.innerHTML = `
      <div class="inbox-empty animate-fadeIn">
        <div class="inbox-empty-icon animate-float">Warning</div>
        <h3>Failed to load emails</h3>
        <p>${escapeHtml(err.message || 'Unknown error occurred')}</p>
      </div>
    `;
  }
}

function renderEmailList(listBody, emailList, detailPanel) {
  listBody.innerHTML = '';

  if (emailList.length === 0) {
    listBody.innerHTML = `
      <div class="inbox-empty animate-fadeIn">
        <div class="inbox-empty-icon animate-float">Mailbox</div>
        <h3>No emails yet</h3>
        <p>Your ${currentFolder} is empty. Time to compose something!</p>
      </div>
    `;
    return;
  }

  emailList.forEach((email, i) => {
    const card = renderEmailCard(email, (e) => {
      selectEmail(e, detailPanel, listBody);
    }, (e, starred) => {
      e.starred = starred;
    });
    card.style.animationDelay = `${i * 50}ms`;
    card.classList.add('animate-slideUp');
    listBody.appendChild(card);
  });
}

function selectEmail(email, detailPanel, listBody) {
  selectedEmail = email;
  email.read = true;

  /* Update active state in list */
  listBody.querySelectorAll('.email-card').forEach(c => c.classList.remove('active'));
  const activeCard = listBody.querySelector(`[data-email-id="${email.id}"]`);
  if (activeCard) {
    activeCard.classList.add('active');
    activeCard.classList.remove('unread');
  }

  renderEmailDetail(email, detailPanel);

  /* On mobile, show detail as overlay */
  detailPanel.classList.add('open');
}

function renderEmailDetail(email, detailPanel) {
  const senderName = email.from?.name || email.from?.email || 'Unknown';
  const initials = senderName.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const dateStr = new Date(email.date).toLocaleString([], {
    weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  detailPanel.innerHTML = `
    <div class="detail-wrapper animate-fadeIn">
      <button class="detail-back-btn" id="detailBack">← Back</button>

      <div class="detail-header">
        <h2 class="detail-subject">${escapeHtml(email.subject)}</h2>
        <div class="detail-meta">
          <div class="detail-sender">
            <div class="avatar" style="background:linear-gradient(135deg,#6366f1,#8b5cf6)">${initials}</div>
            <div>
              <div class="detail-sender-name">${escapeHtml(senderName)}</div>
              <div class="detail-sender-email">to me · ${dateStr}</div>
            </div>
          </div>
          <div class="detail-badges">
            ${email.encrypted
              ? '<span class="badge badge-success">🔒 Encrypted</span>'
              : '<span class="badge badge-warning">🔓 Unencrypted</span>'
            }
          </div>
        </div>
      </div>

      <div class="divider"></div>

      <div class="detail-body">${email.body || '<p>' + escapeHtml(email.preview) + '</p>'}</div>

      <div class="divider"></div>

      <div class="detail-actions">
        <button class="btn btn-secondary btn-sm detail-action-btn" data-action="reply">
          <span>↩</span> Reply
        </button>
        <button class="btn btn-secondary btn-sm detail-action-btn" data-action="forward">
          <span>↪</span> Forward
        </button>
        <button class="btn btn-ghost btn-sm detail-action-btn" data-action="archive">
          <span>📦</span> Archive
        </button>
        <button class="btn btn-ghost btn-sm detail-action-btn" data-action="delete" style="color:#ef4444">
          <span>🗑️</span> Delete
        </button>
      </div>
    </div>
  `;

  /* Back button (mobile) */
  detailPanel.querySelector('#detailBack').addEventListener('click', () => {
    detailPanel.classList.remove('open');
  });

  /* Action buttons */
  detailPanel.querySelectorAll('.detail-action-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      if (action === 'delete') {
        showToast('Email moved to trash', 'info');
      } else if (action === 'archive') {
        showToast('Email archived', 'success');
      } else if (action === 'reply') {
        showToast('Reply composer opened', 'info');
      } else if (action === 'forward') {
        showToast('Forward composer opened', 'info');
      }
    });
  });
}

function renderEmptyState(detailPanel) {
  detailPanel.innerHTML = `
    <div class="detail-empty animate-fadeIn">
      <div class="detail-empty-icon animate-float">
        <svg width="80" height="80" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="5" width="20" height="14" rx="3" stroke="rgba(99,102,241,0.3)" stroke-width="1"/>
          <path d="M2 8l10 6 10-6" stroke="rgba(99,102,241,0.3)" stroke-width="1" stroke-linecap="round"/>
        </svg>
      </div>
      <h3>Select an email</h3>
      <p>Choose a message from the list to read it here.</p>
    </div>
  `;
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

/* ── Styles ── */
let inboxStylesInjected = false;
function injectInboxStyles() {
  if (inboxStylesInjected) return;
  inboxStylesInjected = true;

  const style = document.createElement('style');
  style.textContent = `
    .inbox-layout {
      display: flex;
      height: 100vh;
      overflow: hidden;
      background: #0a0e1a;
    }

    /* List Panel */
    .inbox-list-panel {
      width: 380px;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      border-right: 1px solid rgba(99,102,241,0.1);
      background: rgba(17, 24, 39, 0.4);
      height: 100vh;
    }
    .inbox-list-header {
      padding: 20px 18px 14px;
      border-bottom: 1px solid rgba(99,102,241,0.1);
      flex-shrink: 0;
    }
    .inbox-list-title {
      display: flex;
      align-items: baseline;
      gap: 10px;
      margin-bottom: 14px;
    }
    .inbox-list-title h2 {
      font-size: 22px;
      font-weight: 700;
      color: #f1f5f9;
    }
    .inbox-list-count {
      font-size: 13px;
      color: #64748b;
    }
    .inbox-search {
      position: relative;
    }
    .inbox-search-icon {
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 14px;
      pointer-events: none;
    }
    .inbox-search-input {
      padding-left: 40px !important;
      padding: 10px 14px;
      font-size: 13px;
    }

    .inbox-list-body {
      flex: 1;
      overflow-y: auto;
      padding: 8px 6px;
    }

    /* Empty state */
    .inbox-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 60px 24px;
      color: #64748b;
    }
    .inbox-empty-icon {
      font-size: 56px;
      margin-bottom: 16px;
    }
    .inbox-empty h3 {
      font-size: 18px;
      color: #94a3b8;
      margin-bottom: 6px;
    }
    .inbox-empty p { font-size: 14px; }

    /* Detail Panel */
    .inbox-detail-panel {
      flex: 1;
      height: 100vh;
      overflow-y: auto;
      background: #0a0e1a;
    }
    .detail-wrapper {
      max-width: 800px;
      margin: 0 auto;
      padding: 32px 28px;
    }
    .detail-back-btn {
      display: none;
      background: none;
      border: none;
      color: #6366f1;
      font-size: 14px;
      cursor: pointer;
      padding: 8px 0;
      margin-bottom: 16px;
      font-weight: 500;
    }
    .detail-header { margin-bottom: 4px; }
    .detail-subject {
      font-size: 24px;
      font-weight: 700;
      color: #f1f5f9;
      margin-bottom: 18px;
      line-height: 1.3;
    }
    .detail-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
    }
    .detail-sender {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .detail-sender .avatar {
      width: 42px;
      height: 42px;
      font-size: 14px;
    }
    .detail-sender-name {
      font-weight: 600;
      color: #f1f5f9;
      font-size: 15px;
    }
    .detail-sender-email {
      color: #64748b;
      font-size: 13px;
    }
    .detail-badges {
      display: flex;
      gap: 8px;
    }

    .detail-body {
      color: #cbd5e1;
      font-size: 15px;
      line-height: 1.7;
    }
    .detail-body p { margin-bottom: 12px; }
    .detail-body ul, .detail-body ol { padding-left: 20px; margin-bottom: 12px; }
    .detail-body li { margin-bottom: 4px; }
    .detail-body strong { color: #f1f5f9; }

    .detail-actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }
    .detail-action-btn {
      gap: 6px;
    }

    .detail-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      text-align: center;
      color: #475569;
    }
    .detail-empty-icon { margin-bottom: 20px; }
    .detail-empty h3 {
      font-size: 18px;
      color: #64748b;
      margin-bottom: 6px;
    }
    .detail-empty p { font-size: 14px; color: #475569; }

    /* FAB */
    .inbox-fab {
      position: fixed;
      bottom: 28px;
      right: 28px;
      width: 56px;
      height: 56px;
      border-radius: 16px;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: #fff;
      font-size: 28px;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 8px 28px rgba(99,102,241,0.4);
      transition: all 0.25s cubic-bezier(0.34,1.56,0.64,1);
      z-index: 100;
    }
    .inbox-fab:hover {
      transform: scale(1.1) rotate(90deg);
      box-shadow: 0 12px 36px rgba(99,102,241,0.5);
    }
    .inbox-fab:active { transform: scale(0.95); }

    @media (max-width: 1024px) {
      .inbox-list-panel { width: 320px; }
    }
    @media (max-width: 768px) {
      .inbox-list-panel {
        width: 100%;
        border-right: none;
      }
      .inbox-detail-panel {
        position: fixed;
        inset: 0;
        z-index: 300;
        transform: translateX(100%);
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .inbox-detail-panel.open {
        transform: translateX(0);
      }
      .detail-back-btn {
        display: inline-flex;
      }
      .inbox-fab {
        bottom: 20px;
        right: 20px;
      }
    }
  `;
  document.head.appendChild(style);
}
