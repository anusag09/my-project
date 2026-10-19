'use strict';

// ---------- Canvas & scaling ----------
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let pixelScale = 1;

function resize() {
  const s = Math.min(window.innerWidth / W, window.innerHeight / H);
  const dpr = window.devicePixelRatio || 1;
  canvas.style.width = Math.floor(W * s) + 'px';
  canvas.style.height = Math.floor(H * s) + 'px';
  canvas.width = Math.floor(W * s * dpr);
  canvas.height = Math.floor(H * s * dpr);
  pixelScale = (W * s * dpr) / W;
}
window.addEventListener('resize', resize);
resize();

// ---------- Rendering ----------
const TUFTS = [];
for (let i = 0; i < 260; i++) TUFTS.push({ x: rand(0, W), y: rand(0, H), s: rand(2, 5), c: Math.random() < 0.5 ? PALETTE.grassDark : PALETTE.grassLight });
const TREES = [];
while (TREES.length < 26) {
  const x = rand(20, W - 20), y = rand(20, H - 20);
  if (dist(x, y, CX, CY) > 330 && x > 60 && x < W - 60 && y > 70 && y < H - 50) TREES.push({ x, y, r: rand(14, 24) });
}

// Soft round glow sprites, one per colour, drawn additively for bullets, muzzle flashes, coins and fire.
const glowCache = new Map();
function glowSprite(color) {
  let c = glowCache.get(color);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = c.height = 64;
  const gctx = c.getContext('2d');
  const grad = gctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, color);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  gctx.fillStyle = grad;
  gctx.fillRect(0, 0, 64, 64);
  glowCache.set(color, c);
  return c;
}
function drawGlow(x, y, radius, color, alpha = 1) {
  const prevOp = ctx.globalCompositeOperation, prevA = ctx.globalAlpha;
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = prevA * alpha;
  ctx.drawImage(glowSprite(color), x - radius, y - radius, radius * 2, radius * 2);
  ctx.globalCompositeOperation = prevOp;
  ctx.globalAlpha = prevA;
}

// Static lighting, built once: dark vignette towards the edges + warm light pool over the village.
const lightLayer = (() => {
  const vign = document.createElement('canvas');
  vign.width = W; vign.height = H;
  const v = vign.getContext('2d');
  const vg = v.createRadialGradient(CX, CY, 230, CX, CY, 820);
  vg.addColorStop(0, 'rgba(6,10,22,0)');
  vg.addColorStop(0.45, 'rgba(6,10,22,0.28)');
  vg.addColorStop(1, 'rgba(6,10,22,0.72)');
  v.fillStyle = vg;
  v.fillRect(0, 0, W, H);

  const warm = document.createElement('canvas');
  warm.width = W; warm.height = H;
  const w = warm.getContext('2d');
  const wg = w.createRadialGradient(CX, CY - 10, 0, CX, CY - 10, 330);
  wg.addColorStop(0, 'rgba(255,170,90,0.12)');
  wg.addColorStop(0.6, 'rgba(255,150,70,0.06)');
  wg.addColorStop(1, 'rgba(255,160,80,0)');
  w.fillStyle = wg;
  w.fillRect(0, 0, W, H);
  return { vign, warm };
})();

// ---------- Drawing helpers ----------
const FONT_FAMILY = '"Segoe UI", system-ui, sans-serif';
const font = (size, weight = 'bold') => `${weight} ${size}px ${FONT_FAMILY}`;

function fillCircle(x, y, r) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}
function fillEllipse(x, y, rx, ry, rotation = 0) {
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rotation, 0, Math.PI * 2); ctx.fill();
}
function drawShadow(x, y, rx, ry) {
  ctx.fillStyle = PALETTE.shadow;
  fillEllipse(x, y, rx, ry);
}
function fillPanel(x, y, w, h, r = 10) {
  ctx.fillStyle = PALETTE.uiPanel;
  roundRect(x, y, w, h, r); ctx.fill();
}
// Scale everything drawn next around the point (x, y).
function scaleAround(x, y, s) {
  ctx.translate(x, y); ctx.scale(s, s); ctx.translate(-x, -y);
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawText(str, x, y, { size = 16, color = '#fff', align = 'center', weight = 'bold', base = 'middle', stroke = true } = {}) {
  ctx.font = font(size, weight);
  ctx.textAlign = align;
  ctx.textBaseline = base;
  if (stroke) {
    ctx.lineWidth = Math.max(2, size / 5);
    ctx.strokeStyle = 'rgba(0,0,0,0.75)';
    ctx.lineJoin = 'round';
    ctx.strokeText(str, x, y);
  }
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

const hpColor = (frac) => frac > 0.5 ? PALETTE.hpGood : frac > 0.25 ? PALETTE.hpMid : PALETTE.hpLow;

function render() {
  ctx.setTransform(pixelScale, 0, 0, pixelScale, 0, 0);
  const shaking = run.shake > 0 && scene === 'playing';
  const sx = shaking ? rand(-run.shake, run.shake) : 0, sy = shaking ? rand(-run.shake, run.shake) : 0;

  ctx.save();
  ctx.translate(sx, sy);
  drawGround();
  drawSplats();
  const hover = scene === 'playing' ? targetAt(mouse.x, mouse.y) : null;
  drawSpots(hover);
  drawForge(hover);
  drawCore(hover);
  drawCoins();
  drawCorpses();
  drawEnemies();
  drawBullets();
  drawPlayer();
  drawParticles();
  ctx.restore();

  drawLighting();

  // world labels and floating text sit above the lighting so they stay readable
  ctx.save();
  ctx.translate(sx, sy);
  drawWorldLabels(hover);
  for (const t of run.texts) {
    const age = 1 - t.life / t.maxLife;
    ctx.globalAlpha = clamp(t.life / t.maxLife * 2, 0, 1);
    const size = t.size * (1 + 0.35 * Math.max(0, 1 - age * 6)); // quick pop-in
    drawText(t.text, t.x, t.y, { size, color: t.color });
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  drawHUD();
  if (hover) drawTooltip(hover);
  drawOverlay();
  drawCursor(hover);
}

function drawLighting() {
  ctx.drawImage(lightLayer.vign, 0, 0, W, H);
  ctx.globalCompositeOperation = 'lighter';
  ctx.drawImage(lightLayer.warm, 0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over';
}

function drawGround() {
  ctx.fillStyle = PALETTE.grass;
  ctx.fillRect(0, 0, W, H);
  for (const t of TUFTS) { ctx.fillStyle = t.c; ctx.fillRect(t.x, t.y, t.s, t.s); }
  // town ground
  ctx.fillStyle = PALETTE.dirtEdge;
  fillEllipse(CX, CY, 265, 245);
  ctx.fillStyle = PALETTE.dirt;
  fillEllipse(CX, CY, 248, 229);
  // wall edge: dark outer line with a lighter inner highlight
  ctx.strokeStyle = PALETTE.wallDark;
  ctx.lineWidth = 6;
  ctx.beginPath(); ctx.ellipse(CX, CY, 263, 243, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = PALETTE.wallLight;
  ctx.globalAlpha = 0.6;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(CX, CY, 258, 238, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = 1;
  for (const t of TREES) {
    drawShadow(t.x + 4, t.y + t.r * 0.6, t.r, t.r * 0.5);
    ctx.fillStyle = PALETTE.treeDark;
    fillCircle(t.x, t.y, t.r);
    ctx.fillStyle = PALETTE.treeLight;
    fillCircle(t.x - t.r * 0.25, t.y - t.r * 0.25, t.r * 0.6);
  }
}

function drawSplats() {
  for (const s of run.splats) {
    ctx.globalAlpha = 0.35 * (s.life / s.maxLife);
    ctx.fillStyle = s.color;
    fillEllipse(s.x, s.y, s.r, s.r * 0.6, s.rot);
  }
  ctx.globalAlpha = 1;
}

// Compact cost badge (coin + price). Shown only when affordable, or when the cursor or player is close.
function costBadge(t, x, y) {
  if (scene !== 'playing' && scene !== 'paused') return;
  const a = describePurchase(t);
  if (a.cost === null) return;
  const can = run.gold >= a.cost;
  const near = dist(mouse.x, mouse.y, x, y) < 110 || dist(run.player.x, run.player.y, x, y) < 110;
  if (!can && !near) return;
  const label = String(a.cost);
  ctx.font = font(13);
  const w = ctx.measureText(label).width + 30, h = 20;
  const by = y + (can ? Math.sin(clock * 4 + x) * 1.5 : 0);
  ctx.fillStyle = 'rgba(14,17,22,0.78)';
  roundRect(x - w / 2, by - h / 2, w, h, 10); ctx.fill();
  if (can) { ctx.strokeStyle = 'rgba(255,216,74,0.45)'; ctx.lineWidth = 1.5; ctx.stroke(); }
  // coin icon
  const cx = x - w / 2 + 11;
  ctx.fillStyle = PALETTE.gold;
  fillCircle(cx, by, 6);
  ctx.strokeStyle = PALETTE.goldDark; ctx.lineWidth = 1.5; ctx.stroke();
  drawText(label, cx + 10, by + 0.5, { size: 13, color: can ? PALETTE.uiText : PALETTE.bad, align: 'left', stroke: false });
}

function drawWorldLabels(hover) {
  if (scene !== 'playing' && scene !== 'paused') return;
  for (const s of run.spots) costBadge({ kind: 'spot', ref: s }, s.x, s.y + 40);
  const F = CONFIG.forge, FR = forgeRect();
  ctx.globalAlpha = 0.7;
  drawText('FORGE', F.x, FR.b + 12, { size: 11, color: '#f0d2b0' });
  ctx.globalAlpha = 1;
  costBadge({ kind: 'forge' }, F.x, FR.b + 32);
  const C = CONFIG.core, CR = coreRect();
  costBadge({ kind: 'core' }, C.x + 92, CR.t - C.roof - 36);
}

function drawSpots(hover) {
  for (const s of run.spots) {
    const hovered = hover && hover.kind === 'spot' && hover.ref === s;
    const lvIdx = Math.min(s.level, CONFIG.tower.levels.length - 1);
    if (hovered) {
      const range = CONFIG.tower.levels[s.level === 0 ? 0 : lvIdx].range;
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      fillCircle(s.x, s.y, range); ctx.stroke();
      ctx.setLineDash([]);
    }
    const scale = popScale(s.pop);
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.scale(scale, scale);
    if (s.level === 0) {
      ctx.fillStyle = hovered ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)';
      fillCircle(0, 0, 24);
      ctx.strokeStyle = hovered ? '#ffffff' : 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([6, 5]);
      ctx.beginPath(); ctx.arc(0, 0, 24, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = hovered ? '#fff' : 'rgba(255,255,255,0.75)';
      ctx.fillRect(-2.5, -10, 5, 20);
      ctx.fillRect(-10, -2.5, 20, 5);
    } else {
      const L = CONFIG.tower.levels[s.level - 1];
      drawShadow(3, 6, 26, 16);
      ctx.fillStyle = '#6b6b6b';
      fillCircle(0, 0, 24);
      ctx.strokeStyle = hovered ? '#ffffff' : '#3d3d3d';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = '#8a8a8a';
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.fillRect(Math.cos(a) * 20 - 3, Math.sin(a) * 20 - 3, 6, 6);
      }
      ctx.rotate(s.angle);
      ctx.fillStyle = '#2b2b2b';
      ctx.fillRect(4 - s.recoil, -4, 22, 8);
      if (s.muzzle > 0) drawGlow(28 - s.recoil, 0, 14, L.color, 0.9);
      ctx.rotate(-s.angle);
      ctx.fillStyle = L.color;
      fillCircle(0, 0, 12);
      ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 2; ctx.stroke();
      // level pips
      for (let i = 0; i < s.level; i++) {
        ctx.fillStyle = PALETTE.pip;
        fillCircle(-8 + i * 8, -32, 3.5);
        ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.stroke();
      }
    }
    ctx.restore();
  }
}

function drawForge(hover) {
  const F = CONFIG.forge, R = forgeRect();
  const hovered = hover && hover.kind === 'forge';
  const sc = popScale(run.forgePop);
  ctx.save();
  scaleAround(F.x, F.y, sc);
  ctx.fillStyle = PALETTE.shadow;
  roundRect(R.l + 5, R.t + 7, F.w, F.h, 6); ctx.fill();
  // chimney
  ctx.fillStyle = '#3a3a40';
  ctx.fillRect(R.r - 22, R.t - 16, 14, 20);
  // smoke
  for (let i = 0; i < 3; i++) {
    const t = (clock * 0.6 + i / 3) % 1;
    ctx.fillStyle = `rgba(200,200,200,${0.35 * (1 - t)})`;
    fillCircle(R.r - 15 + Math.sin(t * 6 + i) * 4, R.t - 18 - t * 30, 4 + t * 6);
  }
  ctx.fillStyle = '#4e4e57';
  roundRect(R.l, R.t, F.w, F.h, 6); ctx.fill();
  ctx.strokeStyle = hovered ? '#ffffff' : '#26262b';
  ctx.lineWidth = 3; ctx.stroke();
  // fire with glow
  const flicker = 0.6 + 0.4 * Math.sin(clock * 8) * Math.sin(clock * 3.1);
  ctx.fillStyle = `rgba(255,${120 + flicker * 60},40,${0.75 + flicker * 0.25})`;
  roundRect(R.l + 8, R.t + 12, 22, 26, 4); ctx.fill();
  drawGlow(R.l + 19, R.t + 25, 30 + flicker * 6, '#ff6a1a', 0.3);
  // anvil
  ctx.fillStyle = '#1e1e22';
  ctx.fillRect(F.x - 2, F.y - 6, 30, 7);
  ctx.fillRect(F.x + 6, F.y + 1, 14, 6);
  ctx.fillRect(F.x + 2, F.y + 7, 22, 5);
  // weapon level pips along the roof edge
  for (let i = 0; i < CONFIG.forge.maxLevel; i++) {
    ctx.fillStyle = i < run.weaponLevel ? PALETTE.pip : 'rgba(255,255,255,0.15)';
    fillCircle(R.l + 12 + i * 8, R.t + 5, 2.2);
  }
  ctx.restore();
}

function drawCore(hover) {
  const C = CONFIG.core, R = coreRect();
  const hovered = hover && hover.kind === 'core';
  const sc = popScale(run.corePop);
  ctx.save();
  scaleAround(C.x, C.y, sc);
  ctx.fillStyle = PALETTE.shadow;
  ctx.fillRect(R.l + 6, R.t + 8, C.w, C.h);
  // walls
  ctx.fillStyle = run.coreFlash > 0 ? '#ffb3a6' : '#d8c49a';
  ctx.fillRect(R.l, R.t, C.w, C.h);
  ctx.strokeStyle = hovered ? '#ffffff' : '#5a4a32';
  ctx.lineWidth = 3;
  ctx.strokeRect(R.l, R.t, C.w, C.h);
  // roof
  ctx.fillStyle = run.coreFlash > 0 ? '#ff6b5a' : '#a63d2f';
  ctx.beginPath();
  ctx.moveTo(R.l - 8, R.t + 4);
  ctx.lineTo(C.x, R.t - C.roof);
  ctx.lineTo(R.r + 8, R.t + 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // door & lit windows
  ctx.fillStyle = '#5a3a22';
  roundRect(C.x - 11, R.b - 30, 22, 30, 8); ctx.fill();
  ctx.fillStyle = '#ffe9a8';
  ctx.fillRect(R.l + 12, R.t + 14, 16, 14);
  ctx.fillRect(R.r - 28, R.t + 14, 16, 14);
  drawGlow(R.l + 20, R.t + 21, 18, '#ffb84a', 0.22);
  drawGlow(R.r - 20, R.t + 21, 18, '#ffb84a', 0.22);
  // flag
  ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(C.x, R.t - C.roof); ctx.lineTo(C.x, R.t - C.roof - 22); ctx.stroke();
  ctx.fillStyle = '#3d8bff';
  ctx.beginPath();
  const wave = Math.sin(clock * 4) * 3;
  ctx.moveTo(C.x, R.t - C.roof - 22);
  ctx.lineTo(C.x + 18, R.t - C.roof - 17 + wave);
  ctx.lineTo(C.x, R.t - C.roof - 12);
  ctx.fill();
  ctx.restore();

  // HP bar
  const bw = 120, bx = C.x - bw / 2, by = R.t - C.roof - 42;
  const frac = run.coreHp / C.maxHp;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  roundRect(bx - 2, by - 2, bw + 4, 14, 4); ctx.fill();
  ctx.fillStyle = hpColor(frac);
  roundRect(bx, by, bw * frac, 10, 3); ctx.fill();
}

function drawCoins() {
  for (const c of run.coins) {
    if (c.life < 5 && Math.floor(c.life * 8) % 2 === 0) continue; // blink before vanishing
    const r = c.value >= 6 ? 8 : 6;
    const bob = Math.sin(clock * 6 + c.x) * 1.5;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    fillEllipse(c.x, c.y + r, r, r * 0.4);
    drawGlow(c.x, c.y + bob, r * 2.6, PALETTE.gold, 0.35);
    ctx.fillStyle = PALETTE.gold;
    fillCircle(c.x, c.y + bob, r);
    ctx.strokeStyle = PALETTE.goldDark; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = PALETTE.goldShine;
    fillCircle(c.x - r * 0.3, c.y + bob - r * 0.3, r * 0.3);
  }
}

function drawCorpses() {
  for (const c of run.corpses) {
    const def = CONFIG.enemies[c.type];
    const t = 1 - c.life / c.maxLife; // 0 → 1
    ctx.save();
    ctx.globalAlpha = 1 - t;
    ctx.translate(c.x, c.y);
    ctx.scale(1 + 0.35 * t, 1 - 0.7 * t);
    ctx.fillStyle = def.color;
    fillCircle(0, 0, c.r);
    ctx.strokeStyle = def.dark; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.restore();
  }
}

function drawEnemies() {
  for (const e of run.enemies) {
    const def = CONFIG.enemies[e.type];
    const ang = Math.atan2(CONFIG.core.y - e.y, CONFIG.core.x - e.x);
    const lunge = e.attacking ? Math.max(0, Math.sin((1 - e.attackCd) * Math.PI)) * 4 : 0;
    const x = e.x + Math.cos(ang) * lunge, y = e.y + Math.sin(ang) * lunge + Math.sin(e.bob) * 1.5;
    drawShadow(e.x + 2, e.y + e.r * 0.7, e.r, e.r * 0.45);
    ctx.fillStyle = def.color;
    fillCircle(x, y, e.r);
    ctx.strokeStyle = def.dark; ctx.lineWidth = e.type === 'brute' ? 4 : 2.5; ctx.stroke();
    if (e.type === 'brute') {
      // horns
      ctx.fillStyle = '#e8e0d0';
      for (const side of [-1, 1]) {
        const a = ang + side * 0.9;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a) * e.r * 0.8, y + Math.sin(a) * e.r * 0.8);
        ctx.lineTo(x + Math.cos(a + side * 0.25) * (e.r + 9), y + Math.sin(a + side * 0.25) * (e.r + 9));
        ctx.lineTo(x + Math.cos(a - side * 0.35) * e.r * 0.9, y + Math.sin(a - side * 0.35) * e.r * 0.9);
        ctx.fill();
      }
    }
    // eyes facing the core
    ctx.fillStyle = '#fff';
    for (const side of [-1, 1]) {
      const a = ang + side * 0.45;
      fillCircle(x + Math.cos(a) * e.r * 0.55, y + Math.sin(a) * e.r * 0.55, e.r * 0.2);
    }
    // hit flash tints the body instead of replacing it
    if (e.flash > 0) {
      ctx.globalAlpha = 0.65 * (e.flash / 0.1);
      ctx.fillStyle = '#ffffff';
      fillCircle(x, y, e.r);
      ctx.globalAlpha = 1;
    }
    if (e.hp < e.maxHp) {
      const bw = e.r * 2.2;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(e.x - bw / 2, e.y - e.r - 10, bw, 4);
      ctx.fillStyle = PALETTE.hpLow;
      ctx.fillRect(e.x - bw / 2, e.y - e.r - 10, bw * clamp(e.hp / e.maxHp, 0, 1), 4);
    }
  }
}

function drawBullets() {
  for (const b of run.bullets) {
    drawGlow(b.x, b.y, b.r * 4, b.color, 0.55);
    ctx.strokeStyle = b.color;
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = b.r * 1.4;
    ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - b.vx * 0.02, b.y - b.vy * 0.02); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffffff';
    fillCircle(b.x, b.y, b.r * 0.75);
  }
}

function drawPlayer() {
  const p = run.player, r = CONFIG.player.radius;
  drawShadow(p.x + 2, p.y + r * 0.8, r, r * 0.45);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.angle);
  // cape behind the hero (opposite the aim)
  ctx.fillStyle = PALETTE.heroAccent;
  ctx.beginPath(); ctx.arc(-3, 0, r + 1, Math.PI * 0.55, Math.PI * 1.45); ctx.closePath(); ctx.fill();
  // gun with recoil
  ctx.fillStyle = '#2b2b2b';
  ctx.fillRect(4 - p.recoil, -4, 22, 8);
  // body
  ctx.fillStyle = PALETTE.hero;
  fillCircle(0, 0, r - 1);
  ctx.strokeStyle = PALETTE.heroOutline; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = PALETTE.heroAccent;
  ctx.fillRect(-3, -r + 3, 4, (r - 3) * 2);    // shoulder strap
  ctx.fillStyle = PALETTE.heroSkin;
  fillCircle(3, 0, r * 0.42);
  // muzzle flash
  if (p.muzzle > 0) {
    const mx = 28 - p.recoil;
    drawGlow(mx, 0, 18, '#fff1b0', 1);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(mx - 2, -4); ctx.lineTo(mx + 9, 0); ctx.lineTo(mx - 2, 4); ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawParticles() {
  for (const p of run.particles) {
    const a = clamp(p.life / p.maxLife, 0, 1);
    if (p.glow) { drawGlow(p.x, p.y, p.r * 3, p.color, a); continue; }
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    fillCircle(p.x, p.y, p.r);
  }
  ctx.globalAlpha = 1;
}

function drawHUD() {
  if (scene === 'start') return;
  // gold
  fillPanel(14, 12, 170, 44);
  ctx.fillStyle = PALETTE.gold;
  fillCircle(38, 34, 11);
  ctx.strokeStyle = PALETTE.goldDark; ctx.lineWidth = 2; ctx.stroke();
  drawText(String(run.gold), 58, 35, { size: 24, color: PALETTE.gold, align: 'left' });

  // timer
  const tw = 260, tx = W / 2 - tw / 2;
  fillPanel(tx, 12, tw, 52);
  drawText(`${formatTime(run.time)} / ${formatTime(CONFIG.winTime)}`, W / 2, 32, { size: 22, color: PALETTE.uiText });
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  roundRect(tx + 16, 48, tw - 32, 7, 3); ctx.fill();
  ctx.fillStyle = PALETTE.uiAccent;
  roundRect(tx + 16, 48, (tw - 32) * (run.time / CONFIG.winTime), 7, 3); ctx.fill();

  // core + weapon
  const rw = 220, rx = W - rw - 14;
  fillPanel(rx, 12, rw, 52);
  const frac = run.coreHp / CONFIG.core.maxHp;
  drawText('Town', rx + 14, 28, { size: 14, color: '#d8c49a', align: 'left' });
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  roundRect(rx + 60, 22, rw - 76, 12, 4); ctx.fill();
  ctx.fillStyle = hpColor(frac);
  roundRect(rx + 60, 22, (rw - 76) * frac, 12, 4); ctx.fill();
  drawText(`${Math.ceil(run.coreHp)}`, rx + 60 + (rw - 76) / 2, 28.5, { size: 11, color: '#fff' });
  drawText(`Weapon Lv${run.weaponLevel}  ·  ${weaponDamage(run.weaponLevel)} dmg  ·  ${weaponRate(run.weaponLevel).toFixed(1)}/s`, rx + 14, 50, { size: 12, color: '#cfd8dc', align: 'left', weight: '600' });

  // help line (fades after ~20s)
  if (run.time < 22) {
    ctx.globalAlpha = clamp((22 - run.time) / 3, 0, 1);
    fillPanel(W / 2 - 360, H - 56, 720, 40);
    drawText('WASD move  ·  Hold click to shoot  ·  Click tower spots, the town or the forge to spend gold', W / 2, H - 36, { size: 15, color: PALETTE.uiText, weight: '600' });
    ctx.globalAlpha = 1;
  }

  if (run.notice) {
    ctx.globalAlpha = clamp(run.notice.life, 0, 1);
    drawText(run.notice.text, W / 2, 110, { size: 30, color: '#ff8a65' });
    ctx.globalAlpha = 1;
  }

  if (DEBUG) drawText('DEBUG: G +500 gold · T +60s · K hurt town', 14, H - 14, { size: 12, color: '#ff0', align: 'left' });
}

function drawTooltip(t) {
  const a = describePurchase(t);
  const lines = [a.title, a.cost === null ? a.line : `${a.line} — ${a.cost}g`, a.detail];
  ctx.font = font(14);
  const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 24;
  const h = 70;
  let x = mouse.x + 18, y = mouse.y + 18;
  if (x + w > W - 8) x = mouse.x - w - 18;
  if (y + h > H - 8) y = mouse.y - h - 18;
  ctx.fillStyle = 'rgba(14,17,22,0.94)';
  roundRect(x, y, w, h, 8); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1; ctx.stroke();
  drawText(lines[0], x + 12, y + 16, { size: 14, color: PALETTE.uiText, align: 'left', stroke: false });
  const can = a.cost !== null && run.gold >= a.cost;
  drawText(lines[1], x + 12, y + 36, { size: 14, color: a.cost === null ? PALETTE.uiMuted : can ? PALETTE.good : PALETTE.bad, align: 'left', stroke: false });
  drawText(lines[2], x + 12, y + 55, { size: 12, color: PALETTE.uiMuted, align: 'left', weight: '600', stroke: false });
}

function drawOverlay() {
  if (scene === 'playing') return;
  ctx.fillStyle = scene === 'paused' ? 'rgba(10,12,16,0.55)' : 'rgba(10,12,16,0.78)';
  ctx.fillRect(0, 0, W, H);
  const blink = 0.6 + 0.4 * Math.sin(clock * 4);
  const glowTitle = (str, y, size, color) => {
    ctx.save();
    ctx.shadowColor = PALETTE.titleGlow;
    ctx.shadowBlur = 28;
    drawText(str, W / 2, y, { size, color });
    ctx.restore();
  };

  if (scene === 'start') {
    glowTitle('THE LAST VILLAGE', 150, 64, PALETTE.title);
    drawText('Survive 10 minutes. Keep the town core standing.', W / 2, 210, { size: 22, color: PALETTE.uiText, weight: '600' });
    const rows = [
      ['WASD', 'Move'],
      ['Mouse', 'Aim'],
      ['Hold Left Click', 'Shoot'],
      ['Walk near gold', 'Collect it'],
      ['Click  ⊕  tower spot', 'Build a tower (then click again to upgrade)'],
      ['Click the town', 'Repair it'],
      ['Click the forge', 'Upgrade your weapon'],
    ];
    rows.forEach(([k, v], i) => {
      const y = 280 + i * 36;
      drawText(k, W / 2 - 20, y, { size: 18, color: PALETTE.uiAccent, align: 'right' });
      drawText(v, W / 2 + 20, y, { size: 18, color: '#e0e0e0', align: 'left', weight: '600' });
    });
    ctx.globalAlpha = blink;
    drawText('Click to start', W / 2, 560, { size: 28, color: PALETTE.uiText });
    ctx.globalAlpha = 1;
    drawText('P / Esc to pause', W / 2, 600, { size: 14, color: '#90a4ae', weight: '600' });
  } else if (scene === 'paused') {
    drawText('PAUSED', W / 2, H / 2 - 20, { size: 56, color: PALETTE.uiText });
    drawText('Press P or click to resume', W / 2, H / 2 + 34, { size: 20, color: '#cfd8dc', weight: '600' });
  } else {
    const won = scene === 'won';
    glowTitle(won ? 'THE VILLAGE STANDS!' : 'THE VILLAGE HAS FALLEN', 220, 58, won ? PALETTE.good : PALETTE.bad);
    drawText(won ? 'You held out for 10 minutes.' : 'The town core was destroyed.', W / 2, 280, { size: 22, color: PALETTE.uiText, weight: '600' });
    const stats = [['Time survived', formatTime(run.time)], ['Enemies defeated', String(run.kills)], ['Gold earned', String(run.goldEarned)]];
    stats.forEach(([k, v], i) => {
      const y = 350 + i * 38;
      drawText(k, W / 2 - 20, y, { size: 20, color: PALETTE.uiMuted, align: 'right', weight: '600' });
      drawText(v, W / 2 + 20, y, { size: 22, color: i === 2 ? PALETTE.gold : PALETTE.uiText, align: 'left' });
    });
    if (sceneTime > 0.8) {
      ctx.globalAlpha = blink;
      drawText('Click to play again', W / 2, 520, { size: 28, color: PALETTE.uiText });
      ctx.globalAlpha = 1;
    }
  }
}

function drawCursor(hover) {
  const x = mouse.x, y = mouse.y;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y, hover ? 11 : 8, 0, Math.PI * 2); ctx.stroke();
  if (!hover) {
    ctx.beginPath();
    ctx.moveTo(x - 13, y); ctx.lineTo(x - 4, y);
    ctx.moveTo(x + 4, y); ctx.lineTo(x + 13, y);
    ctx.moveTo(x, y - 13); ctx.lineTo(x, y - 4);
    ctx.moveTo(x, y + 4); ctx.lineTo(x, y + 13);
    ctx.stroke();
  } else {
    ctx.fillStyle = '#ffffff';
    fillCircle(x, y, 3);
  }
}
