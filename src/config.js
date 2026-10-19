'use strict';

// ============================================================
// The Last Village — top-down town defense shooter (MVP)
// ============================================================

// ---------- Config (all balance numbers live here) ----------
const W = 1280, H = 720;
const CX = 640, CY = 360;

// One place for every colour. Rule: gold/yellow means money and nothing else.
const PALETTE = {
  grass: '#3d6630', grassDark: '#33572a', grassLight: '#4a7839',
  dirt: '#9b8360', dirtEdge: '#7f6847', wallDark: '#4a3826', wallLight: '#b39a72',
  treeDark: '#1f4220', treeLight: '#2c5a2a', shadow: 'rgba(0,0,0,0.28)',

  gold: '#ffd84a', goldDark: '#b8860b', goldShine: '#fff6c4',

  hero: '#f4f1e8', heroAccent: '#22c3b0', heroOutline: '#16454a', heroSkin: '#f2d2a9', heroBullet: '#c8f7ff',
  towerLv: ['#a7b0ba', '#5e9cff', '#3fd27f'],      // stone → steel blue → emerald (never gold)
  pip: '#f4f1e8',

  runner: '#e2453c', runnerDark: '#7d1d18',
  brute: '#8e4fd1', bruteDark: '#43206b',

  hpGood: '#5bd36b', hpMid: '#f2c14e', hpLow: '#ef5350',
  uiPanel: 'rgba(14,17,22,0.82)', uiBorder: 'rgba(255,255,255,0.08)',
  uiText: '#ffffff', uiMuted: '#b0bec5', uiAccent: '#7fd1ff',
  good: '#7dff9a', bad: '#ff6b6b', spend: '#ffb74a',
  title: '#f6ead2', titleGlow: 'rgba(255,140,60,0.55)',
};

const CONFIG = {
  winTime: 600,          // seconds to survive (10 minutes)
  startGold: 60,

  core: { x: CX, y: CY - 10, w: 96, h: 70, roof: 34, maxHp: 500, repairCost: 30, repairAmount: 100 },
  forge: { x: CX, y: CY + 95, w: 80, h: 48, maxLevel: 8, baseCost: 40, costGrowth: 1.5, dmgStep: 5, rateStep: 1.2 },

  player: { speed: 240, radius: 14, baseDamage: 10, baseFireRate: 4, bulletSpeed: 780, magnetRadius: 120, pickupRadius: 22 },

  tower: {
    buildCost: 50,
    upgradeCost: [75, 125],          // Lv1->2, Lv2->3
    spotRadius: 200,                 // distance of tower spots from the core
    bulletSpeed: 620,
    levels: [
      { damage: 10, rate: 1.2, range: 170, color: PALETTE.towerLv[0] },
      { damage: 16, rate: 1.8, range: 200, color: PALETTE.towerLv[1] },
      { damage: 26, rate: 2.6, range: 235, color: PALETTE.towerLv[2] },
    ],
  },

  enemies: {
    runner: { radius: 10, speed: 110, hp: 20, dps: 5, gold: [3, 5], coins: 1, color: PALETTE.runner, dark: PALETTE.runnerDark, knockback: 6 },
    brute:  { radius: 19, speed: 45,  hp: 120, dps: 12, gold: [12, 16], coins: 3, color: PALETTE.brute, dark: PALETTE.bruteDark, knockback: 1.5 },
  },

  spawn: {
    startInterval: 2.0, endInterval: 0.36,
    bruteStart: 45, bruteMaxChance: 0.4,
    hpGrowthSeconds: 180,            // enemy HP multiplier = 1 + t / this + lateHpBonus * (t / winTime)^2
    lateHpBonus: 1.2,
    surgeEvery: 120,                 // "the horde grows stronger" notice + small burst
  },

  coin: { life: 25, flySpeed: 520 },
};

