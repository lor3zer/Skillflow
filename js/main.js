const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// печатаем команду в строке терминала
const typed = document.getElementById("typed");
const text = typed.dataset.text;

if (reduceMotion) {
  typed.textContent = text;
} else {
  let i = 0;
  setTimeout(function type() {
    typed.textContent = text.slice(0, ++i);
    if (i < text.length) setTimeout(type, 60 + Math.random() * 60);
  }, 600);
}

// показываем блоки при прокрутке
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("is-visible");
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });

document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));

// подсвечиваем ссылку в навбаре, когда её секция на экране
const links = document.querySelectorAll('.nav__link[href^="#"]:not([href="#"])');

const navObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    const link = document.querySelector(`.nav__link[href="#${entry.target.id}"]`);
    link.classList.toggle("is-active", entry.isIntersecting);
  });
}, { rootMargin: "-40% 0px -50% 0px" });

links.forEach((link) => {
  const section = document.querySelector(link.getAttribute("href"));
  if (section) navObserver.observe(section);
});
