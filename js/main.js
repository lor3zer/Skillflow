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

// фон: падающие hex-символы, изредка проскакивают куски флагов
const canvas = document.getElementById("bgRain");
const ctx = canvas.getContext("2d");
const CHARS = "0123456789ABCDEF";
const WORDS = ["flag{", "0x", "}", "ctf", "nop", "ret"];
const FONT_SIZE = 16;
const FRAME_MS = 60;

let columns = [];

function resizeRain() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.font = `${FONT_SIZE}px "JetBrains Mono", monospace`;

  const count = Math.ceil(window.innerWidth / FONT_SIZE);
  columns = Array.from({ length: count }, () => ({
    y: Math.random() * -window.innerHeight,
    speed: 0.5 + Math.random() * 0.8,
    word: "",
    row: -1,
  }));

  ctx.fillStyle = "#181b1e";
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
}

function nextChar(col) {
  if (col.word) {
    const ch = col.word[0];
    col.word = col.word.slice(1);
    return ch;
  }
  if (Math.random() < 0.004) col.word = WORDS[Math.floor(Math.random() * WORDS.length)];
  return CHARS[Math.floor(Math.random() * CHARS.length)];
}

function drawRain() {
  // полупрозрачная заливка оставляет за символами затухающий хвост
  ctx.fillStyle = "rgba(24, 27, 30, 0.06)";
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

  columns.forEach((col, i) => {
    const row = Math.floor(col.y);
    const y = row * FONT_SIZE;
    // медленный столбец стоит в одной клетке несколько кадров — рисуем символ только при переходе
    if (y >= 0 && row !== col.row) {
      ctx.fillStyle = Math.random() < 0.03 ? "#d4ff66" : "#86cc00";
      ctx.fillText(nextChar(col), i * FONT_SIZE, y);
    }
    col.row = row;
    col.y += col.speed;
    if (y > window.innerHeight && Math.random() > 0.97) col.y = col.row = 0;
  });
}

resizeRain();
window.addEventListener("resize", resizeRain);

if (reduceMotion) {
  for (let i = 0; i < 80; i++) drawRain();
} else {
  let last = 0;
  requestAnimationFrame(function loop(t) {
    if (t - last > FRAME_MS) {
      drawRain();
      last = t;
    }
    requestAnimationFrame(loop);
  });
}
