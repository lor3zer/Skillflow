const toggle = document.getElementById("menuToggle");
const dropdown = document.getElementById("menuList");

function setMenu(open) {
  dropdown.classList.toggle("is-open", open);
  toggle.setAttribute("aria-expanded", String(open));
}

toggle.addEventListener("click", (e) => {
  e.stopPropagation();
  setMenu(!dropdown.classList.contains("is-open"));
});

// закрываем по клику вне меню, по пункту меню и по Esc
document.addEventListener("click", (e) => {
  if (!dropdown.contains(e.target)) setMenu(false);
});

dropdown.addEventListener("click", (e) => {
  if (e.target.closest("a")) setMenu(false);
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") setMenu(false);
});
