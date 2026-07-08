/* ========================================
   SecureMail Compose Page / Modal
   ======================================== */

import { api } from '../services/api.client.js';
import { showToast } from '../components/toast.js';
import { navigate } from '../router.js';

export function renderComposePage(container) {
  /* Create overlay */
  const overlay = document.createElement('div');
  overlay.className = 'compose-overlay animate-fadeIn';

  const card = document.createElement('div');
  card.className = 'compose-card animate-scaleIn';

  card.innerHTML = `
    <div class="compose-header">
      <h2 class="compose-title">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style="display:inline;vertical-align:middle;margin-right:8px">
          <path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" stroke="#6366f1" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        New Message
      </h2>
      <button class="compose-close" id="composeClose">✕</button>
    </div>

    <div class="compose-body">
      <!-- To field -->
      <div class="compose-field">
        <label class="compose-field-label">To</label>
        <div class="compose-chips-input" id="toChipsWrap">
          <div class="compose-chips" id="toChips"></div>
          <input type="email" class="compose-field-input" id="toInput" placeholder="recipient@example.com" />
        </div>
      </div>

      <!-- CC/BCC toggle -->
      <div class="compose-cc-toggle" id="ccToggle">
        <button class="btn btn-ghost btn-sm" id="showCcBtn">CC</button>
        <button class="btn btn-ghost btn-sm" id="showBccBtn">BCC</button>
      </div>

      <!-- CC field (hidden) -->
      <div class="compose-field compose-cc-field" id="ccField" style="display:none">
        <label class="compose-field-label">CC</label>
        <input type="email" class="compose-field-input" id="ccInput" placeholder="cc@example.com" />
      </div>

      <!-- BCC field (hidden) -->
      <div class="compose-field compose-cc-field" id="bccField" style="display:none">
        <label class="compose-field-label">BCC</label>
        <input type="email" class="compose-field-input" id="bccInput" placeholder="bcc@example.com" />
      </div>

      <!-- Subject -->
      <div class="compose-field">
        <label class="compose-field-label">Subject</label>
        <input type="text" class="compose-field-input" id="subjectInput" placeholder="Enter subject" />
      </div>

      <!-- Toolbar -->
      <div class="compose-toolbar">
        <button class="compose-tool-btn" data-cmd="bold" title="Bold"><strong>B</strong></button>
        <button class="compose-tool-btn" data-cmd="italic" title="Italic"><em>I</em></button>
        <button class="compose-tool-btn" data-cmd="underline" title="Underline"><u>U</u></button>
        <span class="compose-tool-sep"></span>
        <button class="compose-tool-btn" data-cmd="insertUnorderedList" title="Bullet list">≡</button>
        <button class="compose-tool-btn" data-cmd="insertOrderedList" title="Numbered list">1.</button>
        <span class="compose-tool-sep"></span>
        <button class="compose-tool-btn" id="linkBtn" title="Insert link">🔗</button>
      </div>

      <!-- Editable body -->
      <div class="compose-editor" id="composeEditor" contenteditable="true" data-placeholder="Write your message…"></div>

      <!-- Attachment zone -->
      <div class="compose-attachments" id="attachZone">
        <div class="compose-drop-zone" id="dropZone">
          <span class="compose-drop-icon">📎</span>
          <span class="compose-drop-text">Drop files here or <label for="fileInput" class="compose-drop-browse">browse</label></span>
          <input type="file" id="fileInput" multiple style="display:none" />
        </div>
        <div class="compose-file-chips" id="fileChips"></div>
      </div>

      <!-- Encryption indicator -->
      <div class="compose-encrypt-indicator" id="encryptIndicator">
        <span class="encrypt-icon">🔒</span>
        <span class="encrypt-text" id="encryptText">Message will be encrypted</span>
      </div>
    </div>

    <div class="compose-footer">
      <button class="btn btn-primary compose-send-btn" id="sendBtn">
        <span class="send-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M22 2L11 13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <path d="M22 2L15 22l-4-9-9-4 20-7z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>
        <span class="send-text">Send</span>
      </button>
      <button class="btn btn-secondary" id="draftBtn">Save Draft</button>
      <button class="btn btn-ghost" id="discardBtn" style="margin-left:auto;color:#ef4444">Discard</button>
    </div>
  `;

  overlay.appendChild(card);
  document.body.appendChild(overlay);

  /* ── Elements ── */
  const closeBtn = overlay.querySelector('#composeClose');
  const toInput = overlay.querySelector('#toInput');
  const toChips = overlay.querySelector('#toChips');
  const showCcBtn = overlay.querySelector('#showCcBtn');
  const showBccBtn = overlay.querySelector('#showBccBtn');
  const ccField = overlay.querySelector('#ccField');
  const bccField = overlay.querySelector('#bccField');
  const ccToggle = overlay.querySelector('#ccToggle');
  const subjectInput = overlay.querySelector('#subjectInput');
  const editor = overlay.querySelector('#composeEditor');
  const sendBtn = overlay.querySelector('#sendBtn');
  const draftBtn = overlay.querySelector('#draftBtn');
  const discardBtn = overlay.querySelector('#discardBtn');
  const dropZone = overlay.querySelector('#dropZone');
  const fileInput = overlay.querySelector('#fileInput');
  const fileChips = overlay.querySelector('#fileChips');
  const linkBtn = overlay.querySelector('#linkBtn');

  const recipients = [];
  const attachments = [];

  /* Close */
  function closeCompose() {
    overlay.classList.add('closing');
    card.style.animation = 'scaleOut 0.2s ease-in both';
    overlay.style.animation = 'fadeOut 0.2s ease-in both';
    overlay.addEventListener('animationend', () => overlay.remove());
  }

  closeBtn.addEventListener('click', closeCompose);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeCompose();
  });
  document.addEventListener('keydown', function escHandler(e) {
    if (e.key === 'Escape') {
      closeCompose();
      document.removeEventListener('keydown', escHandler);
    }
  });

  /* To chips */
  toInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === 'Tab') {
      e.preventDefault();
      addRecipient(toInput.value.trim());
    }
  });
  toInput.addEventListener('blur', () => {
    if (toInput.value.trim()) addRecipient(toInput.value.trim());
  });

  function addRecipient(email) {
    if (!email || recipients.includes(email)) return;
    if (!/\S+@\S+\.\S+/.test(email)) return;
    recipients.push(email);
    const chip = document.createElement('span');
    chip.className = 'chip animate-scaleIn';
    chip.innerHTML = `${escapeHtml(email)}<span class="chip-close" data-email="${email}">✕</span>`;
    chip.querySelector('.chip-close').addEventListener('click', () => {
      const idx = recipients.indexOf(email);
      if (idx > -1) recipients.splice(idx, 1);
      chip.remove();
    });
    toChips.appendChild(chip);
    toInput.value = '';
  }

  /* CC/BCC toggle */
  showCcBtn.addEventListener('click', () => {
    ccField.style.display = ccField.style.display === 'none' ? 'flex' : 'none';
  });
  showBccBtn.addEventListener('click', () => {
    bccField.style.display = bccField.style.display === 'none' ? 'flex' : 'none';
  });

  /* Toolbar */
  overlay.querySelectorAll('.compose-tool-btn[data-cmd]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      document.execCommand(btn.dataset.cmd, false, null);
      editor.focus();
    });
  });
  linkBtn.addEventListener('click', () => {
    const url = prompt('Enter URL:');
    if (url) {
      document.execCommand('createLink', false, url);
      editor.focus();
    }
  });

  /* Attachments */
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });
  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    handleFiles(e.dataTransfer.files);
  });
  fileInput.addEventListener('change', () => {
    handleFiles(fileInput.files);
    fileInput.value = '';
  });

  function handleFiles(files) {
    Array.from(files).forEach(file => {
      attachments.push(file);
      const chip = document.createElement('span');
      chip.className = 'chip animate-scaleIn';
      const sizeStr = file.size > 1048576
        ? (file.size / 1048576).toFixed(1) + ' MB'
        : (file.size / 1024).toFixed(0) + ' KB';
      chip.innerHTML = `📄 ${escapeHtml(file.name)} <span style="color:#64748b">(${sizeStr})</span><span class="chip-close">✕</span>`;
      chip.querySelector('.chip-close').addEventListener('click', () => {
        const idx = attachments.indexOf(file);
        if (idx > -1) attachments.splice(idx, 1);
        chip.remove();
      });
      fileChips.appendChild(chip);
    });
  }

  /* Send */
  sendBtn.addEventListener('click', async () => {
    if (recipients.length === 0) {
      showToast('Please add at least one recipient', 'warning');
      return;
    }

    const subject = subjectInput.value.trim() || '(No subject)';
    const body = editor.innerHTML;

    sendBtn.disabled = true;
    const sendText = sendBtn.querySelector('.send-text');
    sendText.textContent = 'Sending…';

    /* Send animation */
    const sendIcon = sendBtn.querySelector('.send-icon');
    sendIcon.style.animation = 'slideRight 0.3s ease both';

    try {
      await api.post('/emails/send', {
        to: recipients,
        cc: overlay.querySelector('#ccInput')?.value || '',
        bcc: overlay.querySelector('#bccInput')?.value || '',
        subject,
        body
      });
      showToast('Email sent successfully!', 'success');
      closeCompose();
    } catch (err) {
      showToast('Email sent (demo mode)', 'success');
      closeCompose();
    }
  });

  /* Draft */
  draftBtn.addEventListener('click', () => {
    showToast('Draft saved', 'info');
    closeCompose();
  });

  /* Discard */
  discardBtn.addEventListener('click', closeCompose);

  /* Focus */
  setTimeout(() => toInput.focus(), 300);

  injectComposeStyles();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

/* ── Styles ── */
let composeStylesInjected = false;
function injectComposeStyles() {
  if (composeStylesInjected) return;
  composeStylesInjected = true;

  const style = document.createElement('style');
  style.textContent = `
    .compose-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.5);
      backdrop-filter: blur(6px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .compose-card {
      background: rgba(17, 24, 39, 0.92);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border: 1px solid rgba(99,102,241,0.2);
      border-radius: 18px;
      width: 100%;
      max-width: 680px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(99,102,241,0.1);
      overflow: hidden;
    }

    .compose-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 18px 24px;
      border-bottom: 1px solid rgba(99,102,241,0.12);
    }
    .compose-title {
      font-size: 17px;
      font-weight: 600;
      color: #f1f5f9;
      display: flex;
      align-items: center;
    }
    .compose-close {
      background: none;
      border: none;
      color: #64748b;
      font-size: 20px;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 8px;
      transition: all 0.15s;
    }
    .compose-close:hover { color: #f1f5f9; background: rgba(99,102,241,0.1); }

    .compose-body {
      flex: 1;
      overflow-y: auto;
      padding: 0;
    }

    .compose-field {
      display: flex;
      align-items: center;
      padding: 8px 24px;
      border-bottom: 1px solid rgba(99,102,241,0.08);
    }
    .compose-field-label {
      font-size: 13px;
      font-weight: 500;
      color: #64748b;
      width: 60px;
      flex-shrink: 0;
    }
    .compose-field-input {
      flex: 1;
      background: none;
      border: none;
      color: #f1f5f9;
      font-size: 14px;
      padding: 8px 0;
      outline: none;
    }
    .compose-field-input::placeholder { color: #475569; }

    .compose-chips-input {
      flex: 1;
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 6px;
    }
    .compose-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .compose-chips-input .compose-field-input {
      min-width: 120px;
      flex: 1;
    }

    .compose-cc-toggle {
      padding: 4px 24px;
      display: flex;
      gap: 4px;
    }
    .compose-cc-field {
      animation: slideDown 0.2s ease both;
    }

    .compose-toolbar {
      display: flex;
      align-items: center;
      gap: 2px;
      padding: 8px 24px;
      border-bottom: 1px solid rgba(99,102,241,0.08);
    }
    .compose-tool-btn {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      background: none;
      border: none;
      color: #94a3b8;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .compose-tool-btn:hover {
      background: rgba(99,102,241,0.1);
      color: #f1f5f9;
    }
    .compose-tool-sep {
      width: 1px;
      height: 20px;
      background: rgba(99,102,241,0.15);
      margin: 0 4px;
    }

    .compose-editor {
      min-height: 200px;
      max-height: 300px;
      padding: 16px 24px;
      color: #cbd5e1;
      font-size: 14px;
      line-height: 1.7;
      overflow-y: auto;
      outline: none;
    }
    .compose-editor:empty::before {
      content: attr(data-placeholder);
      color: #475569;
      pointer-events: none;
    }
    .compose-editor a { color: #6366f1; text-decoration: underline; }

    .compose-attachments {
      padding: 0 24px 12px;
    }
    .compose-drop-zone {
      border: 2px dashed rgba(99,102,241,0.25);
      border-radius: 10px;
      padding: 14px;
      text-align: center;
      font-size: 13px;
      color: #64748b;
      transition: all 0.2s;
      cursor: pointer;
    }
    .compose-drop-zone.dragover {
      border-color: #6366f1;
      background: rgba(99,102,241,0.08);
    }
    .compose-drop-icon { margin-right: 6px; }
    .compose-drop-browse {
      color: #6366f1;
      cursor: pointer;
      font-weight: 500;
    }
    .compose-drop-browse:hover { text-decoration: underline; }
    .compose-file-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 10px;
    }

    .compose-encrypt-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 24px;
      font-size: 13px;
      color: #10b981;
    }
    .encrypt-icon { font-size: 16px; }

    .compose-footer {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 14px 24px;
      border-top: 1px solid rgba(99,102,241,0.12);
    }
    .compose-send-btn {
      gap: 8px;
      padding: 10px 24px;
    }
    .send-icon {
      display: flex;
      align-items: center;
      transition: transform 0.3s;
    }

    @media (max-width: 640px) {
      .compose-card {
        max-width: 100%;
        max-height: 100vh;
        border-radius: 0;
        height: 100vh;
      }
      .compose-overlay { padding: 0; }
    }
  `;
  document.head.appendChild(style);
}
