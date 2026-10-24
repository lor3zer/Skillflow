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

// вступительная анимация hero нужна только при загрузке, иначе она повторяется при каждом возврате на вкладку
setTimeout(() => {
  document.querySelectorAll(".anim-in").forEach((el) => el.classList.remove("anim-in"));
}, 2000);

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

// ---------- вкладки ----------
// содержимое старой вкладки втягивается в её пункт навбара, новое вылетает из нажатого

const views = new Map([...document.querySelectorAll(".view")].map((v) => [v.dataset.view, v]));
const DEFAULT_VIEW = "about";

let currentView = views.get(DEFAULT_VIEW);
let switching = false;
let pendingSwitch = null;
let clickOrigin = null;

function centerOf(el) {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

// у скрытой вкладки secret нет пункта в навбаре — она вылетает из лого
function navOrigin(name) {
  const link = document.querySelector(`.nav__link[href="#${name}"]`) || document.querySelector(".logo");
  return centerOf(link);
}

function setActiveLink(name) {
  document.querySelectorAll(".nav__link").forEach((link) => {
    link.classList.toggle("is-active", link.getAttribute("href") === `#${name}`);
  });
}

function flyItems(view) {
  return [...view.querySelectorAll(".section > :not(.cards), .cards > *")];
}

function toOrigin(el, origin) {
  const c = centerOf(el);
  return `translate(${origin.x - c.x}px, ${origin.y - c.y}px) scale(0.05)`;
}

function isOnScreen(el) {
  const r = el.getBoundingClientRect();
  return r.bottom > 0 && r.top < window.innerHeight;
}

async function switchView(name, origin) {
  const next = views.get(name) || views.get(DEFAULT_VIEW);
  const prev = currentView;
  if (next === prev) return;

  currentView = next;
  setActiveLink(next.dataset.view);

  if (!reduceMotion) {
    const outOrigin = navOrigin(prev.dataset.view);
    const out = flyItems(prev).filter(isOnScreen).map((el, i) =>
      el.animate(
        [{ transform: "none", opacity: 1 }, { transform: toOrigin(el, outOrigin), opacity: 0 }],
        { duration: 320, delay: i * 25, easing: "cubic-bezier(0.5, 0, 0.75, 0)", fill: "forwards" },
      ),
    );
    await Promise.all(out.map((a) => a.finished));
    out.forEach((a) => a.cancel());
  }

  prev.hidden = true;
  next.hidden = false;
  window.scrollTo(0, 0);

  if (!reduceMotion) {
    const anims = flyItems(next).map((el, i) =>
      el.animate(
        [
          { transform: toOrigin(el, origin), opacity: 0, filter: "blur(4px)" },
          { transform: "none", opacity: 1, filter: "none" },
        ],
        { duration: 650, delay: Math.min(i * 50, 500), easing: "cubic-bezier(0.2, 0.8, 0.2, 1)", fill: "backwards" },
      ),
    );
    await Promise.all(anims.map((a) => a.finished));
  }
}

// пока идёт переход, запоминаем только последний запрошенный
async function goTo(name, origin) {
  if (switching) {
    pendingSwitch = { name, origin };
    return;
  }
  switching = true;
  await switchView(name, origin);
  switching = false;

  if (pendingSwitch) {
    const { name: nextName, origin: nextOrigin } = pendingSwitch;
    pendingSwitch = null;
    goTo(nextName, nextOrigin);
  }
}

function viewFromHash() {
  return location.hash.slice(1) || DEFAULT_VIEW;
}

document.addEventListener("click", (e) => {
  const link = e.target.closest('a[href^="#"]');
  if (link) clickOrigin = centerOf(link);
}, true);

window.addEventListener("hashchange", () => {
  const name = viewFromHash();
  goTo(name, clickOrigin || navOrigin(name));
  clickOrigin = null;
});

// при открытии по прямой ссылке сразу показываем нужную вкладку, без перехода
if (views.has(viewFromHash()) && viewFromHash() !== DEFAULT_VIEW) {
  currentView.hidden = true;
  currentView = views.get(viewFromHash());
  currentView.hidden = false;
}
setActiveLink(currentView.dataset.view);

// ---------- фон ----------
// поток символов в три слоя глубины — дальний мелкий и тусклый, ближний крупный и быстрый
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
    queue: [],
    row: -1,
    prev: null,
  };
}

function resizeRain() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // столбцы пересоздаются — если пасхалка была в полёте, считаем, что она улетела
  if (egg.drop) egg.onGone();
  drops = Array.from({ length: Math.ceil(window.innerWidth / 14) }, () => makeDrop(true));

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
}

// символ из очереди столбца (так приходит пасхалка) или случайный из его набора
function nextChar(drop) {
  if (drop.queue.length) return drop.queue.shift();
  return { ch: drop.chars[Math.floor(Math.random() * drop.chars.length)], egg: false };
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
      ctx.fillText(drop.prev.ch, drop.x, prevY);
    }

    drop.prev = nextChar(drop);
    ctx.fillStyle = HEAD_COLOR;
    ctx.fillText(drop.prev.ch, drop.x, row * size);
    if (drop.prev.egg) egg.onDraw(drop.x, row * size, size);
    drop.row = row;
  }

  drop.y += drop.speed;
  return row * size < window.innerHeight + size;
}

function drawRain() {
  // полупрозрачная заливка оставляет за символами затухающий хвост
  ctx.globalAlpha = 1;
  ctx.fillStyle = "rgba(24, 27, 30, 0.06)";
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

  if (egg.pending) egg.launch();

  // ушедший за экран столбец через случайную паузу возвращается новым
  drops.forEach((drop, i) => {
    if (!drawDrop(drop)) {
      if (drop === egg.drop) egg.onGone();
      if (Math.random() < 0.05) drops[i] = makeDrop(false);
    }
  });
}

// ---------- пасхалка ----------
// через минуту в одном из столбцов среди обычных символов проезжает CTF{},
// клик по нему открывает вкладку secret; если не поймали — пролетит ещё пару раз
const egg = {
  WORD: "CTF{}",
  FIRST_DELAY: 60000,
  REPEAT_DELAY: 40000,
  MAX_FLIGHTS: 3,
  // после того как символ нарисован, хвост ещё виден — столько он остаётся кликабельным
  CLICKABLE_MS: 4000,

  flights: 0,
  found: false,
  pending: false,
  drop: null,
  box: null,
  lastDrawn: 0,

  schedule(delay) {
    setTimeout(() => {
      this.pending = true;
    }, delay);
  },

  launch() {
    this.pending = false;
    this.flights++;
    this.box = null;

    const drop = makeDrop(false);
    drop.layer = LAYERS[1];
    drop.speed = 0.5;
    drop.color = COLORS[0].value;
    drop.chars = CHARSETS[0].chars;
    drop.x = Math.floor(rand(0.05, 0.9) * window.innerWidth);

    // столбец стартует сверху как обычный, а слово появляется в средней части экрана, не под навбаром
    drop.y = 0;
    const wordRow = Math.floor(rand(0.3, 0.7) * window.innerHeight / drop.layer.size);
    const lead = Array.from({ length: wordRow }, () => nextChar(drop));
    drop.queue = [...lead, ...[...this.WORD].map((ch) => ({ ch, egg: true }))];

    drops[Math.floor(Math.random() * drops.length)] = drop;
    this.drop = drop;
  },

  onDraw(x, y, size) {
    const b = this.box;
    this.box = b
      ? { ...b, bottom: y + size * 0.3 }
      : { left: x - size * 0.4, right: x + size * 1.2, top: y - size, bottom: y + size * 0.3 };
    this.lastDrawn = performance.now();
  },

  onGone() {
    this.drop = null;
    if (!this.found && this.flights < this.MAX_FLIGHTS) this.schedule(this.REPEAT_DELAY);
  },

  hit(x, y) {
    const b = this.box;
    return Boolean(b) && !this.found && performance.now() - this.lastDrawn < this.CLICKABLE_MS
      && x >= b.left && x <= b.right && y >= b.top && y <= b.bottom;
  },
};

document.addEventListener("click", (e) => {
  if (e.target.closest("a, button") || !egg.hit(e.clientX, e.clientY)) return;
  egg.found = true;
  clickOrigin = { x: e.clientX, y: e.clientY };
  location.hash = "#secret";
});

document.addEventListener("mousemove", (e) => {
  document.body.style.cursor = egg.hit(e.clientX, e.clientY) ? "pointer" : "";
});

resizeRain();
window.addEventListener("resize", resizeRain);

if (reduceMotion) {
  for (let i = 0; i < 120; i++) drawRain();
} else {
  egg.schedule(egg.FIRST_DELAY);

  let last = 0;
  requestAnimationFrame(function loop(t) {
    if (t - last > FRAME_MS) {
      drawRain();
      last = t;
    }
    requestAnimationFrame(loop);
  });
}
