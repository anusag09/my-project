'use strict';
// Behaviour lock: replays scripted sessions and compares draw-call fingerprints
// with the recorded golden file. Run `node tests/golden.test.js --update` to
// re-record after an intentional visual or gameplay change.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { normalSession, debugWinSession } = require('./support/scenarios');

const GOLDEN = path.join(__dirname, 'golden', 'fingerprints.json');
const sessions = { normalSession, debugWinSession };

if (process.argv.includes('--update')) {
  const out = {};
  for (const [name, run] of Object.entries(sessions)) out[name] = run();
  fs.mkdirSync(path.dirname(GOLDEN), { recursive: true });
  fs.writeFileSync(GOLDEN, JSON.stringify(out, null, 1) + '\n');
  console.log('golden fingerprints updated:', Object.entries(out).map(([k, v]) => `${k}=${v.length}`).join(', '));
} else {
  const golden = JSON.parse(fs.readFileSync(GOLDEN, 'utf8'));
  for (const [name, run] of Object.entries(sessions)) {
    test(`${name} matches golden fingerprints`, () => {
      const prints = run();
      const firstDiff = prints.findIndex((p, i) => p !== golden[name][i]);
      assert.strictEqual(prints.length, golden[name].length, `${name}: recorded ${prints.length} seconds, golden has ${golden[name].length}`);
      assert.strictEqual(firstDiff, -1, `${name}: output first differs at second ${firstDiff}`);
    });
  }
}
