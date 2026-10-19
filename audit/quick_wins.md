# Top 5 Quick Wins

Each one is a small, contained change in `game.js` (roughly 15–60 minutes), with a large visible payoff. None of them changes gameplay.

---

## 1. Add a vignette and warm centre light (~20 min)

At the end of the world drawing in `render()` (before `ctx.restore()` / `drawHUD()`), draw two full-screen gradients:
- **Vignette:** a radial gradient from transparent at ~45% radius to `rgba(5,10,20,0.55)` at the corners.
- **Village light:** a radial gradient centred on the core with warm `rgba(255,190,110,0.12)` → transparent at ~300 px, drawn with `globalCompositeOperation = 'soft-light'` or `'overlay'` (fall back to `'source-over'` at lower alpha).

This instantly focuses the eye on the town and makes the outskirts feel dangerous. **Biggest bang-for-buck in the whole audit.**

## 2. Clean up world labels (~30 min)

In `costLabel()`:
- Don't draw "MAX" at all, and don't draw the label for an unaffordable item unless the cursor is within ~120 px.
- Replace the "Upgrade 125g" text with a compact **coin badge**: a small dark pill with a coin icon and the number, e.g. `● 125`.
- Move the core's label from the door (`R.b + 14`) to beside the HP bar, and move the forge name into the tooltip only.

This removes most of the on-screen text at any moment and stops the overlaps seen in `mid.png`.

## 3. Fix colour roles (~15 min)

- **Player:** change to a distinct hero colour, e.g. body `#f4f1e8` with a teal cape/ring `#2ec4b6`, so it never matches a tower.
- **Tower levels:** Lv1 stone grey → Lv2 steel blue → Lv3 **royal purple/crimson banner** (not gold). Gold stays reserved for money.
- **Cursor hover state:** white instead of gold.
- Put these in a small `PALETTE` object at the top of `game.js` so all colour decisions live in one place.

## 4. Better hit flash, muzzle flash and death (~40 min)

- **Hit flash:** draw the enemy in its normal colour, then overlay white at 0.6 alpha, so it tints instead of replacing the colour. Add a 3–4 px knockback along the bullet direction.
- **Muzzle flash:** for 50 ms after each player/tower shot, draw a small additive yellow-white star at the barrel tip, and kick the barrel back 3 px (store `p.recoil`, decay it in `updatePlayer`).
- **Death:** instead of removing the enemy instantly, push a short "corpse" particle that squashes (scaleY → 0.3) and fades over 0.25 s, and leave a faint dark ground splat that fades over ~4 s.

## 5. Remove debug-looking overlays and add easing (~20 min)

- Delete the always-on gold-magnet ring in `drawPlayer()`. Instead, give coins a short sparkle trail while they're being magnetised.
- Replace the dashed wall ring (`setLineDash([14, 10])`) with a solid two-tone stroke: a dark outer line plus a lighter inner line. It's still cheap, but reads as a wall edge.
- Swap linear easing on the purchase "pop" and floating text for ease-out-back / ease-out-quad (a two-line helper function), so purchases bounce and texts decelerate.
