'use strict';

// ---------- Helpers ----------
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const formatTime = (s) => {
  s = Math.max(0, Math.floor(s));
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
};

// Easing for pops and floating text (t in 0..1)
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const easeOutBack = (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const POP_TIME = 0.35;
// Scale for a purchase "pop": starts small, overshoots, settles at 1.
const popScale = (pop) => pop > 0 ? lerp(0.7, 1, easeOutBack(1 - pop / POP_TIME)) : 1;

// Counts a timer down towards 0 without going below it.
const decay = (value, amount) => Math.max(0, value - amount);

// Ages every item by dt and drops the expired ones.
function tickLife(items, dt) {
  for (const item of items) item.life -= dt;
  return items.filter((item) => item.life > 0);
}

// Bounding box { l, r, t, b } of something centred at (x, y) with size w × h.
const rectAround = ({ x, y, w, h }) => ({ l: x - w / 2, r: x + w / 2, t: y - h / 2, b: y + h / 2 });
const coreRect = () => rectAround(CONFIG.core);
const forgeRect = () => rectAround(CONFIG.forge);
const inRect = (x, y, R) => x >= R.l && x <= R.r && y >= R.t && y <= R.b;

const SPOT_POSITIONS = [];
for (let i = 0; i < 6; i++) {
  const a = (i / 6) * Math.PI * 2;
  SPOT_POSITIONS.push({ x: CX + Math.cos(a) * CONFIG.tower.spotRadius, y: CY + Math.sin(a) * CONFIG.tower.spotRadius * 0.92 });
}
