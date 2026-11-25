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

## Characters: costumes (step 3c, awaiting review)

Code is in `src/kit/characters/Costume/`. Everything mounts on `Body` slots and sizes itself with `useBody()`.

- **`<Character costume={...} skin shape face pose id capeLift />`** is the dressed figurine. A `CostumeSpec` is `{ hair, facialHair, headwear, outfit, cape, props }`. Presets (3d) are just CostumeSpecs.
- **Hair** (`HAIR_STYLES`): short, long, bun, curly, bald (fringe), braids, ponytail, topknot. Colors are in `HAIR_COLORS` (black, darkBrown, brown, auburn, blonde, red, grey, white). Brow color follows the hair.
- **Facial hair:** 2D layers from the face system, plus `wizard: true` for a long 3D beard (`WizardBeard`).
- **Headwear** (`HEADWEAR_TYPES`): laurel, crown, bicorne, tricorne, vikingHelmet (no horns), galea, kabuto, morion, monkHood, turban, mingHat, featherHeaddress (generic), topHat, leafCrown, hardHat. Each takes optional `color` and `accent`.
- **Outfits** (`OUTFIT_TYPES`, `buildOutfit`): toga, legionary, peasantTunic, monkRobe, royalRobe (brings its own cape), knightArmor, explorerCoat, napoleonic, mingRobe, samurai, filipinoWarrior (bahag + upper wrap, generic), scholarRobe, modernCasual, suit. Recolor with `colors: { main, second, trim, metal }`. An outfit sets base colors (`shirt`, `pants`, `shoes`, `boots`, `hands`), sleeves and hidden parts (robes hide the legs and pelvis), and attaches its pieces.
- **Outfit building blocks** (reuse them for new outfits): `Skirt` (ankle, knee or thigh; `open` for coats), `Belt`, `Panel`, `WideSleeve`, `ShoulderPiece` (round, flat or epaulette), `Collar` (ring, ermine, high or vneck), `Sash`, `Strips`, `Bands`, `CoatTails`, `Buttons`, `Emblem`.
- **Props** (`PROP_TYPES`): scroll, book, quill, sword, spear, shield (forearm mount), kampilan, bow, telescope, map, flag (waving cloth, `color` + `accent`), torch (animated flame), globe (spins), gears (turn), coinBag, crownPillow. Props are modeled with the grip at the origin and +Y out of the thumb side. `Character` mounts them in `gripL`/`gripR` and sets the hand to `hold`. They also stand on the ground in sets.
- **Cape:** a thin cloth box whose vertices are recomputed every frame. The hem lags and ripples, and the edges wrap forward. `lift` (0–1) streams it behind for runs, and `wind` sets the flutter.
- **Rules:** keep cultural costumes generic and respectful, and make famous figures recognizable by silhouette and props only.
- **Geometry rule:** `lathe()` profiles are auto-oriented bottom to top (top-down profiles used to render inside-out). Use `warpedLathe` for lobed brims and `extruded` for flat shapes.

Review outputs: the `Headgear`, `Costumes` and `Props` stills and the `CostumeTurntable` video, rendered to `out/char/`.

## Project layout

```
src/
  index.ts            registerRoot
  Root.tsx            all <Composition>s + VIDEO format constants
  compositions/       test and demo compositions (TestCube, LookTest, showreels)
  kit/                the reusable kit (filled in as we build)
    look/             Stage, LightRig, ToonMaterial, Ink, SoftShadow, Sky,
                      PaintedBackdrop, Grade, OrbitCamera, palettes, geometry      (step 2 ✓)
    characters/       rig.ts, Body, Hand (3a ✓) · Face/ (3b ✓) · Costume/ (3c) · presets.ts, Crowd (3d)
    actions/          procedural animations                                         (step 3e)
    sets/             diorama sets, GLOBE, MAP_REGION                               (step 4)
    effects/          YEAR_STAMP, TIMELINE_SPLIT, RIPPLE, ...                       (step 5)
    captions/         word-by-word captions, title cards                            (step 6)
scripts/              audio.mjs, episode pipeline                                   (steps 7–8)
episodes/<name>/      scenes.json per episode                                       (step 8)
public/               voice/, sfx/, music/ (static assets via staticFile())
out/                  renders (git-ignored)
.claude/skills/       official Remotion agent skills (-> .agents/skills)
```

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Open Remotion Studio to preview compositions |
| `npm run render:test` | Render the 3 s spinning cube to `out/test.mp4` |
| `npm run render:look` | Render the 4 s sunset plaza look test to `out/look-test.mp4` |
| `npx remotion still LookTest out/x.png --frame=60 --props='{"timeOfDay":"night","whatIf":1}'` | Check another time of day or grade |
| `npx remotion render <CompositionId> out/<file>.mp4` | Render any composition |
| `npx remotion still <CompositionId> out/<file>.png --frame=<n>` | Render one frame as an image |
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
- [ ] 3c. Costumes: built, awaiting review (`out/char/costumes.png`, `headgear.png`, `props.png`, `costume-turntable.mp4`)
- [ ] 3d–3e. Presets + crowd, motion
- [ ] 4. Sets and globe
- [ ] 5. Effects
- [ ] 6. Captions
- [ ] 7. Audio pipeline
- [ ] 8. Episode pipeline
