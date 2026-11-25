#!/usr/bin/env node
// The daily engine: episodes/<name>/scenes.json → out/<name>.mp4
//
//   npm run episode -- <name>              full render (1080×1920), mastered to -14 LUFS
//   npm run episode -- <name> --preview    half-resolution preview → out/<name>-preview.mp4
//   npm run episode -- <name> --thumb      thumbnail only → out/<name>-thumb.png / .jpg
//   npm run episode -- <name> --scene 3    render just scene 3 (preview size) for a quick fix check
//   npm run episode -- <name> --no-voice   skip TTS: estimated timings, silent narration (layout checks)
//   options: --voice bm_lewis  --redo-voice  --concurrency 4
//
// Steps: build script.txt from the scenes' narration → narrator (Kokoro) unless you recorded raw.* yourself
// → clean + transcribe + align (scripts/audio.mjs) → split the word timings into scenes → render → master.

import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const FPS = 30;
const ROOT = process.cwd();
const args = process.argv.slice(2);
const name = args.find((a, i) => !a.startsWith("--") && !(i > 0 && ["--voice", "--scene", "--concurrency"].includes(args[i - 1])));
const has = (f) => args.includes(`--${f}`);
const opt = (f) => {
  const i = args.indexOf(`--${f}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const die = (msg) => {
  console.error(`\n✖ ${msg}\n`);
  process.exit(1);
};
const step = (msg) => console.log(`\n▸ ${msg}`);
const run = (cmd, a, opts = {}) => {
  const r = spawnSync(cmd, a, { stdio: "inherit", ...opts });
  if (r.status !== 0) die(`${cmd} ${a.slice(0, 3).join(" ")}… failed (exit ${r.status})`);
};
if (!name) die("usage: npm run episode -- <name> [--preview] [--thumb] [--scene N] [--no-voice] [--voice id] [--redo-voice]");

const epDir = path.join(ROOT, "episodes", name);
const specPath = path.join(epDir, "scenes.json");
if (!existsSync(specPath)) die(`No ${path.relative(ROOT, specPath)} — create it (see CLAUDE.md "Episodes").`);
let spec;
try {
  spec = JSON.parse(readFileSync(specPath, "utf8"));
} catch (e) {
  die(`scenes.json is not valid JSON: ${e.message}`);
}
if (!Array.isArray(spec.scenes) || !spec.scenes.length) die("scenes.json needs a non-empty \"scenes\" list.");
spec.scenes.forEach((s, i) => {
  if (!s.narration || !String(s.narration).trim()) die(`scene ${i + 1}: "narration" is required.`);
});

// ---------------------------------------------------------------------------
// 1. Narration script (one paragraph per scene → natural pauses between scenes)
// ---------------------------------------------------------------------------
const voiceDir = path.join(ROOT, "public", "voice", name);
mkdirSync(voiceDir, { recursive: true });
const script = spec.scenes.map((s) => String(s.narration).trim().replace(/\s+/g, " ")).join("\n\n") + "\n";
writeFileSync(path.join(voiceDir, "script.txt"), script);
const words = (t) => t.replace(/\[pause(?::[\d.]+)?\]/g, " ").split(/\s+/).filter(Boolean);
const sceneWordCounts = spec.scenes.map((s) => words(String(s.narration)).length);
const totalWords = sceneWordCounts.reduce((a, b) => a + b, 0);

// ---------------------------------------------------------------------------
// 2–3. Voice + word timings (cached on script + voice)
// ---------------------------------------------------------------------------
let captions;
let voiceRel = null;
if (has("no-voice")) {
  step("No voice: estimating timings from the text");
  captions = [];
  let t = 0.3;
  spec.scenes.forEach((s, si) => {
    for (const w of words(String(s.narration))) {
      const letters = w.replace(/[^\p{L}\p{N}]/gu, "").length;
      const dur = (0.55 + Math.min(0.9, letters * 0.075)) / 1.4;
      captions.push({ text: (captions.length ? " " : "") + w.replace(/\{[^}]*\}/g, ""), startMs: Math.round(t * 1000), endMs: Math.round((t + dur) * 1000), timestampMs: null, confidence: null });
      t += dur + (/[.!?]$/.test(w) ? 0.42 : /[,;:—–]$/.test(w) ? 0.2 : 0.04);
    }
    if (si < spec.scenes.length - 1) t += 0.45;
  });
} else {
  const voiceId = opt("voice") ?? spec.voice ?? "bm_george";
  // cache key: script + voice + the narrator/cleanup code itself (so improvements re-voice automatically)
  const code = ["tts.py", "audio.mjs"].map((f) => readFileSync(path.join(ROOT, "scripts", f), "utf8")).join("");
  const hash = createHash("sha1").update(script + "|" + voiceId + "|" + code).digest("hex").slice(0, 12);
  const stamp = path.join(voiceDir, ".pipeline-hash");
  const userRecording = readdirSync(voiceDir).find((f) => /^raw\.(wav|mp3|m4a|flac|ogg|aac)$/i.test(f)) && !existsSync(path.join(voiceDir, ".tts"));
  const cached = existsSync(stamp) && readFileSync(stamp, "utf8") === hash && existsSync(path.join(voiceDir, "captions.json")) && !has("redo-voice");
  if (cached) {
    step("Voice + timings unchanged (cached)");
  } else {
    if (userRecording) {
      step("Using your recording (raw.*) — cleaning + transcribing");
    } else {
      if (!existsSync(path.join(ROOT, ".venv-tts", "bin", "python"))) die("Narrator not installed. Run: npm run voice:setup   (or record public/voice/" + name + "/raw.wav yourself)");
      step(`Narrating with ${voiceId}`);
      run(path.join(ROOT, ".venv-tts", "bin", "python"), [path.join(ROOT, "scripts", "tts.py"), name, "--voice", voiceId]);
    }
    if (!existsSync(path.join(ROOT, "whisper.cpp", "main"))) die("Speech-to-text not installed. Run: npm run audio:setup");
    step("Cleaning voice + word timestamps");
    run("node", [path.join(ROOT, "scripts", "audio.mjs"), name, "--script", path.join(voiceDir, "script.txt")]);
    writeFileSync(stamp, hash);
  }
  captions = JSON.parse(readFileSync(path.join(voiceDir, "captions.json"), "utf8"));
  voiceRel = `voice/${name}/voice.wav`;
  if (captions.length !== totalWords) die(`Timing mismatch: script has ${totalWords} words but captions.json has ${captions.length}. Re-run with --redo-voice.`);
}

// ---------------------------------------------------------------------------
// 4. Split the timeline into scenes: each scene runs from its first word to the next scene's first word
// ---------------------------------------------------------------------------
const toF = (ms) => Math.round((ms / 1000) * FPS);
const starts = [];
let w = 0;
for (const n of sceneWordCounts) {
  starts.push(w);
  w += n;
}
const lastEnd = captions[captions.length - 1].endMs;
const tail = spec.scenes[spec.scenes.length - 1].tail ?? 1.4;
const total = toF(lastEnd) + Math.round(tail * FPS);
const splitIndex = spec.scenes.findIndex((s) => s.effects?.timelineSplit);
const scenes = spec.scenes.map((s, i) => {
  const from = i === 0 ? 0 : toF(captions[starts[i]].startMs) - 4; // cut a hair before the first word
  const to = i === spec.scenes.length - 1 ? total : toF(captions[starts[i + 1]].startMs) - 4;
  return { ...s, index: i, from, durationInFrames: Math.max(15, to - from), afterSplit: splitIndex >= 0 && i > splitIndex };
});
const timeline = { name, spec, scenes, captions, durationInFrames: total, voice: voiceRel };
const timelinePath = path.join(epDir, "timeline.json");
writeFileSync(timelinePath, JSON.stringify(timeline));

console.log(`\n${spec.title}`);
scenes.forEach((s) =>
  console.log(
    `  ${String(s.index + 1).padStart(2)}. ${(s.id ?? s.set).padEnd(16)} ${(s.from / FPS).toFixed(2).padStart(6)}s  +${(s.durationInFrames / FPS).toFixed(2)}s${s.effects?.timelineSplit ? "  ⚡ split" : ""}${s.afterSplit ? "  (what if)" : ""}`,
  ),
);
console.log(`  total ${(total / FPS).toFixed(1)} s (${total} frames)${total / FPS > 75 ? "  ⚠ longer than 75 s" : total / FPS < 45 ? "  ⚠ shorter than 45 s" : ""}`);

// ---------------------------------------------------------------------------
// 5. Render
// ---------------------------------------------------------------------------
const outDir = path.join(ROOT, "out");
mkdirSync(outDir, { recursive: true });
const browser = process.env.REMOTION_BROWSER_EXECUTABLE ? ["--browser-executable", process.env.REMOTION_BROWSER_EXECUTABLE] : [];
const conc = opt("concurrency") ? ["--concurrency", opt("concurrency")] : [];

// Bundle once per code version (re-used by every scene / audio / still render below).
const listFiles = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? listFiles(path.join(dir, e.name)) : [path.join(dir, e.name)]));
const codeHash = createHash("sha1")
  .update(
    [...listFiles(path.join(ROOT, "src")), path.join(ROOT, "remotion.config.ts"), path.join(ROOT, "package-lock.json")]
      .sort()
      .map((f) => f + readFileSync(f, "utf8"))
      .join(""),
  )
  .digest("hex")
  .slice(0, 12);
const bundleDir = path.join(outDir, ".bundle", codeHash);
if (!existsSync(path.join(bundleDir, "index.html"))) {
  step("Bundling the kit (once per code change)");
  execFileSync("rm", ["-rf", path.join(outDir, ".bundle")]);
  run("npx", ["remotion", "bundle", "--out-dir", bundleDir], { cwd: ROOT });
}
const render = (comp, out, a) => run("npx", ["remotion", "render", bundleDir, comp, out, ...a, ...browser, ...conc], { cwd: ROOT });

const thumbFrame = () => {
  const pick = scenes.find((s) => s.thumb) ?? (splitIndex >= 0 ? scenes[splitIndex] : scenes[0]);
  const off = pick.effects?.timelineSplit ? Math.min(pick.durationInFrames - 2, Math.round(1.2 * FPS)) : Math.round(pick.durationInFrames * 0.55);
  return pick.from + off;
};

if (has("thumb")) {
  step("Thumbnail");
  const thumbProps = path.join(epDir, ".thumb-props.json");
  writeFileSync(thumbProps, JSON.stringify({ ...timeline, thumbnail: true }));
  const png = path.join(outDir, `${name}-thumb.png`);
  run("npx", ["remotion", "still", bundleDir, "Episode", png, `--props=${thumbProps}`, `--frame=${thumbFrame()}`, ...browser], { cwd: ROOT });
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", png, "-q:v", "2", path.join(outDir, `${name}-thumb.jpg`)]);
  console.log(`\n✔ ${path.relative(ROOT, png)} (+ .jpg)`);
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Scene-by-scene rendering with a cache: a scene is only re-rendered when something that can change
// its pixels changed (its spec, timing, captions in its range, the previous scene for ripples,
// quality, size, or the kit code). Editing one scene re-renders one scene.
// ---------------------------------------------------------------------------
const preview = has("preview") || Boolean(opt("scene"));
const quality = preview ? "preview" : "final";
const scale = preview ? 0.5 : 1;
const crf = preview ? 26 : 18;
const tlQuality = { ...timeline, quality };
const qualityPath = path.join(epDir, `.timeline-${quality}.json`);
writeFileSync(qualityPath, JSON.stringify(tlQuality));
const chunkDir = path.join(outDir, ".chunks", name, quality);
mkdirSync(chunkDir, { recursive: true });

const sceneKey = (s) => {
  const startMs = (s.from / FPS) * 1000;
  const endMs = ((s.from + s.durationInFrames) / FPS) * 1000;
  const caps = captions.filter((c) => c.endMs > startMs - 1000 && c.startMs < endMs + 1000);
  const prev = s.transition === "ripple" ? scenes[s.index - 1] : null;
  const strip = (x) => x && { ...x, index: undefined };
  return createHash("sha1")
    .update(JSON.stringify([strip(s), strip(prev), caps, spec.title, spec.names, quality, scale, crf, codeHash, splitIndex]))
    .digest("hex")
    .slice(0, 12);
};

const renderScenes = (list) => {
  const files = [];
  let rendered = 0;
  const t0 = Date.now();
  for (const s of list) {
    const file = path.join(chunkDir, `${String(s.index + 1).padStart(2, "0")}-${sceneKey(s)}.mp4`);
    files.push(file);
    if (existsSync(file)) continue;
    rendered++;
    console.log(`  scene ${s.index + 1}/${scenes.length} ${s.id ?? s.set} (${s.durationInFrames} frames)…`);
    const tmp = file.replace(/\.mp4$/, ".part.mp4");
    render("Episode", tmp, [`--props=${qualityPath}`, `--frames=${s.from}-${s.from + s.durationInFrames - 1}`, `--scale=${scale}`, `--crf=${crf}`, "--muted", "--log=error"]);
    execFileSync("mv", [tmp, file]);
  }
  const reused = list.length - rendered;
  console.log(`  ${rendered} scene(s) rendered, ${reused} reused from cache  (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  // drop stale chunks of this episode/quality
  const keep = new Set(files.map((f) => path.basename(f)));
  if (list.length === scenes.length) for (const f of readdirSync(chunkDir)) if (!keep.has(f)) execFileSync("rm", ["-f", path.join(chunkDir, f)]);
  return files;
};

const concat = (files, out) => {
  const listFile = path.join(chunkDir, "concat.txt");
  writeFileSync(listFile, files.map((f) => `file '${f}'`).join("\n"));
  run("ffmpeg", ["-hide_banner", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", listFile, "-c", "copy", out]);
};

const sceneArg = opt("scene");
if (sceneArg) {
  const s = scenes[Number(sceneArg) - 1];
  if (!s) die(`No scene ${sceneArg} (episode has ${scenes.length}).`);
  step(`Scene ${sceneArg} only (preview size)`);
  const [file] = renderScenes([s]);
  const out = path.join(outDir, `${name}-scene${sceneArg}.mp4`);
  execFileSync("cp", [file, out]);
  console.log(`\n✔ ${path.relative(ROOT, out)}  (silent; scene preview)`);
  process.exit(0);
}

step(preview ? "Rendering preview scenes (540×960, preview quality)" : "Rendering scenes (1080×1920, final quality)");
const files = renderScenes(scenes);
const video = path.join(chunkDir, "video.mp4");
concat(files, video);

// Audio: rendered once per (voice + timing + music/SFX cues); cached across video-only edits.
const audioKey = createHash("sha1")
  .update(JSON.stringify([voiceRel && readFileSync(path.join(ROOT, "public", voiceRel)).length, captions, scenes.map((s) => [s.from, s.durationInFrames, s.music, s.sfx, s.effects, s.transition, s.set]), codeHash]))
  .digest("hex")
  .slice(0, 12);
const audio = path.join(outDir, ".chunks", name, `audio-${audioKey}.wav`);
if (!existsSync(audio)) {
  step("Rendering the soundtrack (narration + music + SFX)");
  for (const f of readdirSync(path.dirname(audio))) if (/^audio-.*\.wav$/.test(f)) execFileSync("rm", ["-f", path.join(path.dirname(audio), f)]);
  render("Episode", audio, [`--props=${qualityPath}`, "--codec=wav", "--log=error"]);
} else step("Soundtrack unchanged (cached)");

// ---------------------------------------------------------------------------
// 6. Master: two-pass loudnorm → -14 LUFS, -1 dBTP; mux with the concatenated video (stream copy)
// ---------------------------------------------------------------------------
step("Mastering audio to -14 LUFS + muxing");
const final = path.join(outDir, `${name}${preview ? "-preview" : ""}.mp4`);
const measure = spawnSync("ffmpeg", ["-hide_banner", "-i", audio, "-af", "loudnorm=I=-14:TP=-1:LRA=11:print_format=json", "-f", "null", "-"], { encoding: "utf8" });
const m = JSON.parse(measure.stderr.slice(measure.stderr.lastIndexOf("{")));
const ln = `loudnorm=I=-14:TP=-1:LRA=11:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
run("ffmpeg", ["-hide_banner", "-v", "error", "-y", "-i", video, "-i", audio, "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-af", ln, "-ar", "48000", "-c:a", "aac", "-b:a", "320k", "-shortest", "-movflags", "+faststart", final]);
console.log(`\n✔ ${path.relative(ROOT, final)}  (${(total / FPS).toFixed(1)} s)`);
if (!preview) console.log("  Thumbnail: npm run episode -- " + name + " --thumb");
