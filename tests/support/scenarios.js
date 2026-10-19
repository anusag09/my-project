'use strict';
// Scripted play sessions driven only through public input (mouse/keyboard events)
// and the real animation-frame loop. Each returns a list of fingerprints, one per
// second of play, so any change in behaviour or drawing shows up as a mismatch.

const { loadGame } = require('./harness');

const CENTER = { x: 640, y: 360 };
const SPOTS = Array.from({ length: 6 }, (_, i) => {
  const a = (i / 6) * Math.PI * 2;
  return { x: CENTER.x + Math.cos(a) * 200, y: CENTER.y + Math.sin(a) * 200 * 0.92 };
});
const CORE = { x: 640, y: 350 };
const FORGE = { x: 640, y: 455 };
const MOVE_KEYS = [['w'], ['d'], ['s'], ['a'], ['w', 'a'], ['s', 'd'], []];

function recorder(game) {
  const prints = [];
  return {
    prints,
    // advance n frames, recording a fingerprint every 60 frames
    run(n, perFrame) {
      for (let i = 0; i < n; i++) {
        if (perFrame) perFrame(i);
        game.frame();
        if (++this.count % 60 === 0) prints.push(game.hash());
      }
    },
    count: 0,
  };
}

const nearest = (list, x, y) => list.reduce((best, p) =>
  (!best || Math.hypot(p[0] - x, p[1] - y) < Math.hypot(best[0] - x, best[1] - y) ? p : best), null);

// Aim at the enemy closest to the town while holding the trigger, walk towards
// gold (or a fixed pattern), and spend gold on a rotating list of targets.
function playLoop(game, rec, seconds, startFrame = 0) {
  const purchases = [...SPOTS, FORGE, CORE, SPOTS[0], SPOTS[3], FORGE];
  let held = [];
  const hold = (keys) => {
    if (keys.join() === held.join()) return;
    for (const k of held) game.key('keyup', k);
    held = keys;
    for (const k of held) game.key('keydown', k);
  };
  rec.run(seconds * 60, (i) => {
    const f = startFrame + i;
    const t = f / 60;
    const view = game.look();
    const target = view && nearest(view.enemies, CENTER.x, CENTER.y);
    const aim = target
      ? { x: target[0] + Math.sin(t * 7) * 12, y: target[1] + Math.cos(t * 5) * 12 } // slightly sloppy aim
      : { x: CENTER.x + Math.cos(t * 4) * 300, y: CENTER.y + Math.sin(t * 4) * 300 };
    game.mouse('mousemove', aim.x, aim.y);
    const coin = view && nearest(view.coins, view.player[0], view.player[1]);
    if (coin) {
      const [px, py] = view.player, keys = [];
      if (coin[1] < py - 6) keys.push('w');
      if (coin[1] > py + 6) keys.push('s');
      if (coin[0] < px - 6) keys.push('a');
      if (coin[0] > px + 6) keys.push('d');
      hold(keys);
    } else if (f % 120 === 0) {
      hold(MOVE_KEYS[(f / 120) % MOVE_KEYS.length]);
    }
    if (f % 180 === 90) {
      const p = purchases[(f / 180 | 0) % purchases.length];
      game.mouse('mouseup', aim.x, aim.y);
      game.click(p.x, p.y);              // buy / upgrade / repair (never shoots)
      game.mouse('mousedown', aim.x, aim.y); // resume firing
    } else if (f % 60 === 0) {
      game.mouse('mousedown', aim.x, aim.y);
    }
  });
  hold([]);
}

function normalSession() {
  const game = loadGame({ seed: 42 });
  const rec = recorder(game);
  rec.run(60);                         // title screen
  game.mouse('mousemove', 640, 560);
  game.click(640, 560);                // start
  playLoop(game, rec, 40);
  game.key('keydown', 'p'); game.key('keyup', 'p');
  rec.run(60);                         // paused
  game.key('keydown', 'p'); game.key('keyup', 'p');
  playLoop(game, rec, 20, 40 * 60);
  game.dispatch('blur');               // tab switch pauses
  rec.run(30);
  game.click(300, 300);                // click resumes
  playLoop(game, rec, 240, 60 * 60);   // play on with towers and upgrades
  game.mouse('mouseup', 640, 300);
  rec.run(150 * 60);                   // stop playing: the town falls, end screen shows
  game.click(640, 520);                // play again
  playLoop(game, rec, 10);
  return rec.prints;
}

function debugWinSession() {
  const game = loadGame({ search: '?debug', seed: 7 });
  const rec = recorder(game);
  rec.run(10);
  game.click(640, 560);
  rec.run(30);
  for (let i = 0; i < 6; i++) { game.key('keydown', 'g'); game.key('keyup', 'g'); } // +3000 gold
  for (const target of [...SPOTS, ...SPOTS, ...SPOTS, FORGE, FORGE, FORGE, FORGE, FORGE, FORGE, FORGE, FORGE]) {
    game.mouse('mousemove', target.x, target.y);
    game.click(target.x, target.y);  // max out every tower and the weapon (last forge click hits MAX)
    rec.run(3);
  }
  for (let i = 0; i < 9; i++) { game.key('keydown', 't'); game.key('keyup', 't'); } // skip to 9:00
  playLoop(game, rec, 8);
  game.key('keydown', 'k'); game.key('keyup', 'k');   // hurt the town
  playLoop(game, rec, 4);
  game.key('keydown', 't'); game.key('keyup', 't');   // jump to 9:59
  playLoop(game, rec, 5);                             // reach 10:00 → win
  rec.run(120);
  game.click(640, 520);
  rec.run(60);
  return rec.prints;
}

module.exports = { normalSession, debugWinSession };
