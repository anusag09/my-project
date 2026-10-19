'use strict';

// ---------- Input ----------
const DEBUG = new URLSearchParams(location.search).has('debug');

const keys = {};
const mouse = { x: CX, y: CY - 150, down: false, consumed: false };

// This frame's controls in game terms, passed to update() in game.js.
function readControls() {
  let moveX = 0, moveY = 0;
  if (keys['w'] || keys['arrowup']) moveY -= 1;
  if (keys['s'] || keys['arrowdown']) moveY += 1;
  if (keys['a'] || keys['arrowleft']) moveX -= 1;
  if (keys['d'] || keys['arrowright']) moveX += 1;
  return { moveX, moveY, aimX: mouse.x, aimY: mouse.y, firing: mouse.down && !mouse.consumed };
}

function updateMouse(e) {
  const r = canvas.getBoundingClientRect();
  mouse.x = ((e.clientX - r.left) / r.width) * W;
  mouse.y = ((e.clientY - r.top) / r.height) * H;
}

window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  keys[k] = true;
  if (k === 'p' || k === 'escape') {
    if (scene === 'playing') showScene('paused');
    else if (scene === 'paused') showScene('playing');
  }
  if (DEBUG && scene === 'playing') {
    if (k === 'g') addGold(500, mouse.x, mouse.y);
    if (k === 't') run.time = Math.min(CONFIG.winTime - 1, run.time + 60);
    if (k === 'k') damageCore(100);
  }
  if (['w', 'a', 's', 'd', ' '].includes(k)) e.preventDefault();
});
window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });
window.addEventListener('mousemove', updateMouse);
window.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return;
  updateMouse(e);
  onLeftClick();
});
window.addEventListener('mouseup', (e) => {
  if (e.button !== 0) return;
  mouse.down = false;
  mouse.consumed = false;
});
window.addEventListener('contextmenu', (e) => e.preventDefault());
window.addEventListener('blur', () => {
  for (const k in keys) keys[k] = false;
  mouse.down = false;
  if (scene === 'playing') showScene('paused');
});

function onLeftClick() {
  if (scene === 'start' || ((scene === 'won' || scene === 'lost') && sceneTime > 0.8)) {
    newGame();
    showScene('playing');
    mouse.down = true;
    mouse.consumed = true; // the start click shouldn't fire a shot
    return;
  }
  if (scene === 'paused') { showScene('playing'); mouse.consumed = true; mouse.down = true; return; }
  if (scene !== 'playing') return;

  mouse.down = true;
  const target = targetAt(mouse.x, mouse.y);
  if (target) {
    mouse.consumed = true; // clicking a building never fires a shot
    tryPurchase(target, mouse.x, mouse.y);
  } else {
    mouse.consumed = false;
  }
}
