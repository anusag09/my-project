'use strict';

// ---------- Scene (which screen is showing) ----------
let scene = 'start';   // start | playing | paused | won | lost
let sceneTime = 0;
let clock = 0;         // real time, used for UI animation

function showScene(s) { scene = s; sceneTime = 0; }

// ---------- Main loop ----------
let lastFrameTime = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - lastFrameTime) / 1000);
  lastFrameTime = now;
  clock += dt;
  sceneTime += dt;
  if (scene === 'playing') {
    update(dt, readControls());
    if (run.outcome) showScene(run.outcome);
  } else if (scene === 'lost' || scene === 'won') updateParticles(dt);
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
