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

// фон: поток кода в три слоя глубины — дальний мелкий и тусклый, ближний крупный и быстрый
const canvas = document.getElementById("bgRain");
const ctx = canvas.getContext("2d");
const FRAME_MS = 60;
const BG = "#181b1e";
const HEAD_COLOR = "#e4ff99";

const LAYERS = [
  { size: 11, alpha: 0.35, speed: [0.3, 0.6], weight: 5 },
  { size: 14, alpha: 0.6, speed: [0.5, 0.9], weight: 3 },
  { size: 19, alpha: 0.9, speed: [0.8, 1.3], weight: 1 },
];

const CHARSETS = [
  { chars: "0123456789ABCDEF", weight: 5 },
  { chars: "01", weight: 3 },
  { chars: "{}[]<>/\\$#%&*=+;:|", weight: 2 },
  { chars: "abcdefghijklmnopqrstuvwxyz0123456789", weight: 2 },
];

const COLORS = [
  { value: "#86cc00", weight: 6 },
  { value: "#a8ff00", weight: 3 },
  { value: "#5c8a00", weight: 3 },
  { value: "#6b737c", weight: 2 },
];

const WORDS = [
  "flag{", "}", "0xdeadbeef", "0x41414141", "mov eax", "jmp esp", "nop", "\\x90\\x90",
  "ret", "rop", "SELECT", "<script>", "../../", "%00", "sudo", "nc -lvp",
  "chmod +x", "base64", "xor", "aes", "gdb", "ctf", "pwn", "root",
];

const MESSAGES = [
  "[+] flag captured", "[*] scanning 10.0.0.0/24", "[+] access granted", "segfault at 0x0",
  "[!] buffer overflow", "[+] shell opened", "[*] cracking hash...", "pwned",
];

const rand = (min, max) => min + Math.random() * (max - min);

function pick(list) {
  let r = Math.random() * list.reduce((sum, item) => sum + item.weight, 0);
  return list.find((item) => (r -= item.weight) < 0) || list[0];
}

let drops = [];

function makeDrop(scattered) {
  const layer = pick(LAYERS);
  return {
    layer,
    x: Math.floor(Math.random() * window.innerWidth),
    y: scattered ? rand(-window.innerHeight / layer.size, 0) : rand(-20, 0),
    speed: rand(...layer.speed),
    chars: pick(CHARSETS).chars,
    color: pick(COLORS).value,
    word: "",
    row: -1,
    prev: "",
  };
}

function resizeRain() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  drops = Array.from({ length: Math.ceil(window.innerWidth / 14) }, () => makeDrop(true));

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
}

function nextChar(drop) {
  if (drop.word) {
    const ch = drop.word[0];
    drop.word = drop.word.slice(1);
    return ch;
  }
  if (Math.random() < 0.006) drop.word = WORDS[Math.floor(Math.random() * WORDS.length)];
  return drop.chars[Math.floor(Math.random() * drop.chars.length)];
}

function drawDrop(drop) {
  const { size, alpha } = drop.layer;
  const row = Math.floor(drop.y);

  // медленный столбец стоит в одной клетке несколько кадров — рисуем только при переходе
  if (row >= 0 && row !== drop.row) {
    ctx.font = `${size}px "JetBrains Mono", monospace`;
    ctx.globalAlpha = alpha;

    // прошлую «голову» перекрашиваем в цвет столбца
    if (drop.prev) {
      const prevY = drop.row * size;
      ctx.fillStyle = BG;
      ctx.fillRect(drop.x, prevY - size, size, size * 1.2);
      ctx.fillStyle = drop.color;
      ctx.fillText(drop.prev, drop.x, prevY);
    }

    drop.prev = nextChar(drop);
    ctx.fillStyle = HEAD_COLOR;
    ctx.fillText(drop.prev, drop.x, row * size);
    drop.row = row;
  }

  drop.y += drop.speed;
  return row * size < window.innerHeight + size;
}

function drawMessage() {
  const text = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
  ctx.globalAlpha = 0.9;
  ctx.font = '13px "JetBrains Mono", monospace';
  ctx.fillStyle = "#c2ff33";
  ctx.fillText(text, rand(0, window.innerWidth - 200), rand(40, window.innerHeight - 20));
}

function drawRain() {
  // полупрозрачная заливка оставляет за символами затухающий хвост
  ctx.globalAlpha = 1;
  ctx.fillStyle = "rgba(24, 27, 30, 0.06)";
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

  // ушедший за экран столбец через случайную паузу возвращается новым
  drops.forEach((drop, i) => {
    if (!drawDrop(drop) && Math.random() < 0.05) drops[i] = makeDrop(false);
  });

  if (Math.random() < 0.006) drawMessage();
}

resizeRain();
window.addEventListener("resize", resizeRain);

if (reduceMotion) {
  for (let i = 0; i < 120; i++) drawRain();
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
