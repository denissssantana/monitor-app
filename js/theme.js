/* MONITOR — theme.js
   Alterna entre tema claro/escuro e persiste a preferência. */

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
  const next = current === "dark" ? "light" : "dark";
  applyTheme(next);
  saveTheme(next);
}

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("theme-toggle");
  if (btn) {
    btn.addEventListener("click", toggleTheme);
  }
});
