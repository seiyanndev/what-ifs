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

## Project layout

```
src/
  index.ts            registerRoot
  Root.tsx            all <Composition>s + VIDEO format constants
  compositions/       test and demo compositions (TestCube, look tests, showreels)
  kit/                the reusable kit (filled in as we build)
    look/             shaders, lighting rigs, outline, era palettes, What If grade   (step 2)
    characters/       Body, Face/, Costume/, presets.ts, Crowd                      (step 3)
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
| `npx remotion render <CompositionId> out/<file>.mp4` | Render any composition |
| `npx remotion still <CompositionId> out/<file>.png --frame=<n>` | Render one frame as an image |
| `npm run lint` | ESLint + TypeScript check |

If Remotion can't download its headless browser (offline or restricted network), add
`--browser-executable=<path to chrome-headless-shell or chrome>` to any render or still command.

## Agent skills

The official Remotion skills are installed (`npx skills add remotion-dev/skills`) in `.agents/skills/`, which `.claude/skills` points to.
The most relevant ones are `remotion-best-practices`, `remotion-render`, `remotion-captions`, `remotion-maps` and `remotion-multimedia`.

## Build progress

- [x] 1. Scaffold. Three template, skills installed, `out/test.mp4` renders (1080×1920, 30 fps, 90 frames)
- [ ] 2. Look locked
- [ ] 3a–3e. Characters (body, faces, costumes, presets, motion)
- [ ] 4. Sets and globe
- [ ] 5. Effects
- [ ] 6. Captions
- [ ] 7. Audio pipeline
- [ ] 8. Episode pipeline
