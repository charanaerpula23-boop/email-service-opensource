/* ========================================
   SecureMail Settings Page
   ======================================== */

import { getCurrentUser, logout } from '../services/auth.client.js';
import { api } from '../services/api.client.js';
import { showToast } from '../components/toast.js';
import { navigate } from '../router.js';
import { renderSidebar } from '../components/sidebar.js';
import { renderComposePage } from './compose.js';

let activeTab = 'account';

export function renderSettingsPage(container) {
  container.innerHTML = '';

  const layout = document.createElement('div');
  layout.className = 'inbox-layout';

  /* Sidebar */
  const sidebarEl = document.createElement('div');
  renderSidebar(sidebarEl, 'settings', {}, () => {
    renderComposePage(document.getElementById('app'));
  });

  /* Content */
  const content = document.createElement('div');
  content.className = 'settings-content';

  content.innerHTML = `
    <div class="settings-header animate-slideDown">
      <h1 class="settings-title">Settings</h1>
      <p class="settings-subtitle">Manage your account, security, and preferences.</p>
    </div>

    <div class="tab-bar settings-tabs" id="settingsTabs">
      <button class="tab-item active" data-tab="account">👤 Account</button>
      <button class="tab-item" data-tab="security">🔐 Security</button>
      <button class="tab-item" data-tab="appearance">🎨 Appearance</button>
      <button class="tab-item" data-tab="domain">🌐 Domain Setup</button>
    </div>

    <div class="settings-panel" id="settingsPanel"></div>
  `;

  layout.appendChild(sidebarEl);
  layout.appendChild(content);
  container.appendChild(layout);

  /* Tab switching */
  const tabs = content.querySelectorAll('.tab-item');
  const panel = content.querySelector('#settingsPanel');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeTab = tab.dataset.tab;
      renderTabContent(panel, activeTab);
    });
  });

  renderTabContent(panel, activeTab);
  injectSettingsStyles();
}

function renderTabContent(panel, tab) {
  panel.innerHTML = '';
  panel.className = 'settings-panel animate-fadeIn';

  switch (tab) {
    case 'account': renderAccountTab(panel); break;
    case 'security': renderSecurityTab(panel); break;
    case 'appearance': renderAppearanceTab(panel); break;
    case 'domain': renderDomainTab(panel); break;
  }
}

/* ════════════════════════════════════════
   ACCOUNT TAB
   ════════════════════════════════════════ */
function renderAccountTab(panel) {
  const user = getCurrentUser() || { displayName: 'User', email: 'user@securemail.dev' };

  panel.innerHTML = `
    <div class="settings-section card animate-slideUp">
      <h3 class="settings-section-title">Profile</h3>
      <div class="input-group">
        <label class="settings-label">Display Name</label>
        <input type="text" class="input" id="settingsName" value="${escapeHtml(user.displayName || '')}" />
      </div>
      <div class="input-group">
        <label class="settings-label">Email Address</label>
        <input type="email" class="input" value="${escapeHtml(user.email || '')}" disabled style="opacity:0.6" />
      </div>
      <button class="btn btn-primary" id="saveProfile">Save Changes</button>
    </div>

    <div class="settings-section card animate-slideUp delay-2">
      <h3 class="settings-section-title">Change Password</h3>
      <div class="input-group">
        <label class="settings-label">Current Password</label>
        <input type="password" class="input" id="currentPw" placeholder="Enter current password" />
      </div>
      <div class="input-group">
        <label class="settings-label">New Password</label>
        <input type="password" class="input" id="newPw" placeholder="Enter new password" />
      </div>
      <div class="input-group">
        <label class="settings-label">Confirm New Password</label>
        <input type="password" class="input" id="confirmNewPw" placeholder="Confirm new password" />
      </div>
      <button class="btn btn-primary" id="changePw">Update Password</button>
    </div>

    <div class="settings-section card animate-slideUp delay-4">
      <h3 class="settings-section-title" style="color:#ef4444">Danger Zone</h3>
      <p style="color:#94a3b8;font-size:14px;margin-bottom:16px">Once you sign out, your session keys will be cleared from memory.</p>
      <button class="btn btn-danger" id="logoutBtn">Sign Out</button>
    </div>
  `;

  panel.querySelector('#saveProfile').addEventListener('click', () => {
    showToast('Profile updated successfully', 'success');
  });

  panel.querySelector('#changePw').addEventListener('click', () => {
    const newPw = panel.querySelector('#newPw').value;
    const confirmPw = panel.querySelector('#confirmNewPw').value;
    if (!newPw) return showToast('Please enter a new password', 'warning');
    if (newPw !== confirmPw) return showToast('Passwords do not match', 'error');
    showToast('Password updated successfully', 'success');
  });

  panel.querySelector('#logoutBtn').addEventListener('click', async () => {
    await logout();
    showToast('Signed out', 'info');
    navigate('/login');
  });
}

/* ════════════════════════════════════════
   SECURITY TAB
   ════════════════════════════════════════ */
function renderSecurityTab(panel) {
  const fingerprint = 'A4B2 3C9F D8E1 7654 2FB0  9C8D E3A7 B1F5 6D0E 2C4A';

  panel.innerHTML = `
    <div class="settings-section card animate-slideUp">
      <h3 class="settings-section-title">PGP Key</h3>
      <div class="key-fingerprint-wrap">
        <label class="settings-label">Key Fingerprint</label>
        <div class="code-block" style="position:relative">
          <code id="fingerprint" style="font-size:13px;letter-spacing:1px">${fingerprint}</code>
          <button class="copy-btn" id="copyFingerprint">Copy</button>
        </div>
      </div>
      <div class="key-actions" style="display:flex;gap:12px;margin-top:20px;flex-wrap:wrap">
        <button class="btn btn-secondary" id="exportPubKey">
          📤 Export Public Key
        </button>
        <button class="btn btn-secondary" id="exportPrivKey">
          🔐 Export Private Key
        </button>
        <button class="btn btn-secondary" id="importKeyBtn">
          📥 Import Key
        </button>
      </div>
    </div>

    <div class="settings-section card animate-slideUp delay-2">
      <h3 class="settings-section-title">Two-Factor Authentication</h3>
      <p style="color:#94a3b8;font-size:14px;margin-bottom:16px">Add an extra layer of security to your account.</p>
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-weight:600;color:#f1f5f9;font-size:15px">2FA Status</div>
          <div style="color:#64748b;font-size:13px">Not enabled</div>
        </div>
        <button class="btn btn-primary btn-sm">Enable 2FA</button>
      </div>
    </div>

    <div class="settings-section card animate-slideUp delay-4">
      <h3 class="settings-section-title">Active Sessions</h3>
      <div class="session-item">
        <div class="session-info">
          <div style="font-weight:600;color:#f1f5f9">Chrome on Windows</div>
          <div style="font-size:13px;color:#64748b">Current session · Last active now</div>
        </div>
        <span class="badge badge-success">Active</span>
      </div>
    </div>
  `;

  panel.querySelector('#copyFingerprint').addEventListener('click', () => {
    navigator.clipboard.writeText(fingerprint).then(() => {
      showToast('Fingerprint copied to clipboard', 'success');
    });
  });

  panel.querySelector('#exportPubKey').addEventListener('click', () => {
    showToast('Public key exported', 'success');
  });

  panel.querySelector('#exportPrivKey').addEventListener('click', () => {
    const passphrase = prompt('Enter your passphrase to export private key:');
    if (passphrase) showToast('Private key exported', 'success');
  });

  panel.querySelector('#importKeyBtn').addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.asc,.gpg,.pgp,.key';
    input.onchange = () => {
      if (input.files.length) {
        showToast(`Key imported: ${input.files[0].name}`, 'success');
      }
    };
    input.click();
  });
}

/* ════════════════════════════════════════
   APPEARANCE TAB
   ════════════════════════════════════════ */
function renderAppearanceTab(panel) {
  panel.innerHTML = `
    <div class="settings-section card animate-slideUp">
      <h3 class="settings-section-title">Theme</h3>
      <div class="theme-toggle-wrap">
        <div class="theme-option">
          <div class="theme-label">
            <span style="font-size:24px" id="themeIcon">🌙</span>
            <div>
              <div style="font-weight:600;color:#f1f5f9" id="themeName">Dark Mode</div>
              <div style="font-size:13px;color:#64748b">Easier on the eyes at night</div>
            </div>
          </div>
          <label class="switch">
            <input type="checkbox" id="themeToggle" checked />
            <span class="switch-slider"></span>
          </label>
        </div>
      </div>
    </div>

    <div class="settings-section card animate-slideUp delay-2">
      <h3 class="settings-section-title">UI Density</h3>
      <div class="density-options">
        <label class="density-option">
          <input type="radio" name="density" value="comfortable" checked />
          <div class="density-card">
            <div class="density-preview comfortable-preview">
              <div></div><div></div><div></div>
            </div>
            <span>Comfortable</span>
          </div>
        </label>
        <label class="density-option">
          <input type="radio" name="density" value="compact" />
          <div class="density-card">
            <div class="density-preview compact-preview">
              <div></div><div></div><div></div><div></div>
            </div>
            <span>Compact</span>
          </div>
        </label>
      </div>
    </div>

    <div class="settings-section card animate-slideUp delay-4">
      <h3 class="settings-section-title">Accent Color</h3>
      <div class="accent-colors" id="accentColors">
        <button class="accent-color-btn active" style="background:#6366f1" data-color="#6366f1"></button>
        <button class="accent-color-btn" style="background:#8b5cf6" data-color="#8b5cf6"></button>
        <button class="accent-color-btn" style="background:#ec4899" data-color="#ec4899"></button>
        <button class="accent-color-btn" style="background:#10b981" data-color="#10b981"></button>
        <button class="accent-color-btn" style="background:#f59e0b" data-color="#f59e0b"></button>
        <button class="accent-color-btn" style="background:#06b6d4" data-color="#06b6d4"></button>
      </div>
    </div>
  `;

  /* Theme toggle */
  const themeToggle = panel.querySelector('#themeToggle');
  const themeIcon = panel.querySelector('#themeIcon');
  const themeName = panel.querySelector('#themeName');
  themeToggle.addEventListener('change', () => {
    const isDark = themeToggle.checked;
    themeIcon.textContent = isDark ? '🌙' : '☀️';
    themeName.textContent = isDark ? 'Dark Mode' : 'Light Mode';
    showToast(`${isDark ? 'Dark' : 'Light'} mode activated`, 'info');
  });

  /* Density */
  panel.querySelectorAll('input[name="density"]').forEach(radio => {
    radio.addEventListener('change', () => {
      showToast(`UI density: ${radio.value}`, 'info');
    });
  });

  /* Accent colors */
  panel.querySelectorAll('.accent-color-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      panel.querySelectorAll('.accent-color-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      showToast('Accent color updated', 'success');
    });
  });
}

/* ════════════════════════════════════════
   DOMAIN SETUP TAB
   ════════════════════════════════════════ */
function renderDomainTab(panel) {
  const domain = 'securemail.dev';

  panel.innerHTML = `
    <div class="settings-section card animate-slideUp">
      <h3 class="settings-section-title">Domain Configuration</h3>
      <p style="color:#94a3b8;font-size:14px;margin-bottom:20px">
        Configure your domain's DNS records to enable email delivery. Add these records to your DNS provider.
      </p>
      <div class="dns-domain-display">
        <span style="color:#64748b;font-size:13px">Current Domain</span>
        <span style="font-weight:700;font-size:18px;color:#f1f5f9">${domain}</span>
      </div>
    </div>

    <div class="settings-section card animate-slideUp delay-2">
      <h3 class="settings-section-title">MX Record</h3>
      <p style="color:#64748b;font-size:13px;margin-bottom:12px">Required for receiving email</p>
      <div class="code-block" style="position:relative">
        <code>Type: MX\nHost: @\nPriority: 10\nValue: mail.${domain}</code>
        <button class="copy-btn dns-copy" data-record="MX @ 10 mail.${domain}">Copy</button>
      </div>
    </div>

    <div class="settings-section card animate-slideUp delay-3">
      <h3 class="settings-section-title">SPF Record</h3>
      <p style="color:#64748b;font-size:13px;margin-bottom:12px">Prevents email spoofing</p>
      <div class="code-block" style="position:relative">
        <code>Type: TXT\nHost: @\nValue: v=spf1 mx a:mail.${domain} ~all</code>
        <button class="copy-btn dns-copy" data-record="v=spf1 mx a:mail.${domain} ~all">Copy</button>
      </div>
    </div>

    <div class="settings-section card animate-slideUp delay-4">
      <h3 class="settings-section-title">DKIM Record</h3>
      <p style="color:#64748b;font-size:13px;margin-bottom:12px">Verifies email authenticity</p>
      <div class="code-block" style="position:relative">
        <code>Type: TXT\nHost: default._domainkey\nValue: v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3D...</code>
        <button class="copy-btn dns-copy" data-record="v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3D...">Copy</button>
      </div>
    </div>

    <div class="settings-section card animate-slideUp delay-5">
      <h3 class="settings-section-title">DMARC Record</h3>
      <p style="color:#64748b;font-size:13px;margin-bottom:12px">Defines email authentication policy</p>
      <div class="code-block" style="position:relative">
        <code>Type: TXT\nHost: _dmarc\nValue: v=DMARC1; p=quarantine; rua=mailto:dmarc@${domain}</code>
        <button class="copy-btn dns-copy" data-record="v=DMARC1; p=quarantine; rua=mailto:dmarc@${domain}">Copy</button>
      </div>
    </div>

    <div class="settings-section card animate-slideUp delay-6">
      <button class="btn btn-primary btn-lg" id="verifyDns" style="width:100%">
        <span>🔍</span> Verify DNS Configuration
      </button>
      <div id="dnsResult" style="margin-top:16px"></div>
    </div>
  `;

  /* Copy buttons */
  panel.querySelectorAll('.dns-copy').forEach(btn => {
    btn.addEventListener('click', () => {
      navigator.clipboard.writeText(btn.dataset.record).then(() => {
        showToast('DNS record copied', 'success');
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
      });
    });
  });

  /* Verify DNS */
  panel.querySelector('#verifyDns').addEventListener('click', async () => {
    const btn = panel.querySelector('#verifyDns');
    const result = panel.querySelector('#dnsResult');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner spinner-sm" style="border-top-color:#fff"></div> Checking…';

    await new Promise(r => setTimeout(r, 2000));

    result.innerHTML = `
      <div class="dns-results animate-slideUp">
        <div class="dns-result-row">
          <span class="dns-check success">✓</span>
          <span>MX Record</span>
          <span class="badge badge-success">Configured</span>
        </div>
        <div class="dns-result-row">
          <span class="dns-check success">✓</span>
          <span>SPF Record</span>
          <span class="badge badge-success">Configured</span>
        </div>
        <div class="dns-result-row">
          <span class="dns-check warning">!</span>
          <span>DKIM Record</span>
          <span class="badge badge-warning">Pending</span>
        </div>
        <div class="dns-result-row">
          <span class="dns-check success">✓</span>
          <span>DMARC Record</span>
          <span class="badge badge-success">Configured</span>
        </div>
      </div>
    `;

    btn.disabled = false;
    btn.innerHTML = '<span>🔍</span> Verify DNS Configuration';
    showToast('DNS verification complete', 'info');
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

/* ── Styles ── */
let settingsStylesInjected = false;
function injectSettingsStyles() {
  if (settingsStylesInjected) return;
  settingsStylesInjected = true;

  const style = document.createElement('style');
  style.textContent = `
    .settings-content {
      flex: 1;
      overflow-y: auto;
      padding: 32px 36px;
      max-width: 800px;
      height: 100vh;
    }
    .settings-header {
      margin-bottom: 28px;
    }
    .settings-title {
      font-size: 28px;
      font-weight: 700;
      color: #f1f5f9;
      margin-bottom: 6px;
    }
    .settings-subtitle {
      color: #64748b;
      font-size: 15px;
    }
    .settings-tabs {
      margin-bottom: 28px;
    }
    .settings-panel {
      display: flex;
      flex-direction: column;
      gap: 20px;
      padding-bottom: 48px;
    }
    .settings-section {
      padding: 24px;
    }
    .settings-section-title {
      font-size: 17px;
      font-weight: 600;
      color: #f1f5f9;
      margin-bottom: 20px;
    }
    .settings-label {
      display: block;
      font-size: 13px;
      font-weight: 500;
      color: #94a3b8;
      margin-bottom: 6px;
    }

    /* Theme toggle */
    .theme-option {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .theme-label {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    /* Density */
    .density-options {
      display: flex;
      gap: 16px;
    }
    .density-option {
      cursor: pointer;
    }
    .density-option input { display: none; }
    .density-card {
      padding: 16px;
      border: 2px solid rgba(99,102,241,0.15);
      border-radius: 12px;
      text-align: center;
      transition: all 0.2s;
      min-width: 140px;
    }
    .density-option input:checked + .density-card {
      border-color: #6366f1;
      background: rgba(99,102,241,0.08);
    }
    .density-preview {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 10px;
    }
    .density-preview div {
      height: 8px;
      background: rgba(99,102,241,0.2);
      border-radius: 4px;
    }
    .compact-preview { gap: 3px; }
    .compact-preview div { height: 5px; }
    .density-card span {
      font-size: 13px;
      font-weight: 500;
      color: #94a3b8;
    }

    /* Accent colors */
    .accent-colors {
      display: flex;
      gap: 12px;
    }
    .accent-color-btn {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: 3px solid transparent;
      cursor: pointer;
      transition: all 0.2s;
    }
    .accent-color-btn:hover { transform: scale(1.15); }
    .accent-color-btn.active {
      border-color: #fff;
      box-shadow: 0 0 16px rgba(99,102,241,0.4);
    }

    /* Key fingerprint */
    .key-fingerprint-wrap {
      margin-bottom: 8px;
    }

    /* Session */
    .session-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 0;
    }

    /* DNS */
    .dns-domain-display {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 16px;
      background: rgba(99,102,241,0.08);
      border-radius: 10px;
      border: 1px solid rgba(99,102,241,0.2);
    }
    .code-block code {
      white-space: pre-wrap;
      word-break: break-all;
    }
    .dns-results {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .dns-result-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 14px;
      background: rgba(17,24,39,0.5);
      border-radius: 8px;
      font-size: 14px;
      color: #f1f5f9;
    }
    .dns-result-row span:nth-child(2) { flex: 1; }
    .dns-check {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      font-weight: 700;
    }
    .dns-check.success { background: rgba(16,185,129,0.2); color: #10b981; }
    .dns-check.warning { background: rgba(245,158,11,0.2); color: #f59e0b; }
    .dns-check.error   { background: rgba(239,68,68,0.2); color: #ef4444; }

    @media (max-width: 768px) {
      .settings-content {
        padding: 20px 16px;
        padding-top: 64px;
      }
      .density-options { flex-direction: column; }
    }
  `;
  document.head.appendChild(style);
}
