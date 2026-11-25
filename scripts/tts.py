#!/usr/bin/env python3
"""Script → narration with Kokoro (Apache-2.0, offline neural TTS).

Usage (via npm):  npm run voice -- <episode> [--voice bm_george] [--speed 0.95]
Reads public/voice/<episode>/script.txt, writes public/voice/<episode>/raw.wav.

Script markup (captions keep the written form, the narrator says the spoken form):
  *word*            emphasis (captions only; stripped for speech)
  1519              years 1000–1999 are read as "fifteen nineteen"; 44 BC → "forty-four B C"
  Mactan{Mak-tan}   say something different from what's written
  ...               a longer dramatic pause
"""
import re, sys, argparse
from pathlib import Path
import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

ROOT = Path(__file__).resolve().parent.parent
ONES = "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen".split()
TENS = "_ _ twenty thirty forty fifty sixty seventy eighty ninety".split()

def two(n):
    if n < 20: return ONES[n]
    t, o = divmod(n, 10)
    return TENS[t] + ("-" + ONES[o] if o else "")

def year(n):
    if 1000 <= n <= 1999 or 2010 <= n <= 2099:
        hi, lo = divmod(n, 100)
        return two(hi) + (" hundred" if lo == 0 else (" oh " + ONES[lo] if lo < 10 else " " + two(lo)))
    if 2000 <= n <= 2009:
        return "two thousand" + ("" if n == 2000 else " " + ONES[n - 2000])
    if n < 100: return two(n)
    if n < 1000:
        h, r = divmod(n, 100)
        return ONES[h] + " hundred" + (" " + two(r) if r else "")
    th, r = divmod(n, 1000)
    return ONES[th] + " thousand" + ((" " + year(r)) if r else "")

def speakable(text):
    text = re.sub(r"(\S+?)\{([^}]*)\}", r"\2", text)          # word{spoken} → spoken
    text = text.replace("*", "")
    text = re.sub(r"~\s*(\d)", r"around \1", text)
    text = re.sub(r"\b(\d{1,4})\s*(BC|BCE)\b", lambda m: year(int(m[1])) + " B C", text)
    text = re.sub(r"\b(\d{1,4})\s*(AD|CE)\b", lambda m: year(int(m[1])) + " A D", text)
    text = re.sub(r"\b(AD|CE)\s*(\d{1,4})\b", lambda m: "A D " + year(int(m[2])), text)
    text = re.sub(r"\b(\d{1,4})s\b", lambda m: year(int(m[1])) + "s", text)   # 1500s
    text = re.sub(r"\b(\d{3,4})\b", lambda m: year(int(m[1])), text)
    return text

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("episode")
    ap.add_argument("--voice", default="bm_george")
    ap.add_argument("--speed", type=float, default=0.95)
    a = ap.parse_args()
    d = ROOT / "public" / "voice" / a.episode
    script = (d / "script.txt").read_text(encoding="utf8").strip()
    k = Kokoro(str(ROOT / "tts-models/kokoro-v1.0.onnx"), str(ROOT / "tts-models/voices-v1.0.bin"))
    lang = "en-gb" if a.voice.startswith("b") else "en-us"
    # synthesise per paragraph/sentence group so long scripts stay stable; join with natural pauses
    parts = [p.strip() for p in re.split(r"\n\s*\n", script) if p.strip()]
    out, sr = [], 24000
    for i, p in enumerate(parts):
        audio, sr = k.create(speakable(p), voice=a.voice, speed=a.speed, lang=lang)
        out.append(audio)
        if i < len(parts) - 1:
            out.append(np.zeros(int(sr * 0.45), dtype=audio.dtype))
    audio = np.concatenate(out)
    pad = np.zeros(int(sr * 0.25), dtype=audio.dtype)
    sf.write(d / "raw.wav", np.concatenate([pad, audio, pad]), sr)
    (d / ".tts").write_text(a.voice)  # tells `npm run audio` to use the studio chain
    print(f"voice {a.voice} → public/voice/{a.episode}/raw.wav ({len(audio) / sr:.1f}s)")

if __name__ == "__main__":
    main()
