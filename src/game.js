'use strict';

// ---------- Game state ----------
// Game rules only: no DOM, no input devices. The current run lives in `run`.
let run = null;

function newGame() {
  run = {
    outcome: null,   // set to 'won' or 'lost' when the run ends
    time: 0,
    gold: CONFIG.startGold,
    goldEarned: 0,
    kills: 0,
    coreHp: CONFIG.core.maxHp,
    coreFlash: 0,
    weaponLevel: 1,
    player: { x: CX - 110, y: CY + 10, angle: -Math.PI / 2, fireCd: 0, recoil: 0, muzzle: 0 },
    enemies: [],
    bullets: [],
    coins: [],
    texts: [],
    particles: [],
    corpses: [],   // short squash-and-fade after an enemy dies
    splats: [],    // faint ground marks that linger a few seconds
    spots: SPOT_POSITIONS.map((p) => ({ x: p.x, y: p.y, level: 0, cd: 0, angle: -Math.PI / 2, pop: 0, recoil: 0, muzzle: 0 })),
    spawnTimer: 1.5,
    nextSurge: CONFIG.spawn.surgeEvery,
    notice: null,
    shake: 0,
    forgePop: 0,
    corePop: 0,
  };
}
newGame();

// ---------- Weapon ----------
function weaponDamage(level) { return CONFIG.player.baseDamage + CONFIG.forge.dmgStep * Math.floor(level / 2); }
function weaponRate(level) { return CONFIG.player.baseFireRate + CONFIG.forge.rateStep * Math.floor((level - 1) / 2); }
function forgeCost(level) { return Math.round(CONFIG.forge.baseCost * Math.pow(CONFIG.forge.costGrowth, level - 1)); }

// ---------- Effects ----------
function floatText(x, y, text, color, size = 16) {
  run.texts.push({ x, y, y0: y, text, color, size, life: 1.1, maxLife: 1.1 });
}
function burst(x, y, color, n, speed = 140) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, Math.PI * 2), s = rand(speed * 0.3, speed);
    run.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.3, 0.6), maxLife: 0.6, color, r: rand(2, 4) });
  }
}
function addGold(v, x, y) {
  run.gold += v;
  run.goldEarned += v;
  floatText(x, y - 10, '+' + v + 'g', PALETTE.gold, 15);
}
function damageCore(amount) {
  run.coreHp = Math.max(0, run.coreHp - amount);
  run.coreFlash = 0.15;
  run.shake = Math.max(run.shake, amount >= 10 ? 7 : 3);
}

// ---------- Interactables ----------
function targetAt(x, y) {
  for (const s of run.spots) if (dist(x, y, s.x, s.y) < 30) return { kind: 'spot', ref: s };
  const cr = coreRect();
  if (inRect(x, y, { l: cr.l - 6, r: cr.r + 6, t: cr.t - CONFIG.core.roof - 6, b: cr.b })) return { kind: 'core' };
  if (inRect(x, y, forgeRect())) return { kind: 'forge' };
  return null;
}

// Describes what clicking a target would do. cost === null means nothing to buy.
function describePurchase(t) {
  if (t.kind === 'spot') {
    const s = t.ref, T = CONFIG.tower;
    if (s.level === 0) {
      const L = T.levels[0];
      return { title: 'Empty Tower Spot', line: 'Build Tower', short: 'Build', cost: T.buildCost, detail: `Auto-shoots: ${L.damage} dmg, range ${L.range}` };
    }
    if (s.level < T.levels.length) {
      const a = T.levels[s.level - 1], b = T.levels[s.level];
      return { title: `Tower Lv${s.level}`, line: `Upgrade to Lv${s.level + 1}`, short: 'Upgrade', cost: T.upgradeCost[s.level - 1],
        detail: `Dmg ${a.damage}→${b.damage} · Rate ${a.rate}→${b.rate}/s · Range ${a.range}→${b.range}` };
    }
    return { title: `Tower Lv${s.level}`, line: 'Max level', short: 'MAX', cost: null, detail: 'Fully upgraded' };
  }
  if (t.kind === 'core') {
    const C = CONFIG.core;
    if (run.coreHp >= C.maxHp) return { title: 'Town Core', line: 'Fully repaired', short: '', cost: null, detail: `HP ${Math.ceil(run.coreHp)}/${C.maxHp} · Don't let it fall!` };
    return { title: 'Town Core', line: `Repair +${C.repairAmount} HP`, short: 'Repair', cost: C.repairCost, detail: `HP ${Math.ceil(run.coreHp)}/${C.maxHp}` };
  }
  if (t.kind === 'forge') {
    const F = CONFIG.forge, lv = run.weaponLevel;
    if (lv >= F.maxLevel) return { title: `Forge · Weapon Lv${lv}`, line: 'Max level', short: 'MAX', cost: null, detail: 'Your weapon is fully upgraded' };
    const dmgNext = lv % 2 === 1;
    const detail = dmgNext
      ? `Damage ${weaponDamage(lv)}→${weaponDamage(lv + 1)}`
      : `Fire rate ${weaponRate(lv).toFixed(1)}→${weaponRate(lv + 1).toFixed(1)}/s`;
    return { title: `Forge · Weapon Lv${lv}`, line: `Upgrade Weapon to Lv${lv + 1}`, short: 'Upgrade', cost: forgeCost(lv), detail };
  }
}

// (x, y) is where the click happened; feedback text appears there.
function tryPurchase(t, x, y) {
  const a = describePurchase(t);
  if (a.cost === null) { floatText(x, y - 14, a.line, PALETTE.uiMuted, 14); return; }
  if (run.gold < a.cost) { floatText(x, y - 14, `Need ${a.cost}g`, PALETTE.bad, 15); return; }
  run.gold -= a.cost;
  floatText(x, y - 14, `-${a.cost}g`, PALETTE.spend, 15);

  if (t.kind === 'spot') {
    t.ref.level++;
    t.ref.pop = POP_TIME;
    burst(t.ref.x, t.ref.y, CONFIG.tower.levels[t.ref.level - 1].color, 14);
  } else if (t.kind === 'core') {
    run.coreHp = Math.min(CONFIG.core.maxHp, run.coreHp + CONFIG.core.repairAmount);
    run.corePop = POP_TIME;
    burst(CONFIG.core.x, CONFIG.core.y, PALETTE.good, 16);
  } else if (t.kind === 'forge') {
    run.weaponLevel++;
    run.forgePop = POP_TIME;
    burst(CONFIG.forge.x, CONFIG.forge.y, '#ff9a3c', 18);
  }
}

// ---------- Spawning ----------
function spawnInterval(t) {
  const p = clamp(t / CONFIG.winTime, 0, 1);
  return lerp(CONFIG.spawn.startInterval, CONFIG.spawn.endInterval, Math.pow(p, 0.85));
}
function bruteChance(t) {
  const S = CONFIG.spawn;
  if (t < S.bruteStart) return 0;
  return Math.min(S.bruteMaxChance, ((t - S.bruteStart) / (CONFIG.winTime - S.bruteStart)) * S.bruteMaxChance * 1.25);
}

function spawnEnemy(type) {
  const def = CONFIG.enemies[type];
  const m = 30;
  let x, y;
  switch (randi(0, 3)) {
    case 0: x = rand(0, W); y = -m; break;
    case 1: x = W + m; y = rand(0, H); break;
    case 2: x = rand(0, W); y = H + m; break;
    default: x = -m; y = rand(0, H); break;
  }
  const p = run.time / CONFIG.winTime;
  const hp = Math.round(def.hp * (1 + run.time / CONFIG.spawn.hpGrowthSeconds + CONFIG.spawn.lateHpBonus * p * p));
  run.enemies.push({
    type, x, y, r: def.radius, speed: def.speed * rand(0.9, 1.1),
    hp, maxHp: hp, dps: def.dps, attackCd: 0.3, flash: 0, attacking: false, bob: rand(0, 6.28),
  });
}

function updateSpawner(dt) {
  run.spawnTimer -= dt;
  if (run.spawnTimer <= 0) {
    run.spawnTimer += spawnInterval(run.time);
    spawnEnemy(Math.random() < bruteChance(run.time) ? 'brute' : 'runner');
  }
  if (run.time >= run.nextSurge) {
    run.nextSurge += CONFIG.spawn.surgeEvery;
    run.notice = { text: 'The horde grows stronger!', life: 3 };
    const k = Math.round(run.time / CONFIG.spawn.surgeEvery);
    for (let i = 0; i < 3 + k; i++) spawnEnemy('runner');
    for (let i = 0; i < Math.floor(k / 2); i++) spawnEnemy('brute');
  }
}

// ---------- Update ----------
// Advances the run by dt seconds.
// controls: { moveX, moveY (each -1/0/1), aimX, aimY, firing } — see readControls() in input.js.
function update(dt, controls) {
  run.time += dt;
  if (run.time >= CONFIG.winTime) { run.time = CONFIG.winTime; run.outcome = 'won'; return; }

  updatePlayer(dt, controls);
  updateSpawner(dt);
  updateEnemies(dt);
  updateTowers(dt);
  updateBullets(dt);
  updateCoins(dt);
  updateEffects(dt);

  if (run.coreHp <= 0) {
    burst(CONFIG.core.x, CONFIG.core.y, PALETTE.hpLow, 40, 260);
    run.outcome = 'lost';
  }
}

function updatePlayer(dt, controls) {
  const p = run.player, P = CONFIG.player;
  const mx = controls.moveX, my = controls.moveY;
  if (mx || my) {
    const l = Math.hypot(mx, my);
    p.x += (mx / l) * P.speed * dt;
    p.y += (my / l) * P.speed * dt;
  }
  p.x = clamp(p.x, P.radius, W - P.radius);
  p.y = clamp(p.y, P.radius, H - P.radius);
  p.angle = Math.atan2(controls.aimY - p.y, controls.aimX - p.x);

  p.fireCd -= dt;
  p.recoil = decay(p.recoil, dt * 40);
  p.muzzle = decay(p.muzzle, dt);
  if (controls.firing && p.fireCd <= 0) {
    p.fireCd = 1 / weaponRate(run.weaponLevel);
    p.recoil = 4;
    p.muzzle = 0.05;
    fireBullet(p, p.angle, 24, P.bulletSpeed, { dmg: weaponDamage(run.weaponLevel), life: 1, color: PALETTE.heroBullet, target: null });
  }
}

// Spawns a bullet `offset` px from `from` along `angle`. Bullets with a target home in on it.
function fireBullet(from, angle, offset, speed, { dmg, life, color, target }) {
  const c = Math.cos(angle), s = Math.sin(angle);
  run.bullets.push({ x: from.x + c * offset, y: from.y + s * offset, vx: c * speed, vy: s * speed, r: 4, dmg, life, color, target });
}

function updateEnemies(dt) {
  const cr = coreRect();
  for (const e of run.enemies) {
    e.flash = decay(e.flash, dt);
    const nx = clamp(e.x, cr.l, cr.r), ny = clamp(e.y, cr.t, cr.b);
    if (dist(e.x, e.y, nx, ny) > e.r + 2) {
      e.attacking = false;
      const dx = CONFIG.core.x - e.x, dy = CONFIG.core.y - e.y, l = Math.hypot(dx, dy) || 1;
      e.x += (dx / l) * e.speed * dt;
      e.y += (dy / l) * e.speed * dt;
      e.bob += dt * e.speed * 0.12;
    } else {
      e.attacking = true;
      e.attackCd -= dt;
      if (e.attackCd <= 0) { e.attackCd = 1; damageCore(e.dps); }
    }
  }
  // light separation so crowds spread out
  const es = run.enemies;
  for (let i = 0; i < es.length; i++) {
    for (let j = i + 1; j < es.length; j++) {
      const a = es[i], b = es[j];
      const dx = b.x - a.x, dy = b.y - a.y, min = a.r + b.r;
      const d2 = dx * dx + dy * dy;
      if (d2 > 0 && d2 < min * min) {
        const d = Math.sqrt(d2), push = (min - d) * 0.5;
        const ux = dx / d, uy = dy / d;
        a.x -= ux * push; a.y -= uy * push;
        b.x += ux * push; b.y += uy * push;
      }
    }
  }
}

function updateTowers(dt) {
  for (const s of run.spots) {
    s.pop = decay(s.pop, dt);
    s.recoil = decay(s.recoil, dt * 30);
    s.muzzle = decay(s.muzzle, dt);
    if (s.level === 0) continue;
    const L = CONFIG.tower.levels[s.level - 1];
    s.cd -= dt;
    let best = null, bestD = L.range;
    for (const e of run.enemies) {
      const d = dist(s.x, s.y, e.x, e.y);
      if (d < bestD) { best = e; bestD = d; }
    }
    if (!best) continue;
    s.angle = Math.atan2(best.y - s.y, best.x - s.x);
    if (s.cd <= 0) {
      s.cd = 1 / L.rate;
      s.recoil = 4;
      s.muzzle = 0.05;
      fireBullet(s, s.angle, 26, CONFIG.tower.bulletSpeed, { dmg: L.damage, life: 1.2, color: L.color, target: best });
    }
  }
}

function updateBullets(dt) {
  for (const b of run.bullets) {
    if (b.target) {
      if (b.target.hp > 0) {
        const dx = b.target.x - b.x, dy = b.target.y - b.y, l = Math.hypot(dx, dy) || 1, sp = Math.hypot(b.vx, b.vy);
        b.vx = (dx / l) * sp; b.vy = (dy / l) * sp;
      } else b.target = null;
    }
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    for (const e of run.enemies) {
      if (e.hp > 0 && dist(b.x, b.y, e.x, e.y) < e.r + b.r) {
        e.hp -= b.dmg;
        e.flash = 0.1;
        // knockback along the bullet's direction
        const sp = Math.hypot(b.vx, b.vy) || 1, kb = CONFIG.enemies[e.type].knockback;
        e.x += (b.vx / sp) * kb;
        e.y += (b.vy / sp) * kb;
        b.life = 0;
        burst(b.x, b.y, b.color, 3, 80);
        break;
      }
    }
  }
  run.bullets = run.bullets.filter((b) => b.life > 0 && b.x > -50 && b.x < W + 50 && b.y > -50 && b.y < H + 50);

  const alive = [];
  for (const e of run.enemies) {
    if (e.hp > 0) { alive.push(e); continue; }
    const def = CONFIG.enemies[e.type];
    run.kills++;
    burst(e.x, e.y, def.color, e.type === 'brute' ? 18 : 9, 170);
    run.corpses.push({ type: e.type, x: e.x, y: e.y, r: e.r, life: 0.25, maxLife: 0.25 });
    run.splats.push({ x: e.x, y: e.y, r: e.r * rand(0.9, 1.3), rot: rand(0, Math.PI), life: 4, maxLife: 4, color: def.dark });
    if (run.splats.length > 80) run.splats.shift();
    let total = randi(def.gold[0], def.gold[1]);
    for (let i = 0; i < def.coins; i++) {
      const v = i === def.coins - 1 ? total : Math.floor(total / (def.coins - i));
      total -= v;
      const a = rand(0, Math.PI * 2), sp = rand(40, 120);
      run.coins.push({ x: e.x, y: e.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, value: v, life: CONFIG.coin.life, magnet: false });
    }
  }
  run.enemies = alive;
}

function updateCoins(dt) {
  const p = run.player, P = CONFIG.player;
  for (const c of run.coins) {
    c.life -= dt;
    const d = dist(c.x, c.y, p.x, p.y);
    if (d < P.magnetRadius) c.magnet = true;
    if (c.magnet) {
      const sp = CONFIG.coin.flySpeed * dt;
      c.x += ((p.x - c.x) / (d || 1)) * Math.min(sp, d);
      c.y += ((p.y - c.y) / (d || 1)) * Math.min(sp, d);
      // sparkle trail while flying to the player
      if (Math.random() < 0.5) run.particles.push({ x: c.x + rand(-3, 3), y: c.y + rand(-3, 3), vx: 0, vy: -20, life: 0.25, maxLife: 0.25, color: PALETTE.goldShine, r: rand(1.5, 2.5), glow: true });
    } else {
      c.x += c.vx * dt; c.y += c.vy * dt;
      c.vx *= Math.pow(0.02, dt); c.vy *= Math.pow(0.02, dt);
    }
    if (dist(c.x, c.y, p.x, p.y) < P.pickupRadius) {
      addGold(c.value, p.x, p.y - 16);
      c.life = 0;
    }
  }
  run.coins = run.coins.filter((c) => c.life > 0);
}

function updateEffects(dt) {
  for (const t of run.texts) {
    t.life -= dt;
    t.y = t.y0 - 38 * easeOutCubic(1 - t.life / t.maxLife);
  }
  run.texts = run.texts.filter((t) => t.life > 0);
  run.corpses = tickLife(run.corpses, dt);
  run.splats = tickLife(run.splats, dt);
  updateParticles(dt);
  run.shake = decay(run.shake, dt * 25);
  run.coreFlash = decay(run.coreFlash, dt);
  run.forgePop = decay(run.forgePop, dt);
  run.corePop = decay(run.corePop, dt);
  if (run.notice) { run.notice.life -= dt; if (run.notice.life <= 0) run.notice = null; }
}
function updateParticles(dt) {
  for (const p of run.particles) {
    p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt;
    p.vx *= Math.pow(0.05, dt); p.vy *= Math.pow(0.05, dt);
  }
  run.particles = run.particles.filter((p) => p.life > 0);
}
