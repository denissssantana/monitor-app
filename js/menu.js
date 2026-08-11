/* MONITOR — menu.js
   Controla o menu hambúrguer (abrir/fechar/tocar fora fecha)
   e a navegação entre telas, usado em dados-pessoais.html e imc.html. */

document.addEventListener("DOMContentLoaded", () => {
  const menuBtn = document.getElementById("menu-toggle");
  const menu = document.getElementById("nav-menu");
  const overlay = document.getElementById("nav-overlay");

  if (!menuBtn || !menu || !overlay) return;

  function openMenu() {
    menu.classList.add("open");
    overlay.classList.add("open");
    menuBtn.setAttribute("aria-expanded", "true");
  }

  function closeMenu() {
    menu.classList.remove("open");
    overlay.classList.remove("open");
    menuBtn.setAttribute("aria-expanded", "false");
  }

  menuBtn.addEventListener("click", () => {
    if (menu.classList.contains("open")) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  overlay.addEventListener("click", closeMenu);

  const sairBtn = document.getElementById("menu-sair");
  if (sairBtn) {
    sairBtn.addEventListener("click", () => {
      window.location.href = "index.html";
    });
  }
});
