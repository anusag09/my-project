'use strict';
// Loads the game into a Node sandbox with a fake DOM, a seeded Math.random and a
// canvas that fingerprints every draw call. Used to prove refactors change nothing.

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..', '..');

// --- deterministic random (mulberry32) ---
function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- rolling FNV-1a hash over everything drawn ---
function createHasher() {
  let h = 0x811c9dc5;
  return {
    add(str) {
      for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 0x01000193) >>> 0;
      }
    },
    value: () => h.toString(16).padStart(8, '0'),
  };
}

function fmt(v) {
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : v.toFixed(3);
  if (v && v.__fakeId) return v.__fakeId;
  if (typeof v === 'string') return v;
  return typeof v;
}

// A 2D context whose every call and property write feeds the hasher.
function createRecordingContext(hasher, id) {
  const state = {};
  let gradients = 0;
  const target = {
    createRadialGradient: (...args) => {
      hasher.add(`${id}.createRadialGradient(${args.map(fmt).join(',')})`);
      const gid = `${id}.grad${gradients++}`;
      return { __fakeId: gid, addColorStop: (o, c) => hasher.add(`${gid}.stop(${fmt(o)},${c})`) };
    },
    measureText: (str) => {
      hasher.add(`${id}.measure(${str})`);
      return { width: str.length * 7.5 };
    },
  };
  return new Proxy(target, {
    get(t, prop) {
      if (prop in t) return t[prop];
      if (prop in state) return state[prop];
      return (...args) => hasher.add(`${id}.${String(prop)}(${args.map(fmt).join(',')})`);
    },
    set(t, prop, value) {
      hasher.add(`${id}.${String(prop)}=${fmt(value)}`);
      state[prop] = value;
      return true;
    },
  });
}

function scriptFiles() {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  return [...html.matchAll(/<script\s+src="([^"]+)"/g)].map((m) => m[1]);
}

/**
 * Boots the game. Returns helpers to advance frames and send input events.
 * @param {{ search?: string, seed?: number }} opts
 */
function loadGame({ search = '', seed = 1234 } = {}) {
  const hasher = createHasher();
  let now = 1000;
  let rafCallback = null;
  let canvasCount = 0;
  const listeners = {};

  const makeCanvas = () => {
    const cid = `canvas${canvasCount++}`;
    const c2d = createRecordingContext(hasher, cid);
    return {
      __fakeId: cid,
      width: 300, height: 150,
      style: {},
      getContext: () => c2d,
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 1280, height: 720 }),
    };
  };
  const mainCanvas = makeCanvas();

  const windowObj = {
    innerWidth: 1280, innerHeight: 720, devicePixelRatio: 1,
    addEventListener: (type, fn) => { (listeners[type] = listeners[type] || []).push(fn); },
  };
  const sandbox = {
    window: windowObj,
    document: {
      getElementById: () => mainCanvas,
      createElement: (tag) => { if (tag !== 'canvas') throw new Error('unexpected element ' + tag); return makeCanvas(); },
    },
    location: { search },
    URLSearchParams,
    performance: { now: () => now },
    requestAnimationFrame: (fn) => { rafCallback = fn; },
    console,
  };
  // window.* globals are also reachable as bare globals in a browser
  Object.assign(windowObj, sandbox);
  const context = vm.createContext(sandbox);
  vm.runInContext(`Math.random = (${seededRandom.toString()})(${seed});`, context);

  for (const file of scriptFiles()) {
    const code = fs.readFileSync(path.join(ROOT, file), 'utf8');
    vm.runInContext(code, context, { filename: file });
  }

  // The scripted "player" looks at the screen through this one read-only probe.
  // If game internals are renamed, update this expression; fingerprints must still match.
  const look = () => vm.runInContext(
    'run ? { enemies: run.enemies.map((e) => [e.x, e.y]), coins: run.coins.map((c) => [c.x, c.y]), player: [run.player.x, run.player.y] } : null',
    context);

  const api = {
    context,
    look,
    hash: () => hasher.value(),
    /** Advance one 60 fps frame through the real requestAnimationFrame loop. */
    frame() {
      now += 1000 / 60;
      const cb = rafCallback;
      rafCallback = null;
      if (!cb) throw new Error('game did not request another animation frame');
      cb(now);
    },
    frames(n) { for (let i = 0; i < n; i++) api.frame(); },
    dispatch(type, props = {}) {
      const event = { preventDefault() {}, ...props };
      for (const fn of listeners[type] || []) fn(event);
    },
    key(type, key) { api.dispatch(type, { key }); },
    mouse(type, x, y, button = 0) { api.dispatch(type, { clientX: x, clientY: y, button }); },
    click(x, y) { api.mouse('mousedown', x, y); api.mouse('mouseup', x, y); },
  };
  return api;
}

/**
 * Loads only the game rules (config, util, game) — no DOM needed.
 * Returns the rule functions plus a live `run` getter.
 */
function loadRules({ seed = 1 } = {}) {
  const context = vm.createContext({ console });
  vm.runInContext(`Math.random = (${seededRandom.toString()})(${seed});`, context);
  for (const file of ['src/config.js', 'src/util.js', 'src/game.js']) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), context, { filename: file });
  }
  return vm.runInContext(`({
    CONFIG, SPOT_POSITIONS,
    newGame, update, targetAt, describePurchase, tryPurchase, damageCore, addGold,
    weaponDamage, weaponRate, forgeCost, spawnInterval, bruteChance, spawnEnemy,
    get run() { return run; },
  })`, context);
}

module.exports = { loadGame, loadRules };
