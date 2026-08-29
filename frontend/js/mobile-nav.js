const menuButton = document.getElementById("mobile-menu-btn");
const sidebar = document.querySelector(".sidebar");
const backdrop = document.getElementById("sidebar-backdrop");

function closeMobileMenu() {
  sidebar?.classList.remove("is-open");
  backdrop?.classList.remove("is-open");
  menuButton?.setAttribute("aria-expanded", "false");
}

menuButton?.addEventListener("click", () => {
  const isOpen = sidebar?.classList.toggle("is-open");

  backdrop?.classList.toggle("is-open", Boolean(isOpen));
  menuButton?.setAttribute("aria-expanded", String(Boolean(isOpen)));
});

backdrop?.addEventListener("click", closeMobileMenu);

sidebar?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", closeMobileMenu);
});