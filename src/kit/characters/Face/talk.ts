import { random } from "remotion";
import { mixMouth, VISEMES, type MouthParams, type VisemeName } from "./params";

// Talk mode: turn word timings (or loudness) into mouth shapes.

/** One spoken word, times in seconds (matches the word-timestamp JSON from the audio pipeline). */
export type WordTiming = { word: string; start: number; end: number };

const LETTER_VISEME: Record<string, VisemeName> = {
  a: "A",
  i: "A",
  y: "E",
  e: "E",
  o: "O",
  u: "O",
  w: "O",
  q: "O",
  m: "MBP",
  b: "MBP",
  p: "MBP",
  f: "FV",
  v: "FV",
};

/** Letters → viseme sequence, merging repeats and skipping silent-ish letters. */
export const wordToVisemes = (word: string): VisemeName[] => {
  const letters = word.toLowerCase().replace(/[^a-z]/g, "");
  const out: VisemeName[] = [];
  for (const ch of letters) {
    if (ch === "h") continue;
    const v = LETTER_VISEME[ch] ?? "E";
    if (out[out.length - 1] !== v) out.push(v);
  }
  return out.length ? out : ["A"];
};

const smooth = (t: number) => t * t * (3 - 2 * t);

export type TalkState = { mouth: MouthParams; amount: number };

/**
 * Mouth shape at a time (seconds) from word timings.
 * amount = how strongly talking overrides the expression mouth (0 between words).
 */
export const talkFromWords = (words: WordTiming[], time: number): TalkState => {
  const fade = 0.05;
  const w = words.find((x) => time >= x.start - fade && time < x.end + fade);
  if (!w) return { mouth: VISEMES.rest, amount: 0 };
  const seq = wordToVisemes(w.word);
  const dur = Math.max(0.01, w.end - w.start);
  const p = Math.min(0.999, Math.max(0, (time - w.start) / dur));
  const f = p * seq.length;
  const i = Math.floor(f);
  const frac = f - i;
  const cur = VISEMES[seq[i]];
  const next = VISEMES[seq[Math.min(seq.length - 1, i + 1)]];
  // hold each shape ~60%, then glide to the next
  const mouth = frac > 0.6 ? mixMouth(cur, next, smooth((frac - 0.6) / 0.4)) : cur;
  const edge = Math.min(1, (time - (w.start - fade)) / (fade * 2), (w.end + fade - time) / (fade * 2));
  return { mouth, amount: Math.max(0, Math.min(1, edge)) };
};

/**
 * Mouth shape from voice loudness (0..1) — use when only an audio level is available.
 * Cycles open shapes every ~4 frames (seeded), scaled by loudness.
 */
export const talkFromLevel = (level: number, frame: number, seed = "talk"): TalkState => {
  const shapes: VisemeName[] = ["A", "E", "O", "A", "E", "MBP"];
  const step = Math.floor(frame / 4);
  const a = shapes[Math.floor(random(`${seed}-${step}`) * shapes.length)];
  const b = shapes[Math.floor(random(`${seed}-${step + 1}`) * shapes.length)];
  const m = mixMouth(VISEMES[a], VISEMES[b], smooth((frame % 4) / 4));
  const lv = Math.max(0, Math.min(1, level));
  return { mouth: { ...m, open: m.open * (0.35 + 0.65 * lv) }, amount: lv > 0.05 ? 1 : lv * 20 };
};

/** Combine an expression's mouth with a talking shape, keeping the expression's smile/frown. */
export const applyTalk = (base: MouthParams, talk: TalkState | undefined): MouthParams => {
  if (!talk || talk.amount <= 0) return base;
  const spoken: MouthParams = {
    ...talk.mouth,
    curve: talk.mouth.curve * 0.4 + base.curve * 0.6,
    asym: base.asym * 0.5,
    w: talk.mouth.w * 0.7 + base.w * 0.3,
  };
  return mixMouth(base, spoken, talk.amount);
};
