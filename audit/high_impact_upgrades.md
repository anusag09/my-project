# Top 5 High-Impact Upgrades

Bigger changes (roughly half a day to two days each). They don't change gameplay or require a redesign; they replace how existing things are *drawn*. All stay asset-free (canvas code) unless noted.

---

## 1. Lighting and atmosphere pass (evening village)

**What:** commit to an evening setting.
- **World tint:** a darker, slightly blue-tinted world outside the walls.
- **Village light:** a warm light pool inside, glowing windows on the houses, 4–6 lamp posts or braziers along the palisade with flickering light circles.
- **Additive glow:** bullets, the muzzle, coins and forge fire use `globalCompositeOperation = 'lighter'`.
- **Ambient particles:** a few drifting fireflies/embers inside the town, and light ground fog at the screen edges.

**How:** pre-render the static lighting once to an offscreen canvas and draw it each frame with `'multiply'` (darkness) and `'lighter'` (lights). That keeps it cheap.
**Impact:** this single change moves the game from "prototype" to "styled". It also improves readability: enemies are silhouetted as they enter the light.

## 2. Build a real village (environment art in code)

**What:**
- **Wall:** replace the dirt ellipse and dashed ring with a wooden palisade (a ring of pointed stakes with a dark outline), with 4 gate gaps where dirt roads lead to the screen edges.
- **Town hall:** make the core a bigger town hall (~1.5× size) with a stone base, timber frame, chimney and lit windows.
- **Village dressing:** 3–5 small cottages, a well, fences, crates and hay bales between the tower spots (purely decorative, no collision).
- **Damage states:** cracks and smoke at <60% HP, fire at <30%.

**How:** each building is a small `drawCottage(x, y, variant)` function. Render all static pieces once into an offscreen "ground layer" canvas at startup.
**Impact:** gives the player something worth defending, and fills the empty dirt circle seen in every screenshot.

## 3. Character redesign: enemies and hero

**What:**
- **Runner:** lean goblin/wolf shape, a pointed teardrop silhouette facing its direction of travel, with legs that animate on a sine wave.
- **Brute:** wide armoured ogre shape with shoulder plates and a club that swings when it attacks the core.
- **Both:**
  - a consistent dark outline,
  - a body shadow that stretches with movement,
  - hit tint and knockback,
  - a squash-and-fade death plus a lingering ground mark.
- **Hero:** distinct palette, a small cape that trails movement, a gun with recoil and muzzle flash, and a soft light around the player.
- **Late-game readability:** enemies attacking the core cluster at the wall edge instead of on top of the house (visual offset only), so the town hall stays visible in `late.png`-type moments.

**Impact:** enemies are on screen all the time. Making them read as *monsters* raises the perceived quality of every frame.

## 4. Premium UI kit

**What:**
- **Fonts:** load two Google Fonts, a display face for titles (e.g. "Cinzel" or "Bungee") and a clean UI face (e.g. "Inter" or "Nunito"), and replace the heavy black stroke with a soft drop shadow.
- **Panels:** subtle gradient fill, a 1 px light top border, inner shadow and consistent 12 px padding.
- **HUD:**
  - gold counter with an animated tick-up and a coin that "receives" flying coins,
  - circular timer or a segmented progress bar with 2-minute marks that match the surges,
  - town HP as a large bar with a shield icon and a red pulse at low HP,
  - weapon stats as icon chips (sword = damage, bolt = fire rate).
- **Tooltip:** a framed card with an object icon, a cost chip (coin + price, green/red) and the stat delta shown as "15 → 20" with an arrow glyph.
- **Title / end screens:** a framed central card, a logo-style title with an ember glow, a real **Play / Play again** button with hover state, and the controls shown as keycap icons (W A S D, mouse).

**Impact:** the HUD is visible 100% of the time and the title screen is the first impression.

## 5. Juice and feedback layer

**What:**
- **Coins:** coins fly in an arc to the HUD gold counter (instead of into the player), and the counter bumps on arrival.
- **Upgrades:** an expanding shockwave ring, a light flash, a short "TOWER Lv2!" / "WEAPON Lv4!" banner and tower "build-up" (the base rises from the ground over 0.3 s).
- **Core hit:** a red screen-edge vignette pulse, scaled with damage. Below 25% HP, add a slow heartbeat pulse.
- **Failed purchase:** the tooltip cost chip shakes horizontally and flashes red.
- **Spawns:** a small red arrow at the screen edge where enemies are about to enter. For surges, an edge-wide red glow plus a banner that slides in.
- **Screens:** a 0.3 s fade between title → play → end. On victory, a confetti/firework burst over the village and the sky warms (dawn).
- **Optional (later):** sound effects. Audio contributes a lot to "premium feel", but it needs asset sourcing.

**Impact:** the game already has the core loop. This makes every action in it *feel* rewarding.
