/**
 * mr sam_ Driving School - Authentication Handler
 * Connects to MongoDB Atlas backend with JWT token & bcrypt authentication
 * Securely manages session, route guards, and role redirects
 */

// Global session helper functions
window.MrSamAuth = {
  getToken() {
    return localStorage.getItem('mrsam_token');
  },
  getUser() {
    try {
      const raw = localStorage.getItem('mrsam_user');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  },
  setSession(token, user) {
    if (token) localStorage.setItem('mrsam_token', token);
    if (user) localStorage.setItem('mrsam_user', JSON.stringify(user));
  },
  clearSession() {
    localStorage.removeItem('mrsam_token');
    localStorage.removeItem('mrsam_user');
  },
  async fetchWithAuth(url, options = {}) {
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return fetch(url, { ...options, headers });
  }
};

document.addEventListener('DOMContentLoaded', () => {
  initPasswordToggles();
  initRegisterForm();
  initLoginForm();
  checkAuthRedirects();
});

// Toast notification helper
function showAuthToast(title, message, isError = false) {
  let container = document.getElementById('authToastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'authToastContainer';
    container.className = 'auth-toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `auth-toast ${isError ? 'error' : ''}`;
  toast.innerHTML = `
    <div>${isError ? '⚠️' : '✅'}</div>
    <div>
      <h5>${title}</h5>
      <p>${message}</p>
    </div>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4500);
}

// Password visibility toggles
function initPasswordToggles() {
  document.querySelectorAll('.password-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const inputWrap = btn.closest('.input-pill-wrap');
      const input = inputWrap.querySelector('input');
      if (input.type === 'password') {
        input.type = 'text';
        btn.innerHTML = `
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
            <line x1="1" y1="1" x2="23" y2="23"></line>
          </svg>
        `;
      } else {
        input.type = 'password';
        btn.innerHTML = `
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
        `;
      }
    });
  });
}

// Registration form handler
function initRegisterForm() {
  const form = document.getElementById('registerForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nameInput = document.getElementById('regName');
    const emailInput = document.getElementById('regEmail');
    const licenceInput = document.getElementById('regLicence4');
    const passInput = document.getElementById('regPassword');
    const submitBtn = document.getElementById('regSubmitBtn');

    const name = nameInput ? nameInput.value.trim() : '';
    const email = emailInput ? emailInput.value.trim() : '';
    const licenceLast4 = licenceInput ? licenceInput.value.trim().toUpperCase() : '8492';
    const password = passInput ? passInput.value : '';

    // Field lock: non-empty validation
    if (!name || !email || !password) {
      showAuthToast('Lock Active', 'Please fill in Name, Email, and Password to unlock registration.', true);
      if (!name && nameInput) nameInput.focus();
      else if (!email && emailInput) emailInput.focus();
      else if (!password && passInput) passInput.focus();
      return;
    }

    if (password.length < 4) {
      showAuthToast('Lock Warning', 'Password should be at least 4 characters long.', true);
      return;
    }

    submitBtn.classList.add('loading');
    submitBtn.textContent = 'Unlocking Portal...';

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, licenceLast4 })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        submitBtn.classList.remove('loading');
        submitBtn.textContent = 'Unlock Learner Portal';
        showAuthToast('Registration Notice', data.message || 'Error creating account', true);
        return;
      }

      // Save JWT session
      window.MrSamAuth.setSession(data.token, data.user);

      // Animate stepper dots
      const step2 = document.querySelectorAll('.step-indicator')[1];
      const line1 = document.querySelectorAll('.step-line')[0];
      if (step2) step2.classList.add('active');
      if (line1) line1.classList.add('active');

      showAuthToast('Access Granted!', `Welcome, ${data.user.name}! Proceeding to candidate setup...`);

      // Redirect to Candidate Setup (Onboarding)
      setTimeout(() => {
        window.location.href = 'onboarding.html';
      }, 700);
    } catch (err) {
      console.error('[Registration Error]:', err);
      submitBtn.classList.remove('loading');
      submitBtn.textContent = 'Unlock Learner Portal';
      showAuthToast('Connection Error', 'Unable to reach backend server. Please try again.', true);
    }
  });
}

// Login form handler
function initLoginForm() {
  const form = document.getElementById('loginForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const emailInput = document.getElementById('loginEmail');
    const passInput = document.getElementById('loginPassword');
    const submitBtn = document.getElementById('loginSubmitBtn');

    const email = emailInput ? emailInput.value.trim() : '';
    const password = passInput ? passInput.value : '';

    // Field lock: non-empty validation
    if (!email || !password) {
      showAuthToast('Lock Active', 'Email and Password are required to unlock your account.', true);
      if (!email && emailInput) emailInput.focus();
      else if (!password && passInput) passInput.focus();
      return;
    }

    submitBtn.classList.add('loading');
    submitBtn.textContent = 'Verifying Credentials...';

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        submitBtn.classList.remove('loading');
        submitBtn.textContent = 'Login';
        showAuthToast('Sign In Failed', data.message || 'Invalid email or password.', true);
        return;
      }

      // Save JWT session
      window.MrSamAuth.setSession(data.token, data.user);

      showAuthToast('Authentication Verified', `Welcome back, ${data.user.name}!`);

      // Check URL redirect or user role
      const urlParams = new URLSearchParams(window.location.search);
      const redirect = urlParams.get('redirect');

      setTimeout(() => {
        if (data.user.role === 'admin') {
          window.location.href = 'admin.html';
        } else if (redirect === 'admin') {
          showAuthToast('Access Guard', 'Your account does not have examiner administrator privileges.', true);
          window.location.href = 'dashboard.html';
        } else {
          // For candidates: check if welcome launch animation has been seen
          const uid = data.user.id || data.user._id;
          const welcomeSeen = uid ? localStorage.getItem('mrsam_welcome_seen_' + uid) : null;
          if (!welcomeSeen) {
            window.location.href = 'onboarding.html';
          } else {
            window.location.href = 'dashboard.html';
          }
        }
      }, 700);
    } catch (err) {
      console.error('[Login Error]:', err);
      submitBtn.classList.remove('loading');
      submitBtn.textContent = 'Login';
      showAuthToast('Connection Error', 'Unable to reach backend server. Please try again.', true);
    }
  });
}

// Check if user has URL error notices or admin redirect
function checkAuthRedirects() {
  const urlParams = new URLSearchParams(window.location.search);
  const redirect = urlParams.get('redirect');
  const error = urlParams.get('error');

  const banner = document.getElementById('adminNoticeBanner');
  const title = document.getElementById('authHeaderTitle');
  const subtitle = document.getElementById('authHeaderSubtitle');

  if (redirect === 'admin' || error === 'unauthorized') {
    if (banner) banner.style.display = 'block';
    if (title) title.textContent = 'EXAMINER SIGN IN';
    if (subtitle) subtitle.textContent = 'Master Administrator Console Verification';
    showAuthToast('Access Guard', 'Please sign in with administrator credentials to access the Admin Console.', true);
  }
}

