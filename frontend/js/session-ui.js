const SessionUI = (() => {
  function init() {
    if (typeof Auth === "undefined") {
      return;
    }

    const guest =
      document.getElementById("header-auth-guest");

    const userArea =
      document.getElementById("header-auth-user");

    const nameEl =
      document.getElementById("global-user-name");

    const avatarEl =
      document.getElementById("global-user-avatar");

    const user = Auth.getStoredUser();

    if (Auth.isAuthenticated() && user) {
      if (guest) {
        guest.hidden = true;
      }

      if (userArea) {
        userArea.hidden = false;
      }

      if (nameEl) {
        nameEl.textContent =
          user.name || user.email || "User";
      }

      if (avatarEl) {
        avatarEl.textContent =
          getInitials(user.name || user.email);
      }

      return;
    }

    if (guest) {
      guest.hidden = false;
    }

    if (userArea) {
      userArea.hidden = true;
    }
  }

  function getInitials(value) {
    if (!value) {
      return "?";
    }

    const parts = value
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (parts.length >= 2) {
      return (
        parts[0][0] +
        parts[1][0]
      ).toUpperCase();
    }

    return value
      .slice(0, 2)
      .toUpperCase();
  }

  return {
    init
  };
})();

window.SessionUI = SessionUI;

document.addEventListener(
  "DOMContentLoaded",
  () => {
    SessionUI.init();
  }
);