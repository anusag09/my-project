'use strict';
// Unit tests for the game rules in src/game.js (loaded without any DOM).

const test = require('node:test');
const assert = require('node:assert');
const { loadRules } = require('./support/harness');

const IDLE = { moveX: 0, moveY: 0, aimX: 0, aimY: 0, firing: false };
// Arrays built inside the sandbox have a different Array prototype; copy before deep-comparing.
const plain = (value) => JSON.parse(JSON.stringify(value));

function freshRun() {
  const rules = loadRules();
  rules.newGame();
  return rules;
}

test('a new run starts with starting gold, a full town, weapon Lv1 and 6 empty tower spots', () => {
  const { run, CONFIG } = freshRun();
  assert.strictEqual(run.gold, CONFIG.startGold);
  assert.strictEqual(run.coreHp, CONFIG.core.maxHp);
  assert.strictEqual(run.weaponLevel, 1);
  assert.deepStrictEqual(plain(run.spots.map((s) => s.level)), [0, 0, 0, 0, 0, 0]);
  assert.strictEqual(run.outcome, null);
});

test('clicking a spot builds a tower, then upgrades it to Lv3, charging each step', () => {
  const rules = freshRun();
  const { run, CONFIG } = rules;
  const spot = { kind: 'spot', ref: run.spots[0] };
  run.gold = 1000;
  const costs = [CONFIG.tower.buildCost, ...CONFIG.tower.upgradeCost];
  for (const [i, cost] of costs.entries()) {
    const before = run.gold;
    rules.tryPurchase(spot, 0, 0);
    assert.strictEqual(run.spots[0].level, i + 1);
    assert.strictEqual(before - run.gold, cost);
  }
  // Max level: nothing more to buy, no gold taken
  assert.strictEqual(rules.describePurchase(spot).cost, null);
  const before = run.gold;
  rules.tryPurchase(spot, 0, 0);
  assert.strictEqual(run.gold, before);
  assert.strictEqual(run.spots[0].level, 3);
});

test('without enough gold nothing is bought', () => {
  const rules = freshRun();
  rules.run.gold = 10;
  rules.tryPurchase({ kind: 'spot', ref: rules.run.spots[2] }, 0, 0);
  rules.tryPurchase({ kind: 'forge' }, 0, 0);
  assert.strictEqual(rules.run.gold, 10);
  assert.strictEqual(rules.run.spots[2].level, 0);
  assert.strictEqual(rules.run.weaponLevel, 1);
});

test('repairing the town costs gold only when damaged and never exceeds max HP', () => {
  const rules = freshRun();
  const { run, CONFIG } = rules;
  run.gold = 500;
  rules.tryPurchase({ kind: 'core' }, 0, 0);
  assert.strictEqual(run.gold, 500, 'full HP: repair is free and does nothing');

  rules.damageCore(150);
  rules.tryPurchase({ kind: 'core' }, 0, 0);
  assert.strictEqual(run.coreHp, CONFIG.core.maxHp - 150 + CONFIG.core.repairAmount);
  rules.tryPurchase({ kind: 'core' }, 0, 0);
  assert.strictEqual(run.coreHp, CONFIG.core.maxHp, 'capped at max');
  assert.strictEqual(run.gold, 500 - 2 * CONFIG.core.repairCost);
});

test('forge upgrades alternate damage and fire rate, with rising cost', () => {
  const rules = freshRun();
  const { run } = rules;
  run.gold = 10000;
  const seen = [];
  while (rules.describePurchase({ kind: 'forge' }).cost !== null) {
    const lv = run.weaponLevel;
    seen.push({ cost: rules.forgeCost(lv), dmg: rules.weaponDamage(lv), rate: rules.weaponRate(lv) });
    rules.tryPurchase({ kind: 'forge' }, 0, 0);
  }
  assert.strictEqual(run.weaponLevel, rules.CONFIG.forge.maxLevel);
  assert.deepStrictEqual(seen.map((s) => s.cost), [40, 60, 90, 135, 203, 304, 456]);
  assert.deepStrictEqual(seen.map((s) => s.dmg), [10, 15, 15, 20, 20, 25, 25]);
  assert.deepStrictEqual(seen.map((s) => +s.rate.toFixed(1)), [4, 4, 5.2, 5.2, 6.4, 6.4, 7.6]);
});

test('targetAt finds tower spots, the town core and the forge, and nothing on open ground', () => {
  const { targetAt, SPOT_POSITIONS, CONFIG, run } = freshRun();
  const spot = targetAt(SPOT_POSITIONS[4].x + 5, SPOT_POSITIONS[4].y - 5);
  assert.strictEqual(spot.kind, 'spot');
  assert.strictEqual(spot.ref, run.spots[4]);
  assert.strictEqual(targetAt(CONFIG.core.x, CONFIG.core.y).kind, 'core');
  assert.strictEqual(targetAt(CONFIG.forge.x, CONFIG.forge.y).kind, 'forge');
  assert.strictEqual(targetAt(60, 60), null);
});

test('surviving to 10:00 wins the run', () => {
  const rules = freshRun();
  rules.run.time = rules.CONFIG.winTime - 0.01;
  rules.update(0.02, IDLE);
  assert.strictEqual(rules.run.outcome, 'won');
  assert.strictEqual(rules.run.time, rules.CONFIG.winTime);
});

test('the run is lost when the town core reaches 0 HP', () => {
  const rules = freshRun();
  rules.damageCore(rules.CONFIG.core.maxHp + 50);
  assert.strictEqual(rules.run.coreHp, 0);
  rules.update(1 / 60, IDLE);
  assert.strictEqual(rules.run.outcome, 'lost');
});

test('holding fire shoots at the weapon fire rate', () => {
  const rules = freshRun();
  const { run } = rules;
  const firing = { ...IDLE, aimX: run.player.x + 100, aimY: run.player.y, firing: true };
  const shots = new Set(); // bullets leave the screen quickly, so remember every one we saw
  const step = () => {
    rules.update(1 / 60, firing);
    for (const b of run.bullets) if (b.target === null) shots.add(b);
  };
  step(); step();
  assert.strictEqual(shots.size, 1, 'second frame is still on cooldown');
  for (let i = 0; i < 60; i++) step(); // ~1 more second
  const expected = 1 + rules.weaponRate(1);
  assert.ok(Math.abs(shots.size - expected) <= 1, `expected about ${expected} shots, got ${shots.size}`);
});

test('diagonal movement is as fast as straight movement', () => {
  const rules = freshRun();
  const { run, CONFIG } = rules;
  run.player.x = 640; run.player.y = 360;
  for (let i = 0; i < 30; i++) rules.update(1 / 60, { ...IDLE, moveX: 1, moveY: -1 });
  const moved = Math.hypot(run.player.x - 640, run.player.y - 360);
  assert.ok(Math.abs(moved - CONFIG.player.speed * 0.5) < 1e-6, `moved ${moved}`);
});

test('walking over a coin collects its gold', () => {
  const rules = freshRun();
  const { run } = rules;
  run.coins.push({ x: run.player.x + 5, y: run.player.y, vx: 0, vy: 0, value: 7, life: 10, magnet: false });
  const before = run.gold;
  rules.update(1 / 60, IDLE);
  assert.strictEqual(run.gold, before + 7);
  assert.strictEqual(run.goldEarned, 7);
  assert.strictEqual(run.coins.length, 0);
});

test('an enemy that reaches the town core damages it', () => {
  const rules = freshRun();
  const { run, CONFIG } = rules;
  run.spawnTimer = 999; // no new spawns
  rules.spawnEnemy('runner');
  const enemy = run.enemies[0];
  enemy.x = CONFIG.core.x - CONFIG.core.w / 2 - 5; // right next to the wall
  enemy.y = CONFIG.core.y;
  for (let i = 0; i < 60; i++) rules.update(1 / 60, IDLE);
  assert.ok(run.coreHp < CONFIG.core.maxHp);
  assert.ok(enemy.attacking);
});

test('difficulty ramps up: faster spawns and brutes only after the first 45 s', () => {
  const { spawnInterval, bruteChance, CONFIG } = freshRun();
  assert.strictEqual(spawnInterval(0), CONFIG.spawn.startInterval);
  assert.ok(spawnInterval(300) < spawnInterval(60));
  assert.ok(Math.abs(spawnInterval(CONFIG.winTime) - CONFIG.spawn.endInterval) < 1e-9);
  assert.strictEqual(bruteChance(30), 0);
  assert.ok(bruteChance(120) > 0);
  assert.ok(bruteChance(CONFIG.winTime) <= CONFIG.spawn.bruteMaxChance);
});
