#!/usr/bin/env node
// Voice pipeline for an episode:
//   1. clean   public/voice/<ep>/raw.(wav|mp3|m4a)  → public/voice/<ep>/voice.wav
//              studio chain for the generated narrator (no denoise: tone EQ, presence + air, gentle comp),
//              mic chain for real recordings (+ light denoise/de-ess); trim silence; -14 LUFS, true-peak -1 dB.
//              Auto-picks studio when `npm run voice` made raw.wav; force with --studio / --mic.
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
  // "studio": already-clean source (the Kokoro narrator) — never denoise/de-ess it, that's what made
  //           it sound boxed-in. "mic": real recordings get a light denoise + de-ess first.
  const studio = args.includes("--studio") || (!args.includes("--mic") && existsSync(path.join(dir, ".tts")));
  const tone = [
    "aresample=48000:resampler=soxr:precision=28", // clean resample (TTS is 24 kHz)
    "highpass=f=70",
    "equalizer=f=280:t=q:w=1.1:g=-2.5", // less boxy / "in a cupboard"
    "equalizer=f=3800:t=q:w=1.0:g=2.5", // presence: clear, close, sharp
    "highshelf=f=8000:g=3", // air
    "aexciter=amount=0.6:drive=3:freq=7000:ceil=18000", // restore top-end sparkle above the 12 kHz TTS ceiling
  ];
  const cleanup = studio ? [] : ["afftdn=nf=-40", "deesser=i=0.25"];
  const chain = [
    ...cleanup,
    ...tone,
    "acompressor=threshold=-18dB:ratio=2:attack=15:release=150:makeup=2", // gentle, keeps it natural
    // Studio (narrator): trim ONLY the very start/end — the pauses were placed on purpose by tts.py.
    // Mic: also shorten long hesitations to 0.6 s (stop_silence keeps 0.6 s instead of deleting the pause).
    studio
      ? "silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.1,areverse,silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.35,areverse"
      : "silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.1:stop_periods=-1:stop_duration=0.9:stop_threshold=-50dB:stop_silence=0.6",
    "loudnorm=I=-14:TP=-1:LRA=11", // streaming loudness target
  ].join(",");
  console.log(`cleaning (${studio ? "studio: narrator" : "mic: recording"} chain)`);
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

// Whisper works in 30 s windows and its word times drift (even pile up at the file end) on longer
// narrations. So: cut the voice at natural pauses into chunks of at most ~24 s, transcribe each one,
// and offset the timings back. Cuts happen in the middle of silences, never inside a word.
const totalSec = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", tmp16]).toString());
const silences = [...execFileSync("sh", ["-c", `ffmpeg -hide_banner -i "${tmp16}" -af silencedetect=noise=-40dB:d=0.3 -f null - 2>&1 || true`], { encoding: "utf8" }).matchAll(/silence_start: ([\d.]+)[\s\S]*?silence_end: ([\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
const quiet = silences.map(([a, b]) => (a + b) / 2);
const MAX_CHUNK = 24;
const cuts = [0];
for (const q of quiet) {
  if (q - cuts[cuts.length - 1] > MAX_CHUNK * 0.6 && q < totalSec - 2) {
    // take the last pause that still keeps the chunk under MAX_CHUNK
    const next = quiet.find((x) => x > q && x - cuts[cuts.length - 1] <= MAX_CHUNK);
    if (!next || q - cuts[cuts.length - 1] >= MAX_CHUNK * 0.9) cuts.push(q);
  }
}
cuts.push(totalSec);
let captions = [];
for (let i = 0; i < cuts.length - 1; i++) {
  const a = cuts[i];
  const b = cuts[i + 1];
  const part = path.join(dir, `.chunk${i}.wav`);
  ff("-ss", String(a), "-to", String(b), "-i", tmp16, "-c:a", "pcm_s16le", part);
  const out = await transcribe({ inputPath: part, whisperPath: WHISPER, whisperCppVersion: "1.5.5", model, tokenLevelTimestamps: true, splitOnWord: true, printOutput: false });
  const offset = Math.round(a * 1000);
  const limit = Math.round(b * 1000);
  for (const c of toCaptions({ whisperCppOutput: out }).captions) {
    if (!c.text.trim()) continue;
    captions.push({ ...c, startMs: Math.min(limit, c.startMs + offset), endMs: Math.min(limit, c.endMs + offset), timestampMs: c.timestampMs === null ? null : Math.min(limit, c.timestampMs + offset) });
  }
  execFileSync("rm", ["-f", part]);
}
if (cuts.length > 2) console.log(`transcribed in ${cuts.length - 1} chunks (cut at pauses: ${cuts.slice(1, -1).map((c) => c.toFixed(1) + "s").join(", ")})`);

// ---------------------------------------------------------------------------
// 3. Fix spelling against the script (keeps whisper's timings, uses the script's words)
// ---------------------------------------------------------------------------
const scriptFile = opt("script");
if (scriptFile) {
  // word{spoken} → caption shows "word" (the narrator said the spoken form)
  const script = readFileSync(scriptFile, "utf8")
    .replace(/\[pause(?::[\d.]+)?\]/g, " ") // pause markers are not words
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.replace(/\{[^}]*\}/g, ""));
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
// Narrator (Kokoro) voices come with segments.json: the exact time of every spoken phrase in raw.wav.
// Pin each caption word inside its phrase; Whisper only decides the pacing *within* a phrase. This fixes
// words that Whisper hears on the wrong side of a pause (e.g. a scene's first word in the previous scene).
let pinned = false;
{
  const segFile = path.join(dir, "segments.json");
  const rawFile = existsSync(dir) ? readdirSync(dir).find((f) => /^raw\.(wav|mp3|m4a|flac|ogg|aac)$/i.test(f)) : undefined;
  if (scriptFile && rawFile && existsSync(segFile) && existsSync(path.join(dir, ".tts"))) {
    const segs = JSON.parse(readFileSync(segFile, "utf8"));
    const alnum = (w) => /[A-Za-z0-9]/.test(w);
    const spoken = captions.filter((c) => alnum(c.text)).length;
    const planned = segs.reduce((n, sg) => n + sg.words.length, 0);
    if (spoken === planned) {
      // raw.wav → voice.wav: the cleanup trims the lead-in silence; measure that shift
      const firstSound = (f) => {
        const out = execFileSync("sh", ["-c", `ffmpeg -hide_banner -i "${f}" -af silencedetect=noise=-50dB:d=0.02 -t 3 -f null - 2>&1 || true`], { encoding: "utf8" });
        const st = out.match(/silence_start: ([\d.e-]+)/);
        const en = out.match(/silence_end: ([\d.]+)/);
        return st && Number(st[1]) < 0.01 && en ? Number(en[1]) : 0;
      };
      const shift = firstSound(path.join(dir, rawFile)) - firstSound(voice);
      const owner = new Array(captions.length).fill(-1);
      let si = 0;
      let k = 0;
      for (let i = 0; i < captions.length; i++) {
        if (!alnum(captions[i].text)) continue;
        while (si < segs.length && k >= segs[si].words.length) {
          si++;
          k = 0;
        }
        owner[i] = si;
        k++;
      }
      segs.forEach((sg, s) => {
        const idx = owner.map((o, i) => (o === s ? i : -1)).filter((i) => i >= 0);
        if (!idx.length) return;
        const a = (sg.start - shift) * 1000;
        const b = (sg.end - shift) * 1000;
        const dur = idx.map((i) => Math.min(900, Math.max(80, captions[i].endMs - captions[i].startMs)));
        const gap = idx.slice(0, -1).map((i, n) => Math.min(250, Math.max(0, captions[idx[n + 1]].startMs - captions[i].endMs)));
        const total = dur.reduce((x, y) => x + y, 0) + gap.reduce((x, y) => x + y, 0);
        const f = (b - a) / Math.max(1, total);
        let t = a;
        idx.forEach((i, n) => {
          captions[i].startMs = t;
          t += dur[n] * f;
          captions[i].endMs = t;
          if (n < gap.length) t += gap[n] * f;
        });
      });
      // punctuation-only tokens sit at the end of the word before them
      for (let i = 0; i < captions.length; i++) if (owner[i] < 0 && i) captions[i].startMs = captions[i].endMs = captions[i - 1].endMs;
      for (const w of captions) {
        w.startMs = Math.round(w.startMs);
        w.endMs = Math.round(w.endMs);
        w.timestampMs = Math.round((w.startMs + w.endMs) / 2);
      }
      pinned = true;
      console.log(`pinned words to ${segs.length} narrator phrases (shift ${shift.toFixed(3)} s)`);
    } else console.log(`segments.json does not match the script (${planned} vs ${spoken} words); using pause snapping`);
  }
}

// No word may run into a real pause. Whisper stretches the last words of a chunk (and sometimes of a
// sentence) across the following silence, which makes the next caption and mouth start late. For every
// detected pause, squeeze the words before it to end where the speech stops, and the words after it
// to start where the speech resumes (rescaling the run of words since/until the neighbouring pause).
if (!pinned) {
  const P = silences.map(([a, b]) => [a * 1000, b * 1000]);
  const rescale = (from, to, a0, a1, b0, b1) => {
    const f = (x) => b0 + ((x - a0) / Math.max(1, a1 - a0)) * (b1 - b0);
    for (let i = from; i <= to; i++) {
      captions[i].startMs = f(captions[i].startMs);
      captions[i].endMs = f(captions[i].endMs);
    }
  };
  let snapped = 0;
  for (let p = 0; p < P.length; p++) {
    const [S, E] = P[p];
    const mid = (S + E) / 2;
    const prevEnd = p ? P[p - 1][1] : 0;
    const nextStart = p + 1 < P.length ? P[p + 1][0] : Infinity;
    const k = captions.findLastIndex((w) => (w.startMs + w.endMs) / 2 < mid);
    if (k >= 0 && captions[k].endMs > S + 40) {
      let i0 = k;
      while (i0 > 0 && captions[i0 - 1].startMs >= prevEnd) i0--;
      const a0 = Math.min(captions[i0].startMs, S - 60 * (k - i0 + 1));
      rescale(i0, k, a0, captions[k].endMs, a0, S);
      snapped++;
    }
    const j = k + 1;
    if (j < captions.length && captions[j].startMs < E - 40) {
      let m = j;
      while (m + 1 < captions.length && captions[m + 1].startMs < nextStart) m++;
      const b1 = Math.max(captions[m].endMs, E + 60 * (m - j + 1));
      rescale(j, m, captions[j].startMs, captions[m].endMs, E, b1);
      snapped++;
    }
  }
  for (const w of captions) {
    w.startMs = Math.round(w.startMs);
    w.endMs = Math.round(w.endMs);
    w.timestampMs = Math.round((w.startMs + w.endMs) / 2);
  }
  if (snapped) console.log(`snapped ${snapped} word run(s) to the pauses`);
}
// give every word at least ~90 ms (Whisper sometimes times tiny words at 20 ms; captions would only flash)
for (let i = 0; i < captions.length; i++) {
  const w = captions[i];
  const next = captions[i + 1];
  if (w.endMs - w.startMs >= 90) continue;
  const want = w.startMs + 90;
  const room = next ? Math.max(w.endMs, Math.min(want, next.endMs - 90)) : want;
  w.endMs = Math.max(w.endMs, room);
  if (next && next.startMs < w.endMs) next.startMs = w.endMs;
  w.timestampMs = Math.round((w.startMs + w.endMs) / 2);
}
writeFileSync(path.join(dir, "captions.json"), JSON.stringify(captions, null, 1));
writeFileSync(path.join(dir, "voice.json"), JSON.stringify({ durationSec: Math.round(dur * 1000) / 1000, words: captions.length, model }, null, 1));
execFileSync("rm", ["-f", tmp16]);
console.log(`words → public/voice/${ep}/captions.json (${captions.length} words, ${dur.toFixed(2)} s)`);
console.log(captions.map((c) => `${c.text.trim()}@${(c.startMs / 1000).toFixed(2)}`).join(" "));
