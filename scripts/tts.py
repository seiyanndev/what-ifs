#!/usr/bin/env python3
"""Script → narration with Kokoro (Apache-2.0, offline neural TTS).

Usage (via npm):  npm run voice -- <episode> [--voice bm_george] [--speed 0.95]
Reads public/voice/<episode>/script.txt, writes public/voice/<episode>/raw.wav (+ .tts marker).

The script is read SENTENCE BY SENTENCE (each gets its own natural rise and fall), and the pauses
between pieces are placed deliberately instead of leaving them to the model:

  ,  ;          short breath inside a sentence (handled by the model)
  .  !          0.36 s
  ?             0.52 s (let the question land); the ending glides UP (--question-lift, default 2.5 semitones
                on short questions, 60% of that on long ones) because the model reads "?" like a statement
  :  —          0.32 s (a beat before the payoff)
  ...           0.70 s suspense pause; the line before it is read a touch slower and left hanging
  [pause]       0.70 s explicit pause    [pause:1.2]  custom length (no spaces)
  blank line    0.80 s between scenes

Script markup (captions keep the written form, the narrator says the spoken form):
  *word*            emphasis (captions only; stripped for speech)
  1519              years read naturally: "fifteen nineteen"; 44 BC → "forty-four B C"
  datu{da-too}     say something different from what's written (no spaces inside the braces)
"""
import argparse
import json
import os
import re
import subprocess
import tempfile
from pathlib import Path

import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

ROOT = Path(__file__).resolve().parent.parent
TTS_VERSION = "5"  # bump when the reading logic changes (invalidates the episode voice cache)

PAUSE = {".": 0.36, "!": 0.36, "?": 0.52, ":": 0.32, "—": 0.32, "...": 0.70, "para": 0.80}

ONES = "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen".split()
TENS = "_ _ twenty thirty forty fifty sixty seventy eighty ninety".split()


def two(n):
    if n < 20:
        return ONES[n]
    t, o = divmod(n, 10)
    return TENS[t] + ("-" + ONES[o] if o else "")


def year(n):
    if 1000 <= n <= 1999 or 2010 <= n <= 2099:
        hi, lo = divmod(n, 100)
        return two(hi) + (" hundred" if lo == 0 else (" oh " + ONES[lo] if lo < 10 else " " + two(lo)))
    if 2000 <= n <= 2009:
        return "two thousand" + ("" if n == 2000 else " " + ONES[n - 2000])
    if n < 100:
        return two(n)
    if n < 1000:
        h, r = divmod(n, 100)
        return ONES[h] + " hundred" + (" " + two(r) if r else "")
    th, r = divmod(n, 1000)
    return ONES[th] + " thousand" + ((" " + year(r)) if r else "")


def speakable(text):
    text = re.sub(r"(\S+?)\{([^}]*)\}", r"\2", text)  # word{spoken} → spoken
    text = text.replace("*", "")
    text = re.sub(r"~\s*(\d)", r"around \1", text)
    text = re.sub(r"\b(\d{1,4})\s*(BC|BCE)\b", lambda m: year(int(m[1])) + " B C", text)
    text = re.sub(r"\b(\d{1,4})\s*(AD|CE)\b", lambda m: year(int(m[1])) + " A D", text)
    text = re.sub(r"\b(AD|CE)\s*(\d{1,4})\b", lambda m: "A D " + year(int(m[2])), text)
    text = re.sub(r"\b(\d{1,4})s\b", lambda m: year(int(m[1])) + "s", text)  # 1500s
    text = re.sub(r"\b(\d{3,4})\b", lambda m: year(int(m[1])), text)
    return text


def pieces(paragraph):
    """Split a paragraph into (text, pause_after, kind) reading units."""
    text = re.sub(r"\s+", " ", paragraph.strip())
    text = text.replace("…", "...")
    # explicit pauses become their own markers
    text = re.sub(r"\[pause(?::([\d.]+))?\]", lambda m: f" ⟨P{m[1] or '0.7'}⟩ ", text)
    out = []
    buf = ""
    i = 0
    tokens = re.split(r"(⟨P[\d.]+⟩|\.\.\.|[.!?](?=\s|$|[\"')])|:(?=\s)|\s—\s)", text)
    for tok in tokens:
        if tok is None or tok == "":
            continue
        m = re.fullmatch(r"⟨P([\d.]+)⟩", tok)
        if m:
            if buf.strip():
                out.append((buf.strip(), float(m[1]), "plain"))
            elif out:
                t, p, k = out[-1]
                out[-1] = (t, p + float(m[1]), k)
            buf = ""
            continue
        if tok == "...":
            out.append((buf.strip() + "...", PAUSE["..."], "hang"))
            buf = ""
        elif tok in (".", "!", "?"):
            out.append((buf.strip() + tok, PAUSE[tok], "question" if tok == "?" else "plain"))
            buf = ""
        elif tok == ":" or tok.strip() == "—":
            out.append((buf.strip() + ":" if tok == ":" else buf.strip() + ",", PAUSE[":"], "lead"))
            buf = ""
        else:
            buf += tok
        i += 1
    if buf.strip():
        out.append((buf.strip(), PAUSE["."], "plain"))
    return [(t, p, k) for t, p, k in out if re.search(r"[A-Za-z0-9]", t)]


def trim(audio, sr, thresh=0.012, keep=0.03):
    """Cut the model's own leading/trailing silence so our pauses are exact."""
    loud = np.where(np.abs(audio) > thresh)[0]
    if not len(loud):
        return audio
    a = max(0, loud[0] - int(keep * sr))
    b = min(len(audio), loud[-1] + int(keep * 1.5 * sr))
    out = audio[a:b].copy()
    f = int(0.008 * sr)
    out[:f] *= np.linspace(0, 1, f)
    out[-f:] *= np.linspace(1, 0, f)
    return out


def lift_question(audio, sr, semitones, start_frac):
    """Kokoro tends to read every '?' with a falling, statement-like ending. Glide the pitch of the
    last part of the question up (Rubber Band via FFmpeg, formants preserved) so it sounds asked."""
    if semitones <= 0:
        return audio
    d = len(audio) / sr
    t0 = d * start_frac
    steps = 8
    cmds = ";".join(f"{t0 + (d - t0) * i / steps:.3f} rubberband pitch {2 ** (semitones * i / steps / 12):.4f}" for i in range(steps + 1))
    with tempfile.TemporaryDirectory() as td:
        src, dst = os.path.join(td, "i.wav"), os.path.join(td, "o.wav")
        sf.write(src, audio, sr)
        subprocess.run(
            ["ffmpeg", "-v", "error", "-y", "-i", src, "-af", f"asendcmd=c='{cmds}',rubberband=pitchq=quality:formant=preserved:transients=smooth", dst],
            check=True,
        )
        out, _ = sf.read(dst, dtype="float32")
    return out[: len(audio)] if len(out) >= len(audio) else np.pad(out, (0, len(audio) - len(out)))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("episode")
    ap.add_argument("--voice", default="bm_george")
    ap.add_argument("--speed", type=float, default=1.08)
    ap.add_argument("--question-lift", type=float, default=2.5, help="semitones of upward glide on short questions (0 = off; longer questions get 60%%)")
    a = ap.parse_args()
    d = ROOT / "public" / "voice" / a.episode
    script = (d / "script.txt").read_text(encoding="utf8").strip()
    k = Kokoro(str(ROOT / "tts-models/kokoro-v1.0.onnx"), str(ROOT / "tts-models/voices-v1.0.bin"))
    lang = "en-gb" if a.voice.startswith("b") else "en-us"

    sr = 24000
    chunks = []
    segments = []  # where each spoken phrase sits in raw.wav — lets `npm run audio` pin captions exactly
    cursor = int(sr * 0.3)  # lead silence below
    paragraphs = [p for p in re.split(r"\n\s*\n", script) if p.strip()]
    for pi, para in enumerate(paragraphs):
        units = pieces(para)
        for ui, (text, pause, kind) in enumerate(units):
            words = len(text.split())
            speed = a.speed
            if kind == "hang":
                speed *= 0.93  # draw out the line before a suspense pause
            elif kind == "question":
                speed *= 0.96
            elif words <= 4:
                speed *= 1.02  # short punchy lines keep their snap
            audio, sr = k.create(speakable(text), voice=a.voice, speed=speed, lang=lang)
            audio = trim(audio, sr)
            if kind == "question" and a.question_lift > 0:
                short = words <= 4
                audio = lift_question(audio, sr, a.question_lift * (1 if short else 0.6), 0.45 if short else 0.72)
            chunks.append(audio)
            segments.append({"start": round(cursor / sr, 4), "end": round((cursor + len(audio)) / sr, 4), "words": [w for w in text.split() if re.search(r"[A-Za-z0-9]", w)]})
            cursor += len(audio)
            last = ui == len(units) - 1
            gap = PAUSE["para"] if (last and pi < len(paragraphs) - 1) else (0 if last else pause)
            if last and pi < len(paragraphs) - 1:
                gap = max(gap, pause)
            if gap:
                chunks.append(np.zeros(int(sr * gap), dtype=np.float32))
                cursor += int(sr * gap)
    lead = np.zeros(int(sr * 0.3), dtype=np.float32)
    tail = np.zeros(int(sr * 0.6), dtype=np.float32)
    audio = np.concatenate([lead, *chunks, tail])
    sf.write(d / "raw.wav", audio, sr)
    (d / "segments.json").write_text(json.dumps(segments, indent=1))
    (d / ".tts").write_text(f"{a.voice} v{TTS_VERSION}")  # tells `npm run audio` to use the studio chain
    print(f"voice {a.voice} → public/voice/{a.episode}/raw.wav ({len(audio) / sr:.1f}s, {sum(len(pieces(p)) for p in paragraphs)} phrases)")


if __name__ == "__main__":
    main()
