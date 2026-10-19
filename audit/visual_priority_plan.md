# Visual Priority Plan

Goal: make *The Last Village* look polished and high-end **without redesigning it**. The layout, gameplay, shape language and canvas-only approach all stay; only how things are drawn changes.

---

## Change first (Phase 1: about 1 day)

These give the biggest jump in first impression for the least work. Do them in this order. Each is visible on its own.

| # | Change | Source | Why first |
|---|---|---|---|
| 1 | **Colour palette + roles** (one `PALETTE` object; gold = money only; distinct hero colour) | Quick win 3 | Every later change uses it; prevents reworking colours twice |
| 2 | **Vignette + warm village light** | Quick win 1 | Biggest single visual improvement, ~20 lines |
| 3 | **Label clean-up** (coin badges, no "MAX", proximity/affordable only) | Quick win 2 | Removes the "debug build" look |
| 4 | **Remove debug overlays, add easing** | Quick win 5 | Cheap; makes motion feel intentional |
| 5 | **Hit tint, muzzle flash, recoil, death squash** | Quick win 4 | Shooting is 90% of play time |

**Check after Phase 1:** re-capture the same five scenes (`audit/screenshots/`) and compare side by side. The mid-game shot should show at most 2–3 text labels, with the centre of the screen clearly brighter than the edges.

---

## Next (Phase 2: about 3–5 days)

| # | Change | Source |
|---|---|---|
| 6 | **Lighting and atmosphere pass** (evening, lamps, glows, offscreen light layer) | Upgrade 1 |
| 7 | **Build the village** (palisade, roads, town hall, cottages, damage states) | Upgrade 2 |
| 8 | **Enemy + hero redesign** (silhouettes, outlines, walk/attack animation) | Upgrade 3 |
| 9 | **UI kit** (fonts, panels, HUD redesign, title/end cards with buttons) | Upgrade 4 |

Do 6 and 7 together. Lighting looks much better once there are windows and lamps to light, and both use the same offscreen ground layer.

---

## Can wait until later (Phase 3)

These are nice, but the game will already look polished without them:
- **Full juice layer:**
  - coins arcing to the HUD,
  - upgrade banners,
  - spawn arrows,
  - screen transitions,
  - victory fireworks.

  Do these *after* the UI kit, so the effects target the final HUD positions.
- **Sound effects and music:** big for feel, but they need assets/licensing. Treat it as its own task.
- **Ambient life:** birds, fireflies, villagers walking between cottages, day → night progression across the 10 minutes.
- **Hand-drawn or pixel-art sprites:** only if you later want a specific art identity. The code-drawn style can reach "polished indie" level on its own.
- **Performance work** (offscreen caching of trees and grass): only needed once the extra detail lands. Plan for it in Phase 2, but don't optimise early.

---

## Don't do

- Don't add more UI screens, shop menus or HUD panels. The in-world upgrade design is a strength.
- Don't add bright, high-contrast detail to the grass. The background must stay calmer than the enemies.
- Don't use gold/yellow for anything that isn't money.
- Don't make enemies more detailed than the player can read at speed. Silhouette first, decoration second.

---

## Success criteria

- A screenshot of the mid-game looks like a finished indie game, not a prototype.
- The centre (village) is visibly the brightest, warmest area; the edges feel dark and dangerous.
- The player can find their character instantly in any frame.
- A typical frame has ≤ 3 text labels in the world.
- Shooting, hitting, collecting and upgrading each have a visible, satisfying response.
- It still runs at 60 fps on a mid-range laptop in Chrome, Edge and Firefox.
