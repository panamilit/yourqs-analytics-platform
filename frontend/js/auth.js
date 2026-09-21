/**
 * auth.js
 * Reusable authentication/session module, exposed globally as window.Auth
 * so any current or future page (e.g. the upcoming dev.html) can use it
 * without re-implementing storage or request logic.
 *
 * PROTOTYPE NOTE: this stores the access token and user object in
 * localStorage for simplicity. That is convenient for a static prototype
 * but is not a production-grade pattern — anything with script access to
 * the page (including an XSS bug) can read localStorage. When
 * authentication moves to the .NET application layer, replace the storage
 * strategy here (e.g. an httpOnly session cookie) — the rest of the app
 * only depends on the small function surface exposed at the bottom of this
 * file, so that change should stay contained to this one module.
 */

const Auth = (() => {
  const TOKEN_KEY = "yourqs_access_token";
  const USER_KEY = "yourqs_user";

  /* ------------------------------------------------------------------ *
   * Storage
   * ------------------------------------------------------------------ */

  function getToken() {
    return window.localStorage.getItem(TOKEN_KEY);
  }

  function getStoredUser() {
    const raw = window.localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (err) {
      return null;
    }
  }

  function isAuthenticated() {
    return Boolean(getToken());
  }

  function setSession(authResponse) {
    if (!authResponse || !authResponse.accessToken) return;
    window.localStorage.setItem(TOKEN_KEY, authResponse.accessToken);
    if (authResponse.user) {
      window.localStorage.setItem(USER_KEY, JSON.stringify(authResponse.user));
    }
  }

  function setStoredUser(user) {
    if (!user) return;
    window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  function logout() {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
  }

  function getAuthorizationHeaders() {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  /* ------------------------------------------------------------------ *
   * API calls — thin wrappers around Api.request() that also persist the
   * resulting session. HTTP transport itself stays in api.js.
   * ------------------------------------------------------------------ */

  async function login(email, password) {
    const data = await Api.request("/api/auth/login", {
      method: "POST",
      body: { email, password }
    });
    setSession(data);
    return data;
  }

  async function register(payload) {
    const data = await Api.request("/api/auth/register", {
      method: "POST",
      body: payload
    });
    setSession(data);
    return data;
  }

  /** Verifies the stored token against the backend and refreshes the
   *  cached user object. Throws if the token is missing/invalid/expired —
   *  callers are expected to handle that by clearing the session. */
  async function getCurrentUser() {
    const user = await Api.request("/api/auth/me", {
      method: "GET",
      headers: getAuthorizationHeaders()
    });
    setStoredUser(user);
    return user;
  }

  /* ------------------------------------------------------------------ *
   * Navigation helpers
   * ------------------------------------------------------------------ */

  /** Only a plain local .html page (optionally with its own query string)
   *  is ever accepted — no scheme, no protocol-relative "//", no
   *  backslashes. This is what stands between the `returnTo` query
   *  parameter and an open-redirect vulnerability, so keep it strict. */
  function sanitizeReturnTo(raw) {
    if (!raw) return null;
    const value = raw.trim();
    if (!value) return null;
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value)) return null; // any URL scheme
    if (value.startsWith("//")) return null; // protocol-relative
    if (value.includes("\\")) return null;
    if (!/^[a-zA-Z0-9/_-]+\.html(\?[a-zA-Z0-9=&%._-]*)?$/.test(value)) return null;
    return value;
  }

  function getReturnTo() {
    const params = new URLSearchParams(window.location.search);
    return sanitizeReturnTo(params.get("returnTo"));
  }

  function redirectAfterAuth() {
    window.location.href = getReturnTo() || "index.html";
  }

  /** Call at the top of any page that requires a signed-in user (e.g. the
   *  upcoming dev.html). Redirects to the auth page with a returnTo back
   *  to the current page if there's no stored token; otherwise a no-op. */
  function requireAuth() {
    if (isAuthenticated()) return true;
    const current = window.location.pathname.split("/").pop() || "index.html";
    window.location.href = `auth.html?returnTo=${encodeURIComponent(current)}`;
    return false;
  }

  /* ------------------------------------------------------------------ *
   * Error message formatting
   * ------------------------------------------------------------------ */

  /** Turns an ApiError (or any thrown error) into a short, friendly
   *  message that's always safe to render directly — never a raw
   *  validation array, stack trace, or "[object Object]". */
  function formatErrorMessage(err) {
    if (!err) return "Something went wrong. Please try again.";

    if (err.detail) {
      if (typeof err.detail === "string") return err.detail;
      if (Array.isArray(err.detail) && err.detail.length > 0) {
        const first = err.detail[0];
        if (typeof first === "string") return capitalize(first);
        if (first && typeof first.msg === "string") return capitalize(first.msg);
      }
    }

    if (typeof err.message === "string" && err.message) {
      return err.message;
    }

    return "Something went wrong. Please try again.";
  }

  function capitalize(text) {
    if (!text) return text;
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  return {
    getToken,
    getStoredUser,
    isAuthenticated,
    login,
    register,
    getCurrentUser,
    logout,
    getAuthorizationHeaders,
    requireAuth,
    redirectAfterAuth,
    getReturnTo,
    formatErrorMessage
  };
})();

// Top-level `const` declarations are not automatically exposed as
// `window` properties — only bare identifiers shared across sibling
// <script> tags in the same document. Future pages may reasonably check
// `window.Auth`, so it's set explicitly here per this project's convention.
window.Auth = Auth;
