/* ========================================
   SecureMail Login Page
   ======================================== */

import { login } from '../services/auth.client.js';
import { navigate } from '../router.js';
import { showToast } from '../components/toast.js';

export function renderLoginPage(container) {
  container.innerHTML = '';

  const page = document.createElement('div');
  page.className = 'auth-page';

  page.innerHTML = `
    <div class="auth-bg">
      <div class="auth-bg-orb auth-bg-orb-1"></div>
      <div class="auth-bg-orb auth-bg-orb-2"></div>
      <div class="auth-bg-orb auth-bg-orb-3"></div>
    </div>

    <div class="auth-card animate-scaleIn">
      <div class="auth-header">
        <div class="auth-logo">
          <div class="auth-logo-shield">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" 
                    stroke="url(#shieldGrad)" stroke-width="1.5" fill="rgba(99,102,241,0.1)"/>
              <path d="M9 12l2 2 4-4" stroke="url(#shieldGrad)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <defs>
                <linearGradient id="shieldGrad" x1="3" y1="2" x2="21" y2="19">
                  <stop stop-color="#6366f1"/><stop offset="1" stop-color="#a78bfa"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h1 class="auth-title">SecureMail</h1>
        </div>
        <p class="auth-tagline">End-to-end encrypted email, on your domain.</p>
      </div>

      <form class="auth-form" id="loginForm" novalidate>
        <div class="auth-error" id="loginError" style="display:none">
          <span class="auth-error-icon">⚠</span>
          <span class="auth-error-text"></span>
        </div>

        <div class="input-group">
          <span class="input-icon">✉</span>
          <input type="email" class="input" id="loginEmail" placeholder="Email address" autocomplete="email" required />
        </div>

        <div class="input-group">
          <span class="input-icon">🔒</span>
          <input type="password" class="input" id="loginPassword" placeholder="Password" autocomplete="current-password" required />
          <button type="button" class="password-toggle" id="loginPwToggle" aria-label="Show password">👁</button>
        </div>

        <div class="auth-row">
          <label class="checkbox-group">
            <input type="checkbox" id="rememberMe" />
            <span>Remember me</span>
          </label>
          <a href="#" class="auth-link-sm">Forgot password?</a>
        </div>

        <button type="submit" class="btn btn-primary btn-lg auth-submit" id="loginSubmit">
          <span class="btn-text">Sign In</span>
          <div class="spinner spinner-sm" id="loginSpinner" style="display:none"></div>
        </button>
      </form>

      <div class="auth-footer">
        <span>Don't have an account?</span>
        <a href="#/register" class="auth-link">Register</a>
      </div>
    </div>
  `;

  container.appendChild(page);

  /* ── Event handlers ── */
  const form = page.querySelector('#loginForm');
  const emailInput = page.querySelector('#loginEmail');
  const passwordInput = page.querySelector('#loginPassword');
  const pwToggle = page.querySelector('#loginPwToggle');
  const submitBtn = page.querySelector('#loginSubmit');
  const spinner = page.querySelector('#loginSpinner');
  const btnText = page.querySelector('.btn-text');
  const errorBox = page.querySelector('#loginError');
  const errorText = page.querySelector('.auth-error-text');

  /* Password toggle */
  pwToggle.addEventListener('click', () => {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
    pwToggle.textContent = isPassword ? '🙈' : '👁';
  });

  /* Form submit */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      showError('Please enter your email and password.');
      return;
    }

    setLoading(true);
    hideError();

    try {
      await login(email, password);
      showToast('Welcome back!', 'success');
      navigate('/inbox');
    } catch (err) {
      const msg = err.data?.message || err.message || 'Invalid credentials. Please try again.';
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
    btnText.textContent = loading ? 'Signing in…' : 'Sign In';
  }

  function showError(msg) {
    errorText.textContent = msg;
    errorBox.style.display = 'flex';
    errorBox.classList.add('animate-shake');
    setTimeout(() => errorBox.classList.remove('animate-shake'), 500);
  }

  function hideError() {
    errorBox.style.display = 'none';
  }

  /* Focus first input */
  setTimeout(() => emailInput.focus(), 300);

  injectAuthStyles();
}

/* ── Auth page styles ── */
let authStylesInjected = false;
function injectAuthStyles() {
  if (authStylesInjected) return;
  authStylesInjected = true;

  const style = document.createElement('style');
  style.textContent = `
    .auth-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      position: relative;
      overflow: hidden;
    }

    /* Animated gradient background */
    .auth-bg {
      position: fixed;
      inset: 0;
      z-index: 0;
      background: #0a0e1a;
      overflow: hidden;
    }
    .auth-bg-orb {
      position: absolute;
      border-radius: 50%;
      filter: blur(80px);
      opacity: 0.4;
      animation: float 8s ease-in-out infinite;
    }
    .auth-bg-orb-1 {
      width: 400px;
      height: 400px;
      background: radial-gradient(circle, #6366f1, transparent 70%);
      top: -10%;
      left: -5%;
      animation-delay: 0s;
    }
    .auth-bg-orb-2 {
      width: 500px;
      height: 500px;
      background: radial-gradient(circle, #8b5cf6, transparent 70%);
      bottom: -15%;
      right: -10%;
      animation-delay: -3s;
      animation-duration: 10s;
    }
    .auth-bg-orb-3 {
      width: 300px;
      height: 300px;
      background: radial-gradient(circle, #3b82f6, transparent 70%);
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      animation-delay: -5s;
      animation-duration: 12s;
    }

    /* Card */
    .auth-card {
      position: relative;
      z-index: 1;
      background: rgba(17, 24, 39, 0.75);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border: 1px solid rgba(99, 102, 241, 0.18);
      border-radius: 20px;
      padding: 40px 36px 32px;
      width: 100%;
      max-width: 420px;
      box-shadow: 0 16px 64px rgba(0,0,0,0.4), 0 0 40px rgba(99,102,241,0.08);
    }

    /* Header */
    .auth-header {
      text-align: center;
      margin-bottom: 32px;
    }
    .auth-logo {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin-bottom: 12px;
    }
    .auth-logo-shield {
      display: flex;
      align-items: center;
      animation: float 4s ease-in-out infinite;
    }
    .auth-title {
      font-size: 28px;
      font-weight: 700;
      background: linear-gradient(135deg, #6366f1, #a78bfa);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .auth-tagline {
      color: #64748b;
      font-size: 14px;
    }

    /* Form */
    .auth-form {
      display: flex;
      flex-direction: column;
    }
    .auth-form .input-group {
      margin-bottom: 18px;
    }
    .auth-form .input {
      padding: 14px 16px;
      font-size: 15px;
    }
    .auth-form .input-icon ~ .input {
      padding-left: 44px;
    }
    .auth-form .input-icon {
      font-size: 16px;
    }
    .auth-form .password-toggle {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      cursor: pointer;
      font-size: 16px;
      padding: 4px;
      color: #64748b;
      z-index: 1;
    }

    .auth-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
    }
    .auth-link-sm {
      font-size: 13px;
      color: #6366f1;
    }
    .auth-link-sm:hover { color: #a78bfa; }

    .auth-submit {
      width: 100%;
      padding: 14px;
      font-size: 16px;
      gap: 10px;
      margin-bottom: 0;
    }

    .auth-footer {
      text-align: center;
      margin-top: 24px;
      padding-top: 20px;
      border-top: 1px solid rgba(99,102,241,0.12);
      font-size: 14px;
      color: #64748b;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
    .auth-link {
      color: #6366f1;
      font-weight: 600;
    }
    .auth-link:hover { color: #a78bfa; }

    /* Error */
    .auth-error {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      border-radius: 10px;
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #fca5a5;
      font-size: 13px;
      margin-bottom: 18px;
    }
    .auth-error-icon {
      font-size: 16px;
      flex-shrink: 0;
    }

    @media (max-width: 480px) {
      .auth-card {
        padding: 28px 20px 24px;
        border-radius: 16px;
      }
    }
  `;
  document.head.appendChild(style);
}
