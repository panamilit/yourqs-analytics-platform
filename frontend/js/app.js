/**
 * app.js
 * Application entry point. Wires up navigation state and starts the
 * Projects page — the only page wired to live data in this build.
 */

document.addEventListener("DOMContentLoaded", () => {
  initSidebarNav();
  if (typeof ProjectsPage !== "undefined") {
    ProjectsPage.init();
  }
  if (typeof ProjectDetailsPage !== "undefined") {
    ProjectDetailsPage.init();
  }
  if (typeof BenchmarkingPage !== "undefined") {
    BenchmarkingPage.init();
  }
});

function initSidebarNav() {
  const links = document.querySelectorAll(".sidebar-nav a[data-nav]");
  links.forEach((link) => {
    if (link.classList.contains("is-disabled")) {
      link.addEventListener("click", (e) => e.preventDefault());
      link.setAttribute("aria-disabled", "true");
    }
  });
}
