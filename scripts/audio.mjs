#!/usr/bin/env node
// Voice pipeline for an episode:
//   1. clean   public/voice/<ep>/raw.(wav|mp3|m4a)  → public/voice/<ep>/voice.wav
//              (high-pass, de-ess, gentle compression, trim silence, loudness ≈ -14 LUFS, true-peak -1 dB)
//   2. words   transcribe voice.wav with local whisper.cpp → public/voice/<ep>/captions.json (Remotion Caption[])
//   3. fix     optional: align to the script text so caption spelling matches (names, years, *emphasis*)
//
//   npm run audio -- <episode>                 # clean + transcribe
//   npm run audio -- <episode> --script <file> # …and fix spelling against the script
//   npm run audio -- <episode> --skip-clean    # transcribe an already-clean voice.wav
//
// One-time setup: npm run audio:setup   (builds whisper.cpp, downloads the model)

import { toCaptions, transcribe } from "@remotion/install-whisper-cpp";
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const ep = args.find((a) => !a.startsWith("--"));
if (!ep) {
  console.error("usage: npm run audio -- <episode> [--script file.txt] [--skip-clean] [--model base.en]");
  process.exit(1);
}
const opt = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const dir = path.join(process.cwd(), "public", "voice", ep);
const WHISPER = path.join(process.cwd(), "whisper.cpp");
const model = opt("model") ?? "base.en";
const voice = path.join(dir, "voice.wav");
const ff = (...a) => execFileSync("ffmpeg", ["-hide_banner", "-v", "error", "-y", ...a], { stdio: "inherit" });

// ---------------------------------------------------------------------------
// 1. Clean
// ---------------------------------------------------------------------------
if (!args.includes("--skip-clean")) {
  const raw = existsSync(dir) ? readdirSync(dir).find((f) => /^raw\.(wav|mp3|m4a|flac|ogg|aac)$/i.test(f)) : undefined;
  if (!raw) {
    console.error(`No recording found. Put it at public/voice/${ep}/raw.wav (or .mp3/.m4a).`);
    process.exit(1);
  }
  const chain = [
    "highpass=f=80", // rumble / handling noise
    "afftdn=nf=-25", // light broadband denoise
    "deesser=i=0.4", // soften harsh S sounds
    "acompressor=threshold=-20dB:ratio=3:attack=8:release=120:makeup=3", // even out the narration
    // trim leading/trailing silence, cap internal pauses at ~0.6 s (keeps it punchy)
    "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.12:stop_periods=-1:stop_duration=0.6:stop_threshold=-45dB",
    "loudnorm=I=-14:TP=-1:LRA=9", // streaming loudness target
  ].join(",");
  ff("-i", path.join(dir, raw), "-af", chain, "-ar", "48000", "-ac", "1", voice);
  console.log(`cleaned → public/voice/${ep}/voice.wav`);
}
if (!existsSync(voice)) {
  console.error(`Missing ${voice}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 2. Word timestamps (whisper.cpp wants 16 kHz mono)
// ---------------------------------------------------------------------------
if (!existsSync(path.join(WHISPER, `ggml-${model}.bin`))) {
  console.error(`whisper model missing — run: npm run audio:setup${model === "base.en" ? "" : ` -- ${model}`}`);
  process.exit(1);
}
const tmp16 = path.join(dir, ".voice16k.wav");
ff("-i", voice, "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", tmp16);
const out = await transcribe({
  inputPath: tmp16,
  whisperPath: WHISPER,
  whisperCppVersion: "1.5.5",
  model,
  tokenLevelTimestamps: true,
  splitOnWord: true,
  printOutput: false,
});
let { captions } = toCaptions({ whisperCppOutput: out });
captions = captions.filter((c) => c.text.trim().length > 0);

// ---------------------------------------------------------------------------
// 3. Fix spelling against the script (keeps whisper's timings, uses the script's words)
// ---------------------------------------------------------------------------
const scriptFile = opt("script");
if (scriptFile) {
  const script = readFileSync(scriptFile, "utf8").split(/\s+/).filter(Boolean);
  const norm = (w) => w.toLowerCase().replace(/[^a-z0-9]/g, "");
  // numbers spoken as words ("fifteen nineteen") vs script digits: allow the aligner to absorb them
  const a = captions.map((c) => norm(c.text));
  const b = script.map(norm);
  // Needleman–Wunsch alignment on word similarity
  const sim = (x, y) => (x === y ? 2 : x && y && (x.startsWith(y) || y.startsWith(x)) ? 1 : -1);
  const n = a.length;
  const m = b.length;
  const S = Array.from({ length: n + 1 }, () => new Float64Array(m + 1));
  const P = Array.from({ length: n + 1 }, () => new Uint8Array(m + 1));
  for (let i = 1; i <= n; i++) (S[i][0] = -i), (P[i][0] = 1);
  for (let j = 1; j <= m; j++) (S[0][j] = -j), (P[0][j] = 2);
  for (let i = 1; i <= n; i++)
    for (let j = 1; j <= m; j++) {
      const d = S[i - 1][j - 1] + sim(a[i - 1], b[j - 1]);
      const u = S[i - 1][j] - 1;
      const l = S[i][j - 1] - 1;
      [S[i][j], P[i][j]] = d >= u && d >= l ? [d, 0] : u >= l ? [u, 1] : [l, 2];
    }
  // walk back: map each script word to a span of caption timings
  const spans = new Array(m).fill(null);
  let i = n;
  let j = m;
  const pendingCaps = [];
  while (i > 0 || j > 0) {
    const p = i > 0 && j > 0 ? P[i][j] : i > 0 ? 1 : 2;
    if (p === 0) {
      spans[j - 1] = [i - 1, i - 1, ...pendingCaps];
      pendingCaps.length = 0;
      i--;
      j--;
    } else if (p === 1) {
      pendingCaps.push(i - 1); // extra recognised word → merge into the next script word
      i--;
    } else {
      j--; // script word not heard: timed later by interpolation
    }
  }
  const fixed = script.map((w, k) => {
    const s = spans[k];
    if (!s) return { text: w, startMs: NaN, endMs: NaN };
    const idx = s.slice(1).concat([s[0]]);
    return { text: w, startMs: Math.min(...idx.map((x) => captions[x].startMs)), endMs: Math.max(...idx.map((x) => captions[x].endMs)) };
  });
  // fill unmatched words by spreading them between neighbours
  for (let k = 0; k < fixed.length; k++) {
    if (!Number.isNaN(fixed[k].startMs)) continue;
    let e = k;
    while (e < fixed.length && Number.isNaN(fixed[e].startMs)) e++;
    let t0 = k > 0 ? fixed[k - 1].endMs : 0;
    let t1 = e < fixed.length ? fixed[e].startMs : t0 + 400 * (e - k);
    // no gap to fill (unheard word squeezed between neighbours): share the next word's span
    if (t1 - t0 < 120 * (e - k) && e < fixed.length) {
      t1 = fixed[e].endMs;
      const share = (t1 - t0) / (e - k + 1);
      fixed[e].startMs = t0 + share * (e - k);
    } else if (t1 - t0 < 120 * (e - k) && k > 0) {
      t0 = fixed[k - 1].startMs;
      const share = (t1 - t0) / (e - k + 1);
      fixed[k - 1].endMs = t0 + share;
      t0 = fixed[k - 1].endMs;
    }
    const end = e < fixed.length ? Math.min(t1, fixed[e].startMs) : t1;
    const st = (end - t0) / (e - k);
    for (let q = k; q < e; q++) (fixed[q].startMs = t0 + st * (q - k)), (fixed[q].endMs = t0 + st * (q - k + 1));
  }
  // several script words on the same heard word (e.g. "Zheng He" ← "Zenhira"): split that span evenly
  for (let k = 0; k < fixed.length; ) {
    let e = k + 1;
    while (e < fixed.length && fixed[e].startMs === fixed[k].startMs && fixed[e].endMs === fixed[k].endMs) e++;
    if (e - k > 1) {
      const t0 = fixed[k].startMs;
      const step = (fixed[k].endMs - t0) / (e - k);
      for (let q = k; q < e; q++) (fixed[q].startMs = t0 + step * (q - k)), (fixed[q].endMs = t0 + step * (q - k + 1));
    }
    k = e;
  }
  captions = fixed.map((c, k) => ({ text: (k ? " " : "") + c.text, startMs: Math.round(c.startMs), endMs: Math.round(c.endMs), timestampMs: Math.round((c.startMs + c.endMs) / 2), confidence: null }));
  console.log(`aligned to script (${script.length} words)`);
} else {
  captions = captions.map((c, k) => ({ ...c, text: (k ? " " : "") + c.text.trim() }));
}

const dur = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", voice]).toString());
writeFileSync(path.join(dir, "captions.json"), JSON.stringify(captions, null, 1));
writeFileSync(path.join(dir, "voice.json"), JSON.stringify({ durationSec: Math.round(dur * 1000) / 1000, words: captions.length, model }, null, 1));
execFileSync("rm", ["-f", tmp16]);
console.log(`words → public/voice/${ep}/captions.json (${captions.length} words, ${dur.toFixed(2)} s)`);
console.log(captions.map((c) => `${c.text.trim()}@${(c.startMs / 1000).toFixed(2)}`).join(" "));
