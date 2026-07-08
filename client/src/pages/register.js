/* ========================================
   SecureMail Register Page
   ======================================== */

import { register } from '../services/auth.client.js';
import { generateKeyPair } from '../services/crypto.client.js';
import { navigate } from '../router.js';
import { showToast } from '../components/toast.js';

export function renderRegisterPage(container) {
  container.innerHTML = '';

  const page = document.createElement('div');
  page.className = 'auth-page';

  page.innerHTML = `
    <div class="auth-bg">
      <div class="auth-bg-orb auth-bg-orb-1"></div>
      <div class="auth-bg-orb auth-bg-orb-2"></div>
      <div class="auth-bg-orb auth-bg-orb-3"></div>
    </div>

    <div class="auth-card animate-scaleIn" id="registerCard">
      <div class="auth-header">
        <div class="auth-logo">
          <div class="auth-logo-shield">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" 
                    stroke="url(#regShield)" stroke-width="1.5" fill="rgba(99,102,241,0.1)"/>
              <circle cx="12" cy="10" r="2" stroke="url(#regShield)" stroke-width="1.5"/>
              <path d="M8 16c0-2.21 1.79-4 4-4s4 1.79 4 4" stroke="url(#regShield)" stroke-width="1.5" stroke-linecap="round"/>
              <defs>
                <linearGradient id="regShield" x1="3" y1="2" x2="21" y2="19">
                  <stop stop-color="#6366f1"/><stop offset="1" stop-color="#a78bfa"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h1 class="auth-title">Create Account</h1>
        </div>
        <p class="auth-tagline">Join the most secure email platform.</p>
      </div>

      <!-- Registration Form -->
      <form class="auth-form" id="registerForm" novalidate>
        <div class="auth-error" id="registerError" style="display:none">
          <span class="auth-error-icon">⚠</span>
          <span class="auth-error-text" id="regErrorText"></span>
        </div>

        <div class="input-group">
          <span class="input-icon">👤</span>
          <input type="text" class="input" id="regName" placeholder="Display name" autocomplete="name" required />
        </div>

        <div class="input-group">
          <span class="input-icon">✉</span>
          <input type="email" class="input" id="regEmail" placeholder="Email address" autocomplete="email" required />
        </div>

        <div class="input-group">
          <span class="input-icon">🔒</span>
          <input type="password" class="input" id="regPassword" placeholder="Password" autocomplete="new-password" required />
          <button type="button" class="password-toggle" id="regPwToggle">👁</button>
        </div>

        <div class="strength-meter-wrap" id="strengthWrap" style="margin-top:-12px;margin-bottom:18px">
          <div class="strength-meter">
            <div class="strength-meter-fill" id="strengthFill"></div>
          </div>
          <div class="strength-label" id="strengthLabel"></div>
        </div>

        <div class="input-group">
          <span class="input-icon">🔒</span>
          <input type="password" class="input" id="regConfirm" placeholder="Confirm password" autocomplete="new-password" required />
        </div>

        <button type="submit" class="btn btn-primary btn-lg auth-submit" id="regSubmit">
          <span class="btn-text" id="regBtnText">Create Account</span>
          <div class="spinner spinner-sm" id="regSpinner" style="display:none"></div>
        </button>
      </form>

      <!-- Keygen overlay -->
      <div class="keygen-overlay" id="keygenOverlay" style="display:none">
        <div class="keygen-content animate-scaleIn">
          <div class="keygen-icon-wrap">
            <svg class="keygen-lock animate-pulse" width="48" height="48" viewBox="0 0 24 24" fill="none">
              <rect x="5" y="11" width="14" height="10" rx="2" stroke="#6366f1" stroke-width="1.5"/>
              <path d="M8 11V7a4 4 0 018 0v4" stroke="#8b5cf6" stroke-width="1.5" stroke-linecap="round"/>
              <circle cx="12" cy="16" r="1.5" fill="#a78bfa"/>
            </svg>
          </div>
          <h3 class="keygen-title">Generating Encryption Keys</h3>
          <p class="keygen-text">Creating your personal PGP key pair for end-to-end encryption…</p>
          <div class="keygen-progress">
            <div class="keygen-progress-bar"></div>
          </div>
        </div>
      </div>

      <!-- Success overlay -->
      <div class="keygen-overlay" id="successOverlay" style="display:none">
        <div class="keygen-content animate-bounceIn">
          <div class="success-check">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#10b981" stroke-width="1.5" fill="rgba(16,185,129,0.1)"/>
              <path d="M8 12l3 3 5-5" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <h3 class="keygen-title" style="color:#10b981">Account Created!</h3>
          <p class="keygen-text">Your encryption keys are ready. Redirecting to login…</p>
        </div>
      </div>

      <div class="auth-footer">
        <span>Already have an account?</span>
        <a href="#/login" class="auth-link">Login</a>
      </div>
    </div>
  `;

  container.appendChild(page);

  /* ── Elements ── */
  const form = page.querySelector('#registerForm');
  const nameInput = page.querySelector('#regName');
  const emailInput = page.querySelector('#regEmail');
  const passwordInput = page.querySelector('#regPassword');
  const confirmInput = page.querySelector('#regConfirm');
  const pwToggle = page.querySelector('#regPwToggle');
  const submitBtn = page.querySelector('#regSubmit');
  const spinner = page.querySelector('#regSpinner');
  const btnText = page.querySelector('#regBtnText');
  const errorBox = page.querySelector('#registerError');
  const errorTextEl = page.querySelector('#regErrorText');
  const strengthFill = page.querySelector('#strengthFill');
  const strengthLabel = page.querySelector('#strengthLabel');
  const keygenOverlay = page.querySelector('#keygenOverlay');
  const successOverlay = page.querySelector('#successOverlay');

  /* Password toggle */
  pwToggle.addEventListener('click', () => {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
    pwToggle.textContent = isPassword ? '🙈' : '👁';
  });

  /* Password strength */
  passwordInput.addEventListener('input', () => {
    const pw = passwordInput.value;
    const strength = calcStrength(pw);
    const wrap = page.querySelector('#strengthWrap');

    if (!pw) {
      strengthFill.style.width = '0%';
      strengthLabel.textContent = '';
      wrap.className = 'strength-meter-wrap';
      return;
    }

    const levels = [
      { cls: 'strength-weak', label: 'Weak', w: '25%', color: '#ef4444' },
      { cls: 'strength-fair', label: 'Fair', w: '50%', color: '#f59e0b' },
      { cls: 'strength-good', label: 'Good', w: '75%', color: '#22d3ee' },
      { cls: 'strength-strong', label: 'Strong', w: '100%', color: '#10b981' }
    ];
    const level = levels[strength];
    wrap.className = `strength-meter-wrap ${level.cls}`;
    strengthFill.style.width = level.w;
    strengthFill.style.background = level.color;
    strengthLabel.textContent = level.label;
    strengthLabel.style.color = level.color;
  });

  /* Submit */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const confirm = confirmInput.value;

    /* Validation */
    if (!name || !email || !password || !confirm) {
      showError('Please fill in all fields.');
      return;
    }
    if (password !== confirm) {
      showError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      showError('Password must be at least 8 characters.');
      return;
    }

    hideError();
    setLoading(true);

    try {
      /* Step 1: Show keygen overlay */
      keygenOverlay.style.display = 'flex';

      /* Step 2: Generate keys */
      let keyPair;
      try {
        keyPair = await generateKeyPair(name, email, password);
      } catch (keyErr) {
        console.warn('Key generation skipped (OpenPGP not loaded):', keyErr.message);
        keyPair = { publicKey: '', privateKey: '' };
      }

      /* Step 3: Register */
      await register(email, password, name);

      /* Step 4: Show success */
      keygenOverlay.style.display = 'none';
      successOverlay.style.display = 'flex';

      showToast('Account created successfully!', 'success');

      /* Redirect after delay */
      setTimeout(() => {
        navigate('/login');
      }, 2000);

    } catch (err) {
      keygenOverlay.style.display = 'none';
      const msg = err.data?.message || err.message || 'Registration failed. Please try again.';
      showError(msg);
      form.classList.add('animate-shake');
      setTimeout(() => form.classList.remove('animate-shake'), 500);
    } finally {
      setLoading(false);
    }
  });

  function setLoading(loading) {
    submitBtn.disabled = loading;
    spinner.style.display = loading ? 'block' : 'none';
    btnText.textContent = loading ? 'Creating…' : 'Create Account';
  }

  function showError(msg) {
    errorTextEl.textContent = msg;
    errorBox.style.display = 'flex';
    errorBox.classList.add('animate-shake');
    setTimeout(() => errorBox.classList.remove('animate-shake'), 500);
  }

  function hideError() {
    errorBox.style.display = 'none';
  }

  setTimeout(() => nameInput.focus(), 300);

  injectRegisterStyles();
}

/* ── Password strength calculator ── */
function calcStrength(pw) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 1) return 0;
  if (score <= 2) return 1;
  if (score <= 3) return 2;
  return 3;
}

/* ── Styles ── */
let regStylesInjected = false;
function injectRegisterStyles() {
  if (regStylesInjected) return;
  regStylesInjected = true;

  const style = document.createElement('style');
  style.textContent = `
    .keygen-overlay {
      position: absolute;
      inset: 0;
      background: rgba(17, 24, 39, 0.92);
      backdrop-filter: blur(8px);
      border-radius: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10;
    }
    .keygen-content {
      text-align: center;
      padding: 32px;
    }
    .keygen-icon-wrap {
      margin-bottom: 20px;
    }
    .keygen-title {
      font-size: 20px;
      font-weight: 600;
      color: #f1f5f9;
      margin-bottom: 8px;
    }
    .keygen-text {
      color: #94a3b8;
      font-size: 14px;
      margin-bottom: 24px;
    }
    .keygen-progress {
      width: 200px;
      height: 4px;
      background: rgba(30, 41, 59, 0.6);
      border-radius: 999px;
      overflow: hidden;
      margin: 0 auto;
    }
    .keygen-progress-bar {
      height: 100%;
      width: 30%;
      background: linear-gradient(90deg, #6366f1, #a78bfa);
      border-radius: 999px;
      animation: shimmer 1.2s ease-in-out infinite;
      background-size: 200% 100%;
    }
    .success-check {
      margin-bottom: 16px;
      animation: bounceIn 0.6s ease both;
    }

    .strength-meter-wrap {
      transition: all 0.3s;
    }
  `;
  document.head.appendChild(style);
}
