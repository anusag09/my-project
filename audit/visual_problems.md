# Top 5 Visual Problems

Ranked by how much each one hurts the "polished / high-end" impression. Screenshots are in `audit/screenshots/`.

---

## 1. No lighting or atmosphere: the whole scene is flat

**Evidence:** every screenshot. One flat green (`#3f6b31`), one flat dirt ellipse, no vignette, no gradients, no glow.
**Why it matters:** lighting is the first thing that separates "prototype" from "product". Without it the town, enemies and background all sit at the same visual weight, and nothing draws the eye to the centre.
**Where:** `drawGround()` and the end of `render()` in `game.js`.
**Fix direction:** a radial vignette over the world, a warm light pool around the town core, darker/cooler outskirts, and additive glow on bullets, coins and the forge fire.

---

## 2. The "village" doesn't look like a village

**Evidence:** `early.png`, `mid.png`. A single small house in a large empty dirt circle. The dashed brown outline that represents the wall looks like a UI selection marquee.
**Why it matters:** the game is called *The Last Village*. The thing you defend should feel like a place with value. Right now the tower spots are visually more important than the town.
**Where:** `drawGround()` (dirt ellipse + dashed ring), `drawCore()` (house).
**Fix direction:**
- Make the core a larger "town hall" with more detail, plus 3–5 decorative cottages, fences and crates around it.
- Replace the dashed ring with a wooden palisade, with gaps where four dirt roads lead in.

---

## 3. Text clutter on the battlefield

**Evidence:** `mid.png` has 8+ world labels at once ("Upgrade 125g" ×5, "Upgrade 75g", "Repair 30g", "FORGE · Weapon Lv3", "Upgrade 90g"), plus floating "+4g"/"Need 75g". Labels overlap the player and each other. `late.png` has "MAX" under every tower, and "Repair 30g" sits on the house door.
**Why it matters:** permanent text in the game world is the strongest "debug build" signal, and it competes with enemies for attention.
**Where:** `costLabel()` called from `drawSpots()`, `drawForge()` and `drawCore()`.
**Fix direction:**
- Show a small coin badge (icon + number) only when the item is affordable, or when the cursor/player is near it.
- Remove "MAX" entirely; full level pips already say it.
- Keep the full detail in the tooltip.

---

## 4. Enemies and player lack identity and threat

**Evidence:**
- Runners are small red dots with white "eyes" and read as ladybugs (`early.png`).
- Brutes are identical purple balls (`late.png`), and late game becomes a purple carpet that hides the house completely.
- The player (`#4aa3ff`) is nearly the same blue as Lv2 towers (`#5ea8ff`) and gets lost among them (`mid.png`).
- The hit flash turns the whole enemy into a pure white disc.

**Why it matters:** enemies are on screen 100% of the time. If they look like toys, the game looks like a toy.
**Where:** `drawEnemies()`, `drawPlayer()`, `CONFIG.enemies`, `CONFIG.tower.levels[1].color`.
**Fix direction:**
- Give enemies distinct silhouettes: a runner as a lean goblin/wolf shape pointing in its direction of travel, a brute as a bulky armoured shape with a club.
- Add a dark outline, a walk wobble, and a hit flash that tints rather than replaces the colour.
- Give the player a unique hero colour (e.g. warm white/teal with a cape) and a soft glow ring instead of the debug pickup circle.

---

## 5. Menus and UI look default

**Evidence:**
- `start.png` and `lost.png` are centred text on a dimmed game, with blinking "Click to start", no panels and no buttons.
- The HUD uses system Segoe UI bold with a heavy black stroke.
- The top-right panel squeezes an HP bar, an 11 px HP number and a 12 px weapon line into 52 px.
- Gold is used for money, affordable labels, Lv3 towers, pips, the title and the cursor hover state, so it stops meaning anything.

**Why it matters:** the title screen is the first impression, and the HUD is visible the entire game.
**Where:** `drawOverlay()`, `drawHUD()`, `drawTooltip()`, `text()` helper, `style.css`.
**Fix direction:**
- Use one display font for titles and one UI font (both from Google Fonts), and a lighter text shadow instead of the thick stroke.
- Put the title and end screens on a framed panel with a real button.
- Split the status panel into two clear rows with icons.
- Reserve gold for money only.
