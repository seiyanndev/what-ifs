# What If History Changed? — Video Kit

Source of truth for this project's goal, style and structure. **Keep it updated as the kit grows.**

## Goal

A reusable kit for making vertical short videos about alternate history ("What if history changed?").
After setup, each episode should take 15–30 minutes: script → `scenes.json` → voiceover → `npm run episode`.

- **Format:** 9:16, 1080×1920, 30 fps, 60–75 s per episode. Constants live in `VIDEO` in `src/Root.tsx`.
- **Stack:** Remotion 4 + `@remotion/three` (React Three Fiber, Three.js) for 3D, maps, captions and MP4 rendering. FFmpeg for audio.
- **Rendering is local:** it runs on the user's machine, not in the cloud.

## Hard rules

1. **Deterministic rendering.** Animate only from `useCurrentFrame()` (plus `useVideoConfig()`).
   - No `requestAnimationFrame`, `useFrame` clocks, `setTimeout`, `Date.now()` or `performance.now()` for animation.
   - No `Math.random()`. Use `random(seed)` from `remotion` with a stable string seed (e.g. `random(\`blink-${characterId}\`)`).
   - Physics-like motion (springs, cloth sway) is computed as a pure function of the frame (`spring()` from remotion, or closed-form math).
2. **Every frame renders independently.** A frame must look the same whether it's rendered alone or in sequence.
3. **Respectful history.** Costumes are generic and respectful. No caricatured features or stereotypes. No likenesses of living people. Famous figures are recognized by silhouette and props, not realistic faces.
4. **Build for reuse.** Anything an episode needs that's missing (costume, prop, set, effect) goes into `src/kit/`, not into the episode.

## Character style: "Stylized Toy Figurines"

Chibi figurines about 2.5 heads tall, built from smooth primitives. Toon (3-tone) shading with a soft outline. 2D layered faces (eyes, brows, mouth, extras) on a head decal. Rigid hierarchical joints with no skinning. One base body plus swappable costume parts. Frame-driven secondary motion (springs on capes, hair, belly; squash and stretch).
Spend effort on faces, costumes and motion polish, not realism.

## Look: "Storybook Diorama" (step 2, locked)

Every 3D shot is a small toy diorama on a round stone base, floating in front of a painted storybook landscape.
Read like a premium mobile-game cutscene: warm, readable, clean shapes, never realistic.

### Rendering stack (back → front), all wired up by `<Stage>`
1. **`<Sky>`:** CSS gradient (3 stops per time of day) plus a soft sun/moon glow.
2. **`<PaintedBackdrop>`:** 4 layered SVG hill silhouettes pinned to the camera horizon (`horizonY()`), hazed toward the fog color for aerial perspective, with parallax from `pan`. Never use 3D hills; their undersides float.
3. **`<ThreeCanvas>`:** transparent, `flat` (no tone mapping, so palette colors stay true), soft shadow maps.
4. **`<LightRig timeOfDay>`:** warm shadow-casting key, cool hemisphere fill, colored back light, fog. It also provides the look context to materials.
5. **Overlays** (2D effects and labels).
6. **`<Grade whatIf={0..1}>`:** CSS color grade, vignette and seeded film grain over everything.

### Materials and lines
- **`<ToonMaterial color>`** is the only surface material. It uses a 3-tone ramp (`TOON_RAMP = [0.18, 0.55, 1, 1]`, giving shadow, mid and light bands). Shadow bands are tinted toward the rig's `shadowTint` (cool purple, never black). A fresnel rim is colored by the rig. Global knobs are in `TOON_SHADING`.
- **`<Ink weight>`** is a screen-space inverted-hull outline placed inside a mesh. Weights are in px at 1080 wide: `character` 4.5, `prop` 3.2, `set` 2.4. The color comes from the time of day (dark plum, never pure black). Use it on smooth-normal geometry only. No ink on paving tiles, distant scenery or water.
- **`<SoftShadow>`** is a radial contact-shadow disc for grounding dioramas, characters and props cheaply.
- **Geometry** comes from `roundedBox()` and `lathe()` (cached, smooth normals), spheres and capsules. No hard-edged boxes, since outlines break on split normals.
- Small 2D-ish details (eyes, blush, mouth) use `meshBasicMaterial` so they stay flat graphic colors.

### Lighting presets (`TIME_OF_DAY` in `lighting.ts`)
| timeOfDay | key | fill (sky / ground) | rim | shadow tint | sky |
|---|---|---|---|---|---|
| dawn | peach, low from left | lavender / peach | pink | grey-violet | blue → pink → peach |
| day | warm white, high | sky blue / sand | white | blue-grey | blue → pale blue |
| sunset | orange, very low from left (long shadows) | violet / orange | gold, strong | purple | indigo → rose → apricot |
| night | cool blue moonlight | blue / plum | ice blue | indigo | navy; backdrop darkened 68% |

### Era palettes (`ERA_PALETTES` in `palettes.ts`)
- **ancient:** warm sandstone (stone `#ecd3a6 / #d9b47e / #b98d5c`, accent terracotta red `#b5463c`)
- **medieval:** muted earth (grey stone, moss green, oxblood accent `#8e3b38`)
- **ageOfSail:** teal and gold (`#1f6f78` cloth, `#c9962e` gold, accent `#1f8a8a`)
- **modern:** clean blue/white (`#2f6fd6`, `#f5f7fa`, amber `#f2b134`)
- `SKIN_TONES`: 10 diverse tones, light to deep.

Always pull colors from the palette by name instead of writing new hex values in scenes.

### Grades (`GRADES` in `Grade.tsx`)
- **real** (`whatIf={0}`): natural, very slightly warm, light plum vignette.
- **whatif** (`whatIf={1}`): +18% saturation, purple soft-light tint, purple color wash, blacks lifted to deep violet, stronger violet vignette. Used for everything after TIMELINE_SPLIT. Animate `whatIf` between 0 and 1 for transitions.
- Film grain is about 6%, seeded by frame.

### Camera (`<OrbitCamera>`)
- Declarative: target, distance, azimuth, elevation, fov and tilt as props, driven by `interpolate(frame)`. Never set the camera inside effects.
- House framing: `fov` 30 (telephoto, which gives the "toy" compression), `elevation` 10–20°, `tilt` 3–5° so the horizon and sky stay in the top third. Keep the bottom 30% free of key action for captions.
- Wide establishing shot of a whole diorama: about `distance` 23 with target at the base centre.

### Determinism notes
- Remotion renders each frame from an effect right after commit, so per-frame changes must be props or `useLayoutEffect`, never `useEffect` or `useFrame`.
- drei's `<Outlines>` is not used (it reads the canvas size too early and explodes on degenerate normals). Use `<Ink>`.

## Characters: base figurine (step 3a, approved)

Code is in `src/kit/characters/`: `rig.ts` (data), `Body.tsx`, `Hand.tsx`.

- **Proportions:** head radius 0.5 world units (1 head = 1.0). The standard body is about 2.5 heads tall (≈2.45 units). The head pivots at its base (good for nods), and the head sphere is slightly wide (1.04 × 0.97).
- **Rig (rigid pivots, no skinning):** `hips → legL/R → kneeL/R → ankleL/R` and `hips → spine (belly) → chest → neck → head`, plus `chest → shoulderL/R → elbowL/R → wristL/R`. L/R are the *character's* sides. The character faces +Z, so its left is +X.
- **Rest pose:** arms out 0.2 rad (A-pose), elbows bent 0.12, palms facing the body. `pose.joints` rotations are added on top of the rest pose.
- **`Pose`:** `{ joints, rootOffset, rootRotation, stretch, handL, handR }`. `stretch` is volume-preserving squash and stretch. `mixPose(a, b, t)` blends poses for transitions.
- **`BodyShape`:** `{ height, width, belly, shoulders, head }`. Presets in `BODY_TYPES`: standard, kid, slim, stocky, heroic, round, elder. `bodyDims(shape)` gives the derived joint positions.
- **Hands:** a palm, a 3-finger mitten block, a separate index finger and a thumb. `HAND_POSES`: open, relaxed, fist, point, hold, wave (numeric `HandShape`, so they blend). Props held in a hand go in the `gripL`/`gripR` slots.
- **Costume hooks:** `attach={{ head, face, chest, torso, hips, neck, shoulderL/R, elbowL/R, handL/R, gripL/R, legL/R, kneeL/R, footL/R, root }}` mounts parts on bones. `hide={{ pelvis, torso, upperArms, forearms, hands, thighs, shins, feet, head, ears }}` lets costume shells replace base parts. `useBody()` gives an attached part the shape, dims and skin of the body it's on.
- **Base outfit:** `colors={{ shirt, pants, shoes }}`, `sleeves="short" | "long"`.
- **Skin** uses `ToonMaterial ramp="soft"` (bands `[0.42, 0.78, 1, 1]`) so faces never get a hard dark band.
- **Ink:** character outlines are 4 px at 1080 wide. Ears and neck have no ink. All ink thickens for close-ups: ×(14 / camera depth), clamped to 1–2.5×.

Review sheets (stills): `BaseTurnaround`, `BaseVariants`, `HandPoses`, `RigTest`, rendered to `out/char/*.png`.

## Characters: faces (step 3b, approved)

Code is in `src/kit/characters/Face/`: `params.ts` (shapes, presets, blending), `draw.ts` (canvas drawing), `talk.ts`, `Face.tsx`.

- **How it works:** every frame, the face is drawn with the canvas 2D API onto a 600 px texture, which is mapped (front-projected) onto a curved patch slightly in front of the head sphere. The patch is unlit and gets a time-of-day tint (dimmer at night). It's deterministic because it redraws in `useLayoutEffect` before Remotion captures the frame.
- **Usage:** `<Body face={{ expression, look, talk, blink, browColor, facialHair }} id="..." />`. `id` seeds the blink timing.
- **Everything is numeric and blendable:** `EyeParams` (mode normal/arc/caret, open, lidTilt, lower, size, iris, sparkle), `BrowParams` (y, angle, curve), `MouthParams` (w, open, curve, asym, round, teeth, tongue, gritted). `mixExpression(a, b, t)` blends expressions; eye-mode switches pass through a closed eye.
- **Eyes:** open, half, closed, happy, wide, angry, sad, sly. Pupils follow `look=[x, y]` in the range -1..1, where `[0, 0]` looks at the camera. Blinks are automatic and seeded: 7-frame blinks every 85–145 frames, with 25% double blinks.
- **Brows:** neutral, raised, angry, worried, low, plus skeptical (one raised, one low).
- **Mouths:** neutral, smile, grin, laugh, frown, shockedO, gritted, smirk.
- **Visemes:** A, E, O, MBP, FV, rest.
- **Extras:** blush (strong blush adds hatch lines), sweat drop, tear streams (animated), anger mark (pulsing).
- **Facial hair** (2D): mustache `thin | full | walrus | curled`, beard `stubble | goatee | full`, plus `color`. Big 3D beards belong to costumes (3c).
- **15 presets (`EXPRESSIONS`):** neutral, proud, happy, laughing, scared, shocked, angry, sad, crying, thinking, smirk, focused, wonder, determined, defeated.
- **Talk mode:** `talkFromWords(words, seconds)` takes word timings (`{word, start, end}`), maps letters to visemes, holds each shape about 60% of the time and glides to the next, and fades between words. `talkFromLevel(level, frame)` works from loudness instead. `applyTalk` keeps the expression's smile or frown while speaking.

Review outputs: `Expressions` and `FaceParts` stills, plus the `FaceTalkTest` video, rendered to `out/char/`.

## Characters: costumes (step 3c, approved)

Code is in `src/kit/characters/Costume/`. Everything mounts on `Body` slots and sizes itself with `useBody()`.

- **`<Character costume={...} skin shape face pose id capeLift />`** is the dressed figurine. A `CostumeSpec` is `{ hair, facialHair, headwear, outfit, cape, props }`. Presets (3d) are just CostumeSpecs.
- **Hair** (`HAIR_STYLES`): short, long, bun, curly, bald (fringe), braids, ponytail, topknot. Colors are in `HAIR_COLORS` (black, darkBrown, brown, auburn, blonde, red, grey, white). Brow color follows the hair.
- **Facial hair:** 2D layers from the face system, plus `wizard: true` for a long 3D beard (`WizardBeard`).
- **Headwear** (`HEADWEAR_TYPES`): laurel, crown, bicorne, tricorne, vikingHelmet (no horns), galea, kabuto, morion, monkHood, turban, mingHat, featherHeaddress (generic), topHat, leafCrown, hardHat, headwrap, beret. Each takes optional `color` and `accent`. Skull-covering headwear (helmets, hood, turban, wrap, Ming hat, top hat) hides the hair cap but keeps braids, ponytails and long hair.
- **Outfits** (`OUTFIT_TYPES`, `buildOutfit`): toga, legionary, peasantTunic, monkRobe, royalRobe (brings its own cape), knightArmor, explorerCoat, napoleonic, mingRobe, samurai, filipinoWarrior (bahag + upper wrap, generic), scholarRobe, modernCasual, suit. Recolor with `colors: { main, second, trim, metal }`. An outfit sets base colors (`shirt`, `pants`, `shoes`, `boots`, `hands`), sleeves and hidden parts (robes hide the legs and pelvis), and attaches its pieces.
- **Outfit building blocks** (reuse them for new outfits): `Skirt` (ankle, knee or thigh; `open` for coats), `Belt`, `Panel`, `WideSleeve`, `ShoulderPiece` (round, flat or epaulette), `Collar` (ring, ermine, high or vneck), `Sash`, `Strips`, `Bands`, `CoatTails`, `Buttons`, `Emblem`.
- **Props** (`PROP_TYPES`): scroll, book, quill, sword, spear, shield (forearm mount), kampilan, bow, telescope, map, flag (waving cloth, `color` + `accent`), torch (animated flame), globe (spins), gears (turn), coinBag, crownPillow, axe, scepter. Props are modeled with the grip at the origin and +Y out of the thumb side. `Character` mounts them in `gripL`/`gripR` and sets the hand to `hold`. They also stand on the ground in sets.
- **Cape:** a thin cloth box whose vertices are recomputed every frame. The hem lags and ripples, and the edges wrap forward. `lift` (0–1) streams it behind for runs, and `wind` sets the flutter.
- **Rules:** keep cultural costumes generic and respectful, and make famous figures recognizable by silhouette and props only.
- **Geometry rule:** `lathe()` profiles are auto-oriented bottom to top (top-down profiles used to render inside-out). Use `warpedLathe` for lobed brims and `extruded` for flat shapes.

Review outputs: the `Headgear`, `Costumes` and `Props` stills and the `CostumeTurntable` video, rendered to `out/char/`.

## Characters: presets and crowds (step 3d, approved)

- **`PRESETS`** (`presets.ts`): each preset is `{ label, era, shape, skin (SKIN_TONES index), costume, expression, named?, note? }`. **`<PresetCharacter preset="napoleon" />`** renders one, and any prop overrides it.
- **`CAST`:** the 26 characters from the brief, in order: roman_emperor, roman_soldier, roman_engineer, scholar_greek, monk, peasant, lord, king, queen, knight, gutenberg, magellan, lapulapu, spanish_soldier, zheng_he, ming_emperor, ming_sailor, native_leader, napoleon, samurai, viking, inventor, explorer, modern_kid, modern_adult, news_anchor. `filipino_warrior` is an extra generic preset for crowds.
- **Named people** (`named: true`): Gutenberg, Magellan, Lapulapu, Zheng He and Napoleon are recognized by silhouette and signature item only. Accuracy notes are in `note`: Magellan carries a chart, not a telescope, because it was invented about 1608. Napoleon is average height. Viking helmets have no horns.
- **`<Crowd count pool|era area position lookAt cheer wave seed />`:** 20–200 cheap figurines. Each body part is one InstancedMesh, and all members share one face texture (neutral blending to laughing with `cheer`). Members are seeded picks from `CROWD_POOLS` (ancient, medieval, ageOfSail, modern, romanArmy, vikings, mactan, spanishExpedition, mingFleet, samuraiArmy, court), with per-member skin (±1) and color jitter, and hair, hat or helmet caps from the preset. `cheer` (0–1) turns on jumping, waving arms and looking up. `wave` (seconds) sweeps the cheer across the width. Named people are never in crowds, and crowd pools must stay historically coherent (no Ming sailors at Mactan).
- **Studio sheets:** `<Stage background=...>` turns fog off automatically (`fog` prop).
- **Performance:** `<Ink>` builds its outline mesh once and rebuilds only if the parent geometry changes. In this cloud container (software GL), a 130-figure crowd shot renders at about 1.5 s per frame. A real GPU is much faster.

Review outputs: the `Cast` still and the `CrowdDemo` video, rendered to `out/char/`.

## Motion (step 3e, approved)

Code is in `src/kit/actions/`: `core.ts` (types, easing, keyframes, pose maths), `library.ts` (the actions), `Performer.tsx`.

- **An action** is a pure function `(framesSinceStart, ctx) → { pose, look?, expression?, capeLift?, travel? }`. It must be deterministic and must not keep state.
- **`<Performer preset cues position heading blend=7 inPlace? face? />`** plays a cue list `[{ action, at, params?, expression?, heading? }]`.
  - It blends into each new cue over `blend` frames (pose, gaze, expression, cape).
  - It turns smoothly to a cue's `heading` (degrees; 0 faces the camera, +Z).
  - It accumulates `travel` from walks and runs along each cue's heading (root motion).
  - Add `face={{ talk }}` for lip sync.
- **The 26 actions** (`ACTIONS`): idle, walk (`speed`), run (`speed`), talk, point (`dir`: side, forward or up; `hand`), wave, cheer, bow, salute, sword_raise, fight_clash (looping, stylized, no gore), fall (backward, lands on its back), sit, write (`seated`), read_scroll, crank_machine, look_up, look_around, shrug, facepalm, celebrate_jump (`height`), nod, shake_head, kneel, give_item (`hands`: both or right), sail_steer. One-handed actions take `params: { hand: "left" }`, which mirrors the pose.
- **Sign conventions** (the character faces +Z and its left is +X):
  - shoulder X − raises the arm forward; shoulderL Z + / shoulderR Z − raise it out or up sideways
  - elbow X − bends the forearm forward; leg X − moves the thigh forward; knee X + bends the shin back
  - spine/chest X + leans forward; head X + looks down; head Y + turns to the character's left
  - gaze `look` is in screen space for a camera-facing character (+x = the viewer's right)
- **Polish rules (built in):**
  - Anticipation: a wind-up key before big moves.
  - Overshoot: `ease: "back"` into the pose.
  - Squash and stretch through `pose.stretch` (volume-preserving) on jumps and landings.
  - The head leads: look_around samples the head at t, the chest at t−4 and the eyes at t+5.
  - Secondary motion: the cape lift is driven by speed, and hair and capes sway on their own.
  - Eyes follow the action: each action suggests a gaze.
- **No foot sliding:** walk and run solve the leg angle from the body speed (`asin(footOffset / legLength)`), so the planted foot stays fixed while the root moves at `speed`. The hip height follows `legLength·cos θ`, which gives the natural bob.
- **Chibi constraints:**
  - The head is wider than the shoulders. Raised hands must go out sideways (forearm up) to stay visible, as in `wave`.
  - Props leave the fist on the thumb side. With the arm overhead, flex the wrist (`wristR X ≈ +1.35`) so a blade points up.
  - Robes are rigid, so sitting or kneeling in a robe pushes the skirt into the ground. Prefer standing actions for robed characters, or hide the ground line.
- **Review outputs:** `ActionsGrid` (1920×1080; `props: { only, cols, dist }` for close-ups) and `Showreel` (15 s), rendered to `out/motion/`.

## Sets and maps (step 4, approved)

Code is in `src/kit/sets/`: `geo/` (data, projections, map painter, globe, map board, markers), `ground.tsx`, `dressing.tsx`, `sets.tsx`, `SetScene.tsx`, `context.tsx`.

### One-line shots: `<SetScene>`
`<SetScene set="PORT" era timeOfDay whatIf camera="wide|medium|close"|OrbitShot move="static|push|pull|orbitLeft|orbitRight" duration globe={...} map={...}>…characters…</SetScene>`
It wires up the sky or background, painted backdrop, light rig, the diorama, the camera move over `duration` frames, and the grade. Put characters on `SETS[set].marks` (for example `<Performer position={SETS.PORT.marks.center} … />`).

### The 12 sets (`SETS`)
| Set | Default era / time | Special marks |
|---|---|---|
| GLOBE | ageOfSail / day | (uses `globe` props) |
| MAP_REGION | ageOfSail / day | (uses `map` props) |
| ANCIENT_CITY | ancient / day | temple |
| THRONE_ROOM (interior) | medieval / day | throne |
| BATTLEFIELD | medieval / sunset (cannons in ageOfSail+) | leftArmy, rightArmy |
| LIBRARY (interior) | medieval / night | desk, shelf |
| PORT | ageOfSail / sunset | dock |
| MEDIEVAL_VILLAGE | medieval / dawn | well, market |
| WORKSHOP (interior) | modern / day | bench, machine, anvil |
| MODERN_CITY | modern / night | street |
| JUNGLE_PREHISTORIC | ancient / day | pond |
| BEACH | ageOfSail / sunset | shore |

- Every outdoor set also has the marks center, left, right, back, backLeft, backRight and front.
- **Cameras:** wide 30 (outdoor) or 27 (interior), medium 19/18, close 9/8.5. In 9:16 a whole diorama needs about 30 units of distance to fit the width.
- **Interiors** sit on a square dollhouse `RoomBase` (back and left walls), with a warm point light that is strong at night.

### Set dressing (`dressing.tsx`, reuse for new sets)
- **Nature:** Cypress, RoundTree, PineTree, PalmTree, Bush, Fern, Rock, Volcano, Dino.
- **Architecture:** Column, House (ancient, medieval, tudor or modern), Temple, Tower, Wall, Skyscraper.
- **Furniture and props:** Table, Throne, Carpet, Banner, Bookshelf, Barrel, Crate, TorchStand, StreetLamp, Tent, Fence, Well, Dock, Cannon, Anvil, GearMachine, Statue, Car, Bench, Candle, Market.
- **Grounds and bases** (`ground.tsx`): `DioramaBase ground="paving|grass|sand|dirt|planks|asphalt"`, `Water`, `RoomBase`, and HalfSea for PORT and BEACH.
- Colors come from the era palette through `useSet()`, and windows, lamps and torches glow at night.

### Globe and maps (`geo/`)
- **Data:** Natural Earth 1:50m through `world-atlas` (public domain). It has modern borders only, so build historical regions from country lists (`REGIONS` has some) or a custom `polygon: [lon, lat][]`. `country("Philippines")` and `regionCentre([...])` are helpers.
- **One projection convention:** `lonLatToVec3` matches three's SphereGeometry UVs, so textures, pins and routes line up. `faceRotation(view)` turns the globe so a lon/lat faces the camera.
- **`paintMap`** paints a canvas for any lon/lat window: ocean, shore glow, land, dashed borders, ink coastline, region fills and optional decor (compass and frame). There are three `MAP_STYLES`, storybook, parchment and modern, and `ERA_MAP_STYLE` picks one per era.
- **`<Globe view style fills pins labels routes detail stand clouds atmosphere />`** is the toy globe with a 4096×2048 painted texture. `detail={{ bounds, opacity }}` adds a high-res patch for close zooms.
- **`<MapBoard bounds width style fills pins labels routes raised frame decor />`** is the flat map-table diorama (north toward −Z). `raised` extrudes countries out of the map, with a `rise` (0–1) pop animation.
- **BORDER_SPREAD:** a `fills` entry is `{ countries | polygon, color, progress 0–1, origin }`. Color spreads in a soft circle from `origin` and is clipped to the region.
- **ROUTE_ARROW:** a `routes` entry is `{ from, to, via[], progress, icon: "ship"|"army"|"none", color }`. Dotted dashes draw in, an icon travels at the head, and an arrowhead appears at the end. On the globe, icons stay upright relative to the screen (a 3D ship seen from above reads as a plank).
- **ZOOM_TO_MAP:** animate `view` with `mixView` (shortest way round), shrink the camera distance from about 10.5 to 2.75, bring elevation to 0, and fade in `detail`. See `GlobeDemo`.
- **Labels:** `Label3D` canvas sprites in region (caps, white with an ink stroke), city (pill) or title (gold) style.

Review outputs: `out/sets/<SET>.png` (12 stills), `out/sets/sets-sheet.png` and `out/sets/globe-demo.mp4`.

## Effects (step 5, approved)

Code is in `src/kit/effects/`: `Shake.tsx`, `YearStamp.tsx`, `TimelineSplit.tsx`, `Ripple.tsx`, `World.tsx` (3D effects).

### 2D (wrap or overlay whole shots)
- **`<Shake impacts={[frames]} strength>`** wraps a shot in a decaying camera shake (about 0.7 s, zoomed 5% so edges never show). `shakeAt()` gives the raw offset.
- **YEAR_STAMP: `<YearStamp text subtitle y exitAt sfx />`** slams the year down like a rubber stamp: it accelerates in, hits at `STAMP_IMPACT` (frame 7), squashes and springs back, and puffs dust. It has a rough inked frame and edges (SVG turbulence filters) in the gold Luckiest Guy font. `text` takes "1521", "44 BC", "~3000 BC" or "AD 79". Sync with `<Shake impacts={[start + STAMP_IMPACT]}>`, and `sfx` plays on impact. It sits in the upper third by default, clear of captions.
- **TIMELINE_SPLIT: `<TimelineSplit real={…whatIf 0…} whatIf={…whatIf 1…} crackFrames takeoverAt />`** is the signature moment. A glowing jagged purple and white crack tears top to bottom with sparks at its tip. REAL stays on the left, WHAT IF? opens on the right, and both labels pop in. `takeoverAt` sweeps the crack off to the left so the alternate timeline fills the screen. Render the same `SetScene` twice with a different `whatIf`, or two different shots. It costs two canvases while split, so keep it short (2–4 s).
- **RIPPLE: `<Ripple from to frames center />`** is the "history rewrites itself" transition: glowing rings expand from `center`, and inside them the new shot wobbles in through a displacement warp that calms as it settles.

### 3D (inside a `SetScene`)
- **`Fire`** has logs, flickering flames, embers, smoke and a flickering orange point light.
- **`Burst kind="dust"|"sparks" at`** is a one-shot particle burst with ballistic sparks and dragged dust puffs.
- **`PlagueFog`** is low, drifting, sickly green fog blobs. Pair it with the 2D `<PlagueTint>` (put it in `SetScene overlay`).
- **`ShipFleet`** puts `ToyShip`s with wakes in a v, line or grid formation, sailing along `heading` at `speed`.
- **`FallingScrolls`** has tumbling scrolls raining down (it loops).
- **`Asteroid from to impactAt`** sends a rock with a fiery trail in, accelerating. On impact it adds a fireball, light flash, shockwave ring, dust and sparks. Pair it with `<ImpactFlash at>` and `<Shake impacts={[impactAt]}>`.
- **`Crowd`** is re-exported from characters.

### Fonts (`look/fonts.ts`)
Bundled in `public/fonts`, with their licenses, so every machine renders the same: **Luckiest Guy** (`FONT_STAMP`, Apache-2.0) for stamps and titles, and **Lilita One** (`FONT_DISPLAY`, OFL) for secondary display text. They're loaded with `@remotion/fonts`, which holds the render until they're ready.

Review outputs: `EffectsDemo` (all 8 demos, 20 s) in `out/effects/effects-demo.mp4`, and `EffectDemo` with `props: { effect }` for one demo.

## Captions (step 6, approved)

Code is in `src/kit/captions/`: `timing.ts`, `highlight.ts`, `Captions.tsx`, `TitleCard.tsx`.

- **Data format:** Remotion's `Caption` type (`@remotion/captions`) is `{ text, startMs, endMs, timestampMs, confidence }`, with a leading space before each word. The transcription step (7) writes this. Converters: `captionsToWords` (→ `WordTiming[]` for face talk) and `wordsToCaptions`.
- **`estimateTimings(text, startSec, wordsPerSec≈2.7)`** fakes plausible narration timings: longer words take longer, and punctuation adds pauses. Use it for previews before a voiceover exists.
- **`<Captions captions names y=0.74 maxWords=4 fontSize=92 offsetMs />`:**
  - Pages come from `createTikTokStyleCaptions`, and `withPageBreaks` also breaks after sentence ends, every 4 words and at about 22 characters.
  - The style is Lilita One in uppercase: white with a thick dark outline (`#1e1428`) and a drop shadow, wrapping to two lines. The word being spoken turns gold (`#ffd23f`), pops, lifts and tilts slightly.
  - Pages spring in and fade out before the next page.
- **Auto-highlighting** (`classify`, colors in `CAPTION_COLORS`):
  - **Years** (`1519`, `44 BC`, `~3000`, `1500s`) are cyan `#5ce1e6`.
  - **Names** are pink `#ff9fc4`: capitalized words that aren't at a sentence start or in a stop-list, plus anything in `names`.
  - **Emphasis** is orange `#ffb347`: mark it in the script with `*word*` (the asterisks are stripped).
- **`<TitleCard text="What if Magellan never left Spain?" exitAt y=0.3 />`:** for the opening hook. A gold "WHAT IF" stamp-pops over a soft purple dim, then the rest of the question pops in word by word on a purple banner, and the "?" wobbles. A leading "What if" in `text` becomes the stamp automatically.
- **Layout rule:** captions sit around 74% down the screen, and year stamps and title cards in the upper third, so they never collide. Keep key action out of the bottom 30%.

Review output: `CaptionsDemo` (10 s) in `out/captions/captions-demo.mp4`.

## Audio (step 7, approved)

Scripts are in `scripts/` (`gen-sounds.mjs`, `audio.mjs`, `whisper-setup.mjs`). The in-video mixer is in `src/kit/audio/` (`library.ts`, `Soundtrack.tsx`).

### Voice: `npm run audio -- <episode> [--script file.txt] [--skip-clean] [--model base.en]`
Put the recording at `public/voice/<episode>/raw.wav` (.mp3, .m4a, .flac and .ogg also work).
1. **Clean** with FFmpeg, choosing one of two chains:
   - **Studio chain** for the Kokoro narrator. `npm run voice` writes a `.tts` marker that selects it automatically, or force it with `--studio`. It **never denoises or de-esses**: on clean TTS, `afftdn` alone removed about 6.6 dB of air and 4 dB of presence, which caused the "boxed in" sound. Instead it does soxr resampling to 48 kHz, a −2.5 dB cut at 280 Hz (boxiness), +2.5 dB at 3.8 kHz (presence), a +3 dB high shelf above 8 kHz plus a light `aexciter` (air above the 12 kHz TTS ceiling), and gentle 2:1 compression.
   - **Mic chain** for real recordings (`--mic`). It adds a light `afftdn=nf=-40` and `deesser=i=0.25` before the same tone stage.
   - **Both** then trim silence (pauses capped at about 0.7 s) and run `loudnorm` to −14 LUFS / −1 dB true peak. The result is `voice.wav` (48 kHz mono).
2. **Word timestamps** come from **whisper.cpp running locally** (free and offline, through `@remotion/install-whisper-cpp`) with token-level timestamps. The result is `captions.json` (Remotion `Caption[]`) plus `voice.json` (duration and word count).
3. **`--script`** aligns the transcript to the script text (Needleman–Wunsch on words). Captions then use the script's exact spelling, so "1519" stays "1519" even when spoken as "fifteen nineteen", `*emphasis*` marks survive, and names are fixed (whisper heard "Zenhira, Miptan, Lapilapu"). Script words that weren't heard get time borrowed from their neighbors, so every word stays visible and in order. **Always pass the script.**

**One-time setup:** `npm run audio:setup` builds whisper.cpp 1.5.5 into `whisper.cpp/` (git-ignored) and downloads `ggml-base.en.bin`. Use `-- small.en` for better accuracy. If the model download fails behind a proxy, use `curl -L -o whisper.cpp/ggml-base.en.bin https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin`.

### Narrator: `npm run voice -- <episode> [--voice bm_george] [--speed 0.95]`
Uses **Kokoro**, a local neural TTS (Apache-2.0, so commercial use is fine; offline). It reads `public/voice/<episode>/script.txt` and writes `raw.wav`, then you run `npm run audio -- <episode> --script public/voice/<episode>/script.txt`.
- **Default voice `bm_george`:** a British documentary narrator. It came out clearest under Whisper, along with bm_lewis.
- **Other good narrators:** bm_lewis, bm_daniel, am_michael, am_onyx and am_fenrir. Samples are in `out/voices/` (regenerate with the snippet in `scripts/tts.py`).
- **Reading:** the script is voiced **sentence by sentence** (each gets its own cadence) with **deliberate pauses** instead of the model's flat 0.2–0.6 s gaps:
  - **Timings:** `.` and `!` 0.36 s, `?` 0.52 s, `:` and ` — ` 0.32 s, `...` 0.70 s suspense (the line before it is read about 7% slower and left hanging), a blank line between scenes 0.80 s, and `[pause]` (0.7 s) or `[pause:1.2]` explicit.
  - **Speed:** base speed is 1.08 (about 120 words/min including pauses). Questions are read 4% slower, and lines of 4 words or fewer 2% faster.
  - **Question lift:** Kokoro reads every "?" with a falling, statement-like ending, so `--question-lift` (default 2.5 semitones on short questions, 60% of that on long ones) glides the last part of each question up with Rubber Band (formants preserved). Use `--question-lift 0` to turn it off.
  - **Silence handling:** the cleanup step only trims the very start and end of narrator audio. The old internal silence trimmer deleted any pause over 0.7 s.
  - **Caching:** `TTS_VERSION` in `tts.py` plus the code of `tts.py` and `audio.mjs` are part of the episode voice cache key, so improvements re-voice automatically.
- **Script markup:** `*word*` is emphasis (captions only). Years are read naturally (1519 → "fifteen nineteen", 44 BC → "forty-four B C", 1500s → "fifteen hundreds", ~3000 BC → "around three thousand B C"). `word{spoken}` changes pronunciation without changing the caption (for example `datu{da-too}`). Don't put spaces inside the braces.
- **Writing for the narrator** (grammar for the ear):
  - Keep one idea per sentence, about 6–14 words, and avoid stacked clauses and appositives.
  - Name a person before using "he", "his" or "they".
  - Use contractions (he'd, never leave) and present tense for what-if scenes ("Imagine the king says no.").
  - Set up and pay off: a short question, then the answer ("His mission? Find a sea route…").
  - Put `...` before a reveal, and end on a direct question to the viewer.
  - Avoid parentheses, abbreviations and slashes, which the narrator reads badly.
  - Check unusual names: generate, then run Whisper on the phrase. If it's badly wrong, add `{phonetic}` (hyphenated syllables work best).
- **One-time setup:** `npm run voice:setup` creates `.venv-tts/` and downloads about 350 MB of models into `tts-models/` (both git-ignored).
- Your own recording works too: put it at `raw.wav` and skip `npm run voice`.

### Sound library: `npm run sounds` (synthesized in code, no samples or licenses; deterministic; runs automatically after `npm install`, and the WAVs are git-ignored)
- **`public/sfx/`:** stamp_slam, whoosh, ripple, war_drum, clash, waves (seamless 8 s loop), gong, crowd_cheer, rumble, impact, crackle (seamless 4 s fire loop), coins, page_flip, pop and sparkle.
- **`public/music/`:** 8-bar seamless loops:
  - **epic_tense:** D minor, 100 bpm, drums, ostinato and brass
  - **mysterious:** A minor, 80 bpm, pad and celesta
  - **sad_strings:** E minor, 66 bpm
  - **triumphant:** C major, 112 bpm, brass stabs and timpani
- To change a sound, edit its function in `gen-sounds.mjs` and re-run. Names and loop lengths live in `src/kit/audio/library.ts`.

### Mixing: `<Soundtrack durationInFrames voice={{ src, captions, startFrame }} music={[{ at, mood|"silence", volume }]} sfx={[{ at, name, volume, duration }]} drops={[{ at, holdFrames }]} />`
- **Music** loops, crossfades between mood cues over 24 frames, and fades out at the end.
- **Ducking:** music drops to 20% under narration. The envelope comes from the word timings (phrases merge across gaps under 350 ms, with 0.12 s attack and 0.45 s release).
- **Music drop:** `drops` cuts the music to silence at a frame (use it on TIMELINE_SPLIT), holds for about 0.9 s, then swells back over 1.2 s.
- **Levels:** music 0.38, voice 0.85, per-SFX defaults in `SFX_GAIN`. Loops (`waves`, `crackle`) take `duration` and fade in and out.
- **Mastering:** the raw mix runs about −12.7 LUFS and peaks around −0.5 dB. The episode export (step 8) runs a final `loudnorm` pass to −14 LUFS and −1 dB true peak.

Review outputs: `AudioDemo` (12 s, transcribed voice, captions, lip sync, ducking, stamp, ripple and the drop at the split) in `out/audio/audio-demo.mp4`. Use `--codec=wav` for a fast audio-only check.

## Episodes: the daily engine (step 8, awaiting review)

Code: `scripts/episode.mjs` (pipeline), `src/kit/episode/` (`spec.ts` types and validation, `SceneView.tsx`, `Episode.tsx`). Example: `episodes/magellan/scenes.json`.

### Daily commands
```
npm run episode -- <name> --preview   # half-res check   → out/<name>-preview.mp4
npm run episode -- <name> --scene 4   # one scene only   → out/<name>-scene4.mp4
npm run episode -- <name>             # final 1080×1920  → out/<name>.mp4 (mastered -14 LUFS)
npm run episode -- <name> --thumb     # thumbnail        → out/<name>-thumb.png + .jpg
```
Options: `--no-voice` (estimated timings and silent narration, for layout checks), `--voice bm_lewis`, `--redo-voice`, `--concurrency N`. Set `REMOTION_BROWSER_EXECUTABLE` if Remotion can't download its browser.

### What `npm run episode` does
1. Joins each scene's `narration` into `public/voice/<name>/script.txt`, one paragraph per scene, which gives natural pauses between scenes.
2. **Voice:** if you recorded `raw.*` yourself, it uses that (mic chain). Otherwise the Kokoro narrator (`spec.voice`, default `bm_george`) reads the script. The result is cached on a hash of the script and voice, so re-renders skip it.
3. `scripts/audio.mjs --script`: cleanup, Whisper word timestamps, and alignment to the script.
4. **Timing:** each scene runs from its first word to the next scene's first word, starting 4 frames early. The last scene adds `tail` (default 1.4 s). It writes `episodes/<name>/timeline.json` (the `Episode` props) and prints the scene table, warning outside 45–75 s.
5. **Render:** the `Episode` composition. `calculateMetadata` validates `scenes.json` with friendly errors (for example "unknown preset 'magelan'. Did you mean 'magellan'?" or "set BEACH has no mark 'dock' (marks: …)").
6. **Master:** two-pass FFmpeg `loudnorm` to −14 LUFS / −1 dBTP, AAC 320k, video stream copied, faststart.
7. **Thumbnail:** the frame from the scene with `"thumb": true`, otherwise 1.2 s into the split, otherwise scene 1. It adds a big gold "WHAT IF…?" and the question on a purple banner, and hides the REAL / WHAT IF labels.

### `scenes.json` format (types in `src/kit/episode/spec.ts`)
```jsonc
{
  "title": "What if Magellan never left Spain?",   // title card + thumbnail
  "voice": "bm_george",                             // optional narrator
  "names": ["Lapulapu", "Mactan"],                  // extra caption name highlights
  "scenes": [{
    "id": "battle",                                 // label in the scene table / Studio
    "set": "BEACH", "era": "ageOfSail", "timeOfDay": "sunset",   // era/time optional (set defaults)
    "camera": "wide|medium|close", "move": "static|push|pull|orbitLeft|orbitRight",
    "narration": "In April 1521, Magellan attacked... and fell.",  // REQUIRED; drives the length
    "titleCard": true,                              // or a string; hides captions in this scene
    "transition": "cut|ripple",                     // ripple into this scene (+ whoosh)
    "music": "epic_tense|mysterious|sad_strings|triumphant|silence",  // mood change here
    "sfx": [{ "name": "clash", "at": 2.6 }],        // seconds into the scene
    "characters": [{
      "preset": "magellan", "mark": "left" /* or [x,y,z] */, "heading": 60,
      "talking": false, "expression": "determined",
      "actions": [{ "action": "idle" }, { "action": "fall", "at": 2.8, "params": {}, "expression": "shocked" }]
    }],
    "effects": {
      "yearStamp": { "text": "1521", "subtitle": "Battle of Mactan", "at": 0.3, "hold": 2.2 },   // + shake + stamp SFX
      "timelineSplit": { "takeoverAt": 1.9, "whatIfCharacters": [ … ] },   // once per episode; music drop + ripple SFX; later scenes are What If
      "crowd": { "count": 20, "pool": "mactan", "cheerAt": 3.8, "flanks": true },   // flanks = two groups framing the action
      "fire": { "mark": "back" }, "plagueFog": true, "shipFleet": { "count": 7 },
      "fallingScrolls": true, "asteroid": { "at": 1.6 }
    },
    "geo": {                                         // GLOBE / MAP_REGION
      "view": [-20, 25], "viewTo": [124, 10.3], "zoom": true,     // globe turn (+ dive)
      "center": [122, 11], "span": 22,                             // map window
      "fills":  [{ "countries": ["Spain"], "color": "#c0392b", "from": 0.4, "to": 1.6 }],
      "routes": [{ "path": [[lon, lat], …], "icon": "ship", "from": 1.2 }],
      "pins":   [{ "at": [lon, lat], "at_time": 0.6 }],
      "labels": [{ "at": [lon, lat], "text": "Mactan · 1521", "style": "city", "from": 3.6 }]
    },
    "whatIf": 1,                                     // force a grade (default: 0 before the split, 1 after)
    "tail": 1.6,                                     // last scene: seconds after the last word
    "thumb": true                                    // thumbnail frame comes from here
  }]
}
```
- **Automatic SFX:** year stamp (stamp_slam), split (ripple plus the music drop), ripple transition (whoosh), asteroid (impact), fire (crackle loop), crowd cheer (crowd_cheer), and waves under PORT and BEACH scenes.
- **Timing is in seconds relative to the scene.** Scene lengths come from the narration, so write about 8–20 words per scene. A 60–75 s episode is about 140–180 words.
- **Narration markup:** `*emphasis*`, `word{spoken}` (no spaces inside the braces), and `...` for a pause. Years are read naturally.
- **Composition rules learned:** on BEACH and PORT the back half is water, so use crowd `flanks`. Keep characters on marks and the bottom 30% clear for captions.

### Daily workflow (15–30 min)
1. Fact-check the real-history claims (ask Claude: "Fact-check only the real-history claims…").
2. Write `episodes/<name>/scenes.json` (ask Claude to convert the script using only kit presets, sets, actions and effects. Anything truly missing gets added to the kit).
3. `npm run episode -- <name> --preview`, watch it, fix with `--scene N` checks.
4. `npm run episode -- <name>`, then `--thumb`. Upload `out/<name>.mp4` and `out/<name>-thumb.jpg`.

## Project layout

```
src/
  index.ts            registerRoot
  Root.tsx            all <Composition>s + VIDEO format constants
  compositions/       test and demo compositions (TestCube, LookTest, showreels)
  kit/                the reusable kit (filled in as we build)
    look/             Stage, LightRig, ToonMaterial, Ink, SoftShadow, Sky,
                      PaintedBackdrop, Grade, OrbitCamera, palettes, geometry      (step 2 ✓)
    characters/       rig.ts, Body, Hand (3a ✓) · Face/ (3b ✓) · Costume/ (3c ✓) · presets.ts, PresetCharacter, Crowd (3d)
    actions/          core, library (26 actions), Performer                        (step 3e)
    sets/             SetScene, 12 sets, dressing, ground, geo/ (globe + maps)      (step 4)
    effects/          Shake, YearStamp, TimelineSplit, Ripple, World (3D fx)        (step 5)
    captions/         Captions, TitleCard, timing + highlight helpers               (step 6)
  kit/audio/          Soundtrack mixer, sound library names                         (step 7)
scripts/              gen-sounds.mjs, audio.mjs, tts.py, whisper-setup.mjs (7) · episode.mjs (8)
whisper.cpp/          local speech-to-text build + model (git-ignored, npm run audio:setup)
  kit/episode/        scenes.json types + validation, SceneView, Episode           (step 8)
episodes/<name>/      scenes.json (you write) + timeline.json (generated)          (step 8)
public/               fonts/, sfx/, music/ (generated), voice/<episode>/ (raw → voice.wav + captions.json)
out/                  renders (git-ignored)
.claude/skills/       official Remotion agent skills (-> .agents/skills)
```

## Commands

| Command | What it does |
|---|---|
| `npm run episode -- <name> [--preview\|--thumb\|--scene N]` | **Daily:** scenes.json → mastered MP4 / preview / thumbnail |
| `npm run dev` | Open Remotion Studio to preview compositions |
| `npm run render:test` | Render the 3 s spinning cube to `out/test.mp4` |
| `npm run render:look` | Render the 4 s sunset plaza look test to `out/look-test.mp4` |
| `npx remotion still LookTest out/x.png --frame=60 --props='{"timeOfDay":"night","whatIf":1}'` | Check another time of day or grade |
| `npx remotion render <CompositionId> out/<file>.mp4` | Render any composition |
| `npx remotion still <CompositionId> out/<file>.png --frame=<n>` | Render one frame as an image |
| `npm run audio:setup` | One time: build whisper.cpp and download the speech model |
| `npm run sounds` | Regenerate all SFX and music loops into `public/sfx` and `public/music` |
| `npm run voice:setup` | One time: install the Kokoro narrator (offline neural TTS) |
| `npm run voice -- <ep> [--voice bm_george]` | Script → narration `public/voice/<ep>/raw.wav` |
| `npm run audio -- <ep> --script <file>` | Clean `public/voice/<ep>/raw.*` and write word-timed `captions.json` |
| `npm run render:audio` | Render the 12 s audio demo to `out/audio/` |
| `npm run render:captions` | Render the 10 s captions demo to `out/captions/` |
| `npm run render:effects` | Render the 20 s effects demo to `out/effects/` |
| `npm run render:sets` | Render all 12 set stills and the globe demo to `out/sets/` |
| `npm run render:motion` | Render the motion showreel and the actions grid to `out/motion/` |
| `npm run render:char` | Render all character review sheets to `out/char/` |
| `npm run lint` | ESLint + TypeScript check |

If Remotion can't download its headless browser (offline or restricted network), add
`--browser-executable=<path to chrome-headless-shell or chrome>` to any render or still command.

## Agent skills

The official Remotion skills are installed (`npx skills add remotion-dev/skills`) in `.agents/skills/`, which `.claude/skills` points to.
The most relevant ones are `remotion-best-practices`, `remotion-render`, `remotion-captions`, `remotion-maps` and `remotion-multimedia`.

## Build progress

- [x] 1. Scaffold. Three template, skills installed, `out/test.mp4` renders (1080×1920, 30 fps, 90 frames)
- [x] 2. Look locked: storybook diorama, toon + ink, 4 light rigs, era palettes, What If grade (`out/look-test.mp4`, `out/look/look-sheet.png`)
- [x] 3a. Base body approved (`out/char/base-turnaround.png`, `base-variants.png`, `hand-poses.png`, `rig-test.png`)
- [x] 3b. Faces approved (`out/char/expressions.png`, `face-parts.png`, `face-talk-test.mp4`)
- [x] 3c. Costumes approved (`out/char/costumes.png`, `headgear.png`, `props.png`, `costume-turntable.mp4`)
- [x] 3d. Presets + crowd approved (`out/char/cast.png`, `crowd-demo.mp4`)
- [x] 3e. Motion library approved (`out/motion/showreel.mp4`, `actions-grid.mp4`)
- [x] 4. Sets and globe approved (`out/sets/sets-sheet.png`, `globe-demo.mp4`)
- [x] 5. Effects approved (`out/effects/effects-demo.mp4`)
- [x] 6. Captions approved (`out/captions/captions-demo.mp4`)
- [x] 7. Audio pipeline approved (`out/audio/audio-demo.mp4`)
- [ ] 8. Episode pipeline: built, awaiting review (`out/magellan-preview.mp4`, `out/magellan.mp4`, `out/magellan-thumb.png`)
