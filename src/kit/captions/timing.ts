import type { Caption } from "@remotion/captions";
import type { WordTiming } from "../characters/Face";

// Caption data is Remotion's `Caption` type (what the transcription step outputs).
// These helpers convert to/from the face system's WordTiming and fake timings for previews.

/** Caption[] → WordTiming[] (seconds), for face talk mode. */
export const captionsToWords = (captions: Caption[]): WordTiming[] =>
  captions.map((c) => ({ word: c.text.trim(), start: c.startMs / 1000, end: c.endMs / 1000 }));

/** WordTiming[] → Caption[] (leading space before each word, as Remotion expects). */
export const wordsToCaptions = (words: WordTiming[]): Caption[] =>
  words.map((w, i) => ({
    text: (i === 0 ? "" : " ") + w.word,
    startMs: Math.round(w.start * 1000),
    endMs: Math.round(w.end * 1000),
    timestampMs: Math.round(((w.start + w.end) / 2) * 1000),
    confidence: null,
  }));

/**
 * Estimated narration timings from plain text (≈ 2.7 words/s, longer words take longer,
 * pauses after punctuation). Use until the real voiceover exists.
 */
export const estimateTimings = (text: string, startSec = 0, wordsPerSec = 2.7): WordTiming[] => {
  const words = text.split(/\s+/).filter(Boolean);
  const out: WordTiming[] = [];
  let t = startSec;
  for (const w of words) {
    const letters = w.replace(/[^\p{L}\p{N}]/gu, "").length;
    const dur = (0.55 + Math.min(0.9, letters * 0.075)) / (wordsPerSec / 2.7) / 1.4;
    out.push({ word: w, start: t, end: t + dur });
    t += dur + (/[.!?]$/.test(w) ? 0.42 : /[,;:—–]$/.test(w) ? 0.2 : 0.04);
  }
  return out;
};

/** Mark page breaks after sentence ends and every `maxWords` words. */
export const withPageBreaks = (captions: Caption[], maxWords = 4, maxChars = 22): Caption[] => {
  let count = 0;
  let chars = 0;
  return captions.map((c, i) => {
    count++;
    chars += c.text.trim().length + 1;
    const next = captions[i + 1];
    const nextLen = next ? next.text.trim().length : 0;
    const brk = /[.!?…]$/.test(c.text.trim()) || count >= maxWords || chars + nextLen > maxChars;
    if (brk) {
      count = 0;
      chars = 0;
    }
    return { ...c, pageBreakAfter: brk };
  });
};
