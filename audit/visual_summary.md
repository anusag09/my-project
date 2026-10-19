# The Last Village — Visual Audit: Summary

Reviewed at 1280×720 from five captured scenes (in `audit/screenshots/`):
`start.png` (title), `early.png` (0:14), `mid.png` (4:10), `late.png` (9:34), `lost.png` (game over).
All visuals are drawn in code in `game.js` (canvas shapes, no image assets), so every recommendation here is a code change, not an art-pipeline change.

---

## 1. Overall visual impression

**Verdict: clean and readable, but it clearly looks like a prototype.** Nothing is broken or ugly, but it reads as "programmer art": flat circles and rectangles, a single flat green, the default system font and no lighting. A player would guess it's a game-jam build or a tech demo.

**What makes it feel low-end**
- **Flat, unlit world.** One flat green fill, one flat brown ellipse, no light, no vignette, no texture. Everything sits on the same visual plane.
- **The "village" is one small house.** The town is a big empty dirt circle with a house the size of a tower. It doesn't feel like a place worth defending.
- **Text clutter.** Every tower, the forge and the core has a cost label underneath ("Upgrade 125g", "MAX", "Repair 30g"). In `mid.png` there are 8 labels on screen, some overlapping the player and each other.
- **Enemies read as dots and balls.** Runners are small red dots with two white eyes (they look like ladybugs). Brutes are purple balls with small horns. Neither looks threatening, and late game (`late.png`) becomes a pile of identical purple balls.
- **Debug-looking elements.** The always-on gold-pickup ring around the player and the dashed "wall" outline look like dev overlays, not world art.
- **Menus are text on a dark tint.** The title and game-over screens are just centred text over a dimmed game: no panel, no button, no art.

**What already looks good (keep it)**
- **Readability.** Every interactable has a distinct shape, the hover range circle plus tooltip is clear, and the HP colour ramp (green → yellow → red) works.
- **Consistent shadow direction.** All objects have a soft drop shadow down-right. That's a solid base for adding lighting.
- **Small life touches.** Forge smoke, the waving flag, pulsing affordable labels, the purchase "pop" scale and coin blinking before despawn.
- **HUD layout.** Three top panels (gold / timer / town) are in sensible places and don't overlap the play area.
- **Tooltip.** Title, coloured action line and stat delta: good structure, it just needs styling.

**What to improve first:** lighting/atmosphere, the town itself and label clutter. Those three change the first impression the most for the least code. See `visual_priority_plan.md`.

---

## 2. Art style

- **Is there a clear style?** Partly. It's "flat vector with drop shadows", applied consistently, but with no defining personality: no outline rule, no palette and no texture language.
- **Do assets belong together?** Mostly yes, because everything is the same primitive shapes. The mismatches are:
  - **Towers** are the most detailed objects (stone ring, crenellations, barrel, pips), while the **house** and **enemies** are much simpler. The detail level is uneven.
  - **Trees** are two stacked circles, identical in style but random in size. They overlap each other and form odd clumps (top-right of `early.png`).
  - The **forge** is a grey box with an orange square; at a glance it reads as a UI icon, not a building.
  - The **player** is blue (`#4aa3ff`), almost the same blue as Lv2 towers (`#5ea8ff`), so the hero blends into the defences (`mid.png`).
- **Blurry / stretched?** No. The canvas is rendered at devicePixelRatio, so lines are crisp at every size. The problem is simplicity, not resolution.
- **Recommended direction: "cozy-dark toy diorama."** Keep the flat-vector, no-asset approach, but add:
  1. a fixed limited palette (warm village tones vs. cold/violet enemies),
  2. a consistent dark outline on all world objects (2–3 px, a darker shade of the fill, never pure black),
  3. a soft top-light: lighter top face and darker bottom on every shape, plus a scene-wide vignette,
  4. evening lighting with warm lamp glows in the village.

  This is achievable in canvas code and is the cheapest way to look "designed" rather than "default".

---

## 3. Color and lighting

- **Attractive and consistent?** The palette is pleasant but *saturated-default*: grass `#3f6b31`, dirt `#9b8360`, red, purple, blue and gold, all medium-bright with no shared temperature or hue rule.
- **Gold is overused.** It's used for coins, the gold counter, affordable cost labels, Lv3 towers, level pips, the title and the cursor hover state. Gold should mean *money* only. Lv3 towers turning the same colour as coins (`late.png`) muddles that.
- **Contrast:**
  - World vs. background is weak: green grass, dark-green trees and brown dirt are all mid-value.
  - Enemies vs. the dirt is OK; the player vs. towers is weak (both blue circles).
  - UI text is readable thanks to the black stroke, but the stroke is heavy and looks dated.
- **Lighting/atmosphere:** there is none. No vignette, no gradient, no glow except the forge square and no time of day. This is the single biggest gap.
- **Separation of important elements:** the core and towers are separated by shape, not by light. Enemies get lost on top of the house late game (`late.png`), where the house is completely covered.
- **What to add:** a radial vignette, a warm light pool over the village, additive glow on bullets/muzzle/coins/forge, a red damage vignette when the core is hit, and a cooler, darker tone outside the walls so the town feels like the safe, lit centre.

---

## 4. UI quality

- **Buttons:** there are no real buttons. "Click to start" / "Click to play again" are blinking text, which feels unfinished.
- **Panels:** dark rounded rectangles at 75% opacity. Clean but generic, with no border, inner highlight or icon language.
- **Icons:** only the gold coin has an icon. Town HP and weapon stats are text-only.
- **Fonts:** system `"Segoe UI"` bold everywhere, with a thick black stroke. It's readable and consistent, but it's the Windows default, and it renders differently on Mac/Linux (falls back to system-ui).
- **Spacing:**
  - The top-right panel crams an HP bar, the HP number (11 px, inside the bar) and the weapon line (12 px) into 52 px. That's too dense and too small.
  - The cost labels under world objects collide with each other, the player and floating text.
  - The forge name ("FORGE · Weapon Lv2") is hidden behind the tooltip when you hover the forge.
- **Modern or basic?** Basic. It's functional and tidy but looks like a debug HUD.
- **Redesign:** the title screen, the game-over screen, the top-right status panel, world cost labels (hover/proximity only), the tooltip (border, icon, cost chip) and the gold counter (animated tick-up).

---

## 5. Animation and visual feedback

**Existing effects** (`game.js`): particle bursts on hit/death/purchase, a white hit flash, floating "+Ng"/"-Ng" text, screen shake on core hits, a 1.35× "pop" on purchase, pulsing labels, flag/smoke/coin bob.

**Missing or too simple**
- **Shooting:** no muzzle flash, no recoil and no shell/spark. Holding fire feels weightless.
- **Hits:** the white flash fills the *entire* enemy (a full white circle, see `mid.png` right edge). There's no knockback and no damage number.
- **Deaths:** enemies vanish instantly with a small particle puff. There's no squash, fade or ground mark.
- **Gold:** coins snap into the player. There's no arc to the HUD counter, the counter doesn't tick up and there's no sparkle.
- **Upgrades:** the scale pop happens, but there's no shockwave ring, light flash or "LEVEL UP" banner, and building a tower doesn't animate.
- **Core damage:** a tint flash plus shake, but no screen-edge red, no cracks as HP drops and no low-HP alarm.
- **Failure:** "Need 50g" floats up in red, but the label/tooltip doesn't shake and there's no sound substitute.
- **Spawns:** enemies pop in off-screen. There's no edge warning, and the 2-minute surge is just text.
- **Screens:** hard cuts between title → play → end, with no fade, slide or victory celebration.
- **Easing:** almost everything is linear. Pops and floats would feel much better with ease-out-back / ease-out-quad.

---

## 6. Backgrounds and environment

- **Feels empty and flat?** Yes. The grass is one colour with 260 tiny 2–5 px squares that are invisible at normal size, and there are no paths, rocks, flowers, fences, other houses or edges.
- **Supports gameplay without distracting?** Yes. The low detail keeps the action readable. The goal is to add *low-contrast* detail, not noise.
- **Depth/shadows/atmosphere:** shadows exist, but there's no layering (no foreground canopy, no ground decals, no ambient occlusion around buildings) and no atmosphere (fog, fireflies, dust).
- **Biggest background wins:**
  1. Lighting pass (vignette + warm village light + darker outskirts).
  2. Turn the dirt ellipse into a real **palisade wall** with a few gaps, plus 4 dirt **roads** coming in from the edges (enemies already come from all sides).
  3. Add 3–5 small **decorative cottages**, fences and crates inside the walls so it reads as a village.
  4. Grass **texture via larger soft blotches** (2–3 shades) plus scattered flowers/rocks, pre-rendered once to an offscreen canvas so it costs nothing per frame.
  5. Tree clusters at the edges forming a forest border, with a **foreground canopy layer** that overlaps the map edge for depth.

---

See also:
- [visual_problems.md](visual_problems.md): top 5 problems with evidence
- [quick_wins.md](quick_wins.md): top 5 changes under ~1 hour each
- [high_impact_upgrades.md](high_impact_upgrades.md): top 5 bigger upgrades
- [visual_priority_plan.md](visual_priority_plan.md): order of work, what can wait
