/**
 * auth-page.js
 * DOM interaction for auth.html only. All reusable session/API logic lives
 * in auth.js (window.Auth) — this file just wires the page's tabs, forms,
 * validation, and submit/loading states to it.
 */

document.addEventListener("DOMContentLoaded", () => {
  AuthPage.init();
});

const AuthPage = (() => {
  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const MIN_PASSWORD_LENGTH = 8;

  let els = {};

  function init() {
    cacheElements();
    wireTabs();
    wirePasswordToggles();
    wireForms();
    checkExistingSession();
  }

  function cacheElements() {
    els = {
      checkingState: document.getElementById("auth-checking-state"),
      formArea: document.getElementById("auth-form-area"),
      alert: document.getElementById("auth-alert"),

      tabLogin: document.getElementById("auth-tab-login"),
      tabRegister: document.getElementById("auth-tab-register"),

      loginForm: document.getElementById("auth-panel-login"),
      loginEmail: document.getElementById("login-email"),
      loginEmailError: document.getElementById("login-email-error"),
      loginPassword: document.getElementById("login-password"),
      loginPasswordError: document.getElementById("login-password-error"),
      loginSubmitBtn: document.getElementById("login-submit-btn"),

      registerForm: document.getElementById("auth-panel-register"),
      registerName: document.getElementById("register-name"),
      registerNameError: document.getElementById("register-name-error"),
      registerEmail: document.getElementById("register-email"),
      registerEmailError: document.getElementById("register-email-error"),
      registerCompany: document.getElementById("register-company"),
      registerRole: document.getElementById("register-role"),
      registerAccessCode: document.getElementById("register-access-code"),
      registerAccessCodeError: document.getElementById("register-access-code-error"),
      registerPassword: document.getElementById("register-password"),
      registerPasswordError: document.getElementById("register-password-error"),
      registerConfirmPassword: document.getElementById("register-confirm-password"),
      registerConfirmPasswordError: document.getElementById("register-confirm-password-error"),
      registerSubmitBtn: document.getElementById("register-submit-btn")
    };
  }

  /* ------------------------------------------------------------------ *
   * Existing session check — verifies any stored token before showing
   * the form, so an already-signed-in visitor is redirected straight
   * through rather than seeing a login screen flash by.
   * ------------------------------------------------------------------ */

  async function checkExistingSession() {
    if (!Auth.getToken()) {
      showForm();
      return;
    }

    try {
      await Auth.getCurrentUser();
      Auth.redirectAfterAuth();
    } catch (err) {
      // Stored token is missing/invalid/expired — clear it and let the
      // person sign in again. Never redirect back into auth.html itself,
      // which would create a loop.
      Auth.logout();
      showForm();
    }
  }

  function showForm() {
    els.checkingState.hidden = true;
    els.formArea.hidden = false;
  }

  /* ------------------------------------------------------------------ *
   * Tab switching (Sign in / Create account) — no page reload
   * ------------------------------------------------------------------ */

  function wireTabs() {
    document.querySelectorAll("[data-mode]").forEach((btn) => {
      btn.addEventListener("click", () => switchMode(btn.dataset.mode));
    });
    document.querySelectorAll("[data-switch-to]").forEach((btn) => {
      btn.addEventListener("click", () => switchMode(btn.dataset.switchTo));
    });
  }

  function switchMode(mode) {
    const toLogin = mode === "login";

    els.tabLogin.classList.toggle("is-active", toLogin);
    els.tabLogin.setAttribute("aria-selected", String(toLogin));
    els.tabLogin.tabIndex = toLogin ? 0 : -1;

    els.tabRegister.classList.toggle("is-active", !toLogin);
    els.tabRegister.setAttribute("aria-selected", String(!toLogin));
    els.tabRegister.tabIndex = toLogin ? -1 : 0;

    els.loginForm.hidden = !toLogin;
    els.registerForm.hidden = toLogin;

    hideAlert();
    clearAllFieldErrors();
  }

  /* ------------------------------------------------------------------ *
   * Password show/hide toggles
   * ------------------------------------------------------------------ */

  function wirePasswordToggles() {
    document.querySelectorAll(".auth-password-toggle").forEach((btn) => {
      btn.addEventListener("click", () => {
        const input = document.getElementById(btn.dataset.target);
        if (!input) return;
        const nowVisible = input.type === "password";
        input.type = nowVisible ? "text" : "password";
        btn.textContent = nowVisible ? "Hide" : "Show";
        btn.setAttribute("aria-label", nowVisible ? "Hide password" : "Show password");
      });
    });
  }

  /* ------------------------------------------------------------------ *
   * Forms
   * ------------------------------------------------------------------ */

  function wireForms() {
    els.loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      handleLogin();
    });
    els.registerForm.addEventListener("submit", (e) => {
      e.preventDefault();
      handleRegister();
    });

    // Clear a field's error as soon as the person starts correcting it.
    [
      [els.loginEmail, els.loginEmailError],
      [els.loginPassword, els.loginPasswordError],
      [els.registerName, els.registerNameError],
      [els.registerEmail, els.registerEmailError],
      [els.registerAccessCode, els.registerAccessCodeError],
      [els.registerPassword, els.registerPasswordError],
      [els.registerConfirmPassword, els.registerConfirmPasswordError]
    ].forEach(([input, errorEl]) => {
      input.addEventListener("input", () => setFieldError(errorEl, ""));
    });
  }

  async function handleLogin() {
    const email = els.loginEmail.value.trim();
    const password = els.loginPassword.value;

    let valid = true;
    if (!email) {
      setFieldError(els.loginEmailError, "Email is required.");
      valid = false;
    } else if (!EMAIL_PATTERN.test(email)) {
      setFieldError(els.loginEmailError, "Enter a valid email address.");
      valid = false;
    }
    if (!password) {
      setFieldError(els.loginPasswordError, "Password is required.");
      valid = false;
    }
    if (!valid) return;

    hideAlert();
    setLoading(els.loginSubmitBtn, true, "Signing in…");

    try {
      await Auth.login(email, password);
      Auth.redirectAfterAuth();
    } catch (err) {
      showAlert(Auth.formatErrorMessage(err));
      setLoading(els.loginSubmitBtn, false, "Sign in");
    }
  }

  async function handleRegister() {
    const name = els.registerName.value.trim();
    const email = els.registerEmail.value.trim();
    const company = els.registerCompany.value.trim();
    const roleTitle = els.registerRole.value.trim();
    const accessCode = els.registerAccessCode.value.trim();
    const password = els.registerPassword.value;
    const confirmPassword = els.registerConfirmPassword.value;

    let valid = true;
    if (!name) {
      setFieldError(els.registerNameError, "Name is required.");
      valid = false;
    }
    if (!email) {
      setFieldError(els.registerEmailError, "Email is required.");
      valid = false;
    } else if (!EMAIL_PATTERN.test(email)) {
      setFieldError(els.registerEmailError, "Enter a valid email address.");
      valid = false;
    }
    if (!accessCode) {
      setFieldError(
        els.registerAccessCodeError,
        "Access code is required."
      );
      valid = false;
    }
    if (!password) {
      setFieldError(els.registerPasswordError, "Password is required.");
      valid = false;
    } else if (password.length < MIN_PASSWORD_LENGTH) {
      setFieldError(els.registerPasswordError, `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      valid = false;
    }
    if (!confirmPassword) {
      setFieldError(els.registerConfirmPasswordError, "Confirm your password.");
      valid = false;
    } else if (password && confirmPassword !== password) {
      setFieldError(els.registerConfirmPasswordError, "Passwords do not match.");
      valid = false;
    }
    if (!valid) return;

    hideAlert();
    setLoading(els.registerSubmitBtn, true, "Creating account…");

    const payload = {
      name,
      email,
      password,
      accessCode
    };
    if (company) payload.company = company;
    if (roleTitle) payload.roleTitle = roleTitle;

    try {
      await Auth.register(payload);
      Auth.redirectAfterAuth();
    } catch (err) {
      showAlert(Auth.formatErrorMessage(err));
      setLoading(els.registerSubmitBtn, false, "Create account");
    }
  }

  /* ------------------------------------------------------------------ *
   * Small UI helpers
   * ------------------------------------------------------------------ */

  function setFieldError(errorEl, message) {
    if (!errorEl) return;
    errorEl.textContent = message;
    errorEl.hidden = !message;
  }

  function clearAllFieldErrors() {
    [
      els.loginEmailError,
      els.loginPasswordError,
      els.registerNameError,
      els.registerEmailError,
      els.registerAccessCodeError,
      els.registerPasswordError,
      els.registerConfirmPasswordError
    ].forEach((el) => setFieldError(el, ""));
  }

  function showAlert(message) {
    els.alert.textContent = message;
    els.alert.hidden = false;
  }

  function hideAlert() {
    els.alert.hidden = true;
    els.alert.textContent = "";
  }

  function setLoading(button, isLoading, label) {
    button.disabled = isLoading;
    button.textContent = label;
  }

  return { init };
})();
