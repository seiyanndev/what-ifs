#!/usr/bin/env node
// Generates the kit's sound effects and music loops in pure code (no samples, no licences needed).
// Deterministic: same seed → same files. Output: public/sfx/*.wav, public/music/*.wav (44.1 kHz, 16-bit stereo).
//
//   node scripts/gen-sounds.mjs            # everything
//   node scripts/gen-sounds.mjs sfx        # only sound effects
//   node scripts/gen-sounds.mjs music      # only music loops

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SR = 44100;
const ROOT = new URL("..", import.meta.url).pathname;

// ---------------------------------------------------------------------------
// DSP toolkit
// ---------------------------------------------------------------------------
const mulberry32 = (a) => () => {
  a |= 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const TAU = Math.PI * 2;
const buf = (sec) => [new Float32Array(Math.ceil(sec * SR)), new Float32Array(Math.ceil(sec * SR))];
const midi = (n) => 440 * 2 ** ((n - 69) / 12);

/** RBJ biquad. */
class Biquad {
  constructor(type, freq, q = 0.707) {
    this.type = type;
    this.x1 = this.x2 = this.y1 = this.y2 = 0;
    this.set(freq, q);
  }
  set(freq, q = this.q) {
    this.q = q;
    const w = (TAU * Math.min(freq, SR * 0.45)) / SR;
    const cos = Math.cos(w);
    const alpha = Math.sin(w) / (2 * q);
    let b0, b1, b2;
    if (this.type === "lp") [b0, b1, b2] = [(1 - cos) / 2, 1 - cos, (1 - cos) / 2];
    else if (this.type === "hp") [b0, b1, b2] = [(1 + cos) / 2, -(1 + cos), (1 + cos) / 2];
    else [b0, b1, b2] = [alpha, 0, -alpha]; // bandpass
    const a0 = 1 + alpha;
    this.b0 = b0 / a0;
    this.b1 = b1 / a0;
    this.b2 = b2 / a0;
    this.a1 = (-2 * cos) / a0;
    this.a2 = (1 - alpha) / a0;
  }
  run(x) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1;
    this.x1 = x;
    this.y2 = this.y1;
    this.y1 = y;
    return y;
  }
}

/** Small Schroeder reverb (stereo), applied in place. */
const reverb = ([L, R], mix = 0.25, size = 1, damp = 0.4) => {
  const combs = [1557, 1617, 1491, 1422, 1277, 1356].map((d) => Math.round(d * size));
  const aps = [225, 556, 441];
  const proc = (inp, spread) => {
    const out = new Float32Array(inp.length);
    const cs = combs.map((d) => ({ b: new Float32Array(d + spread), i: 0, f: 0 }));
    const as = aps.map((d) => ({ b: new Float32Array(d + spread), i: 0 }));
    for (let n = 0; n < inp.length; n++) {
      let s = 0;
      for (const c of cs) {
        const y = c.b[c.i];
        c.f = y * (1 - damp) + c.f * damp;
        c.b[c.i] = inp[n] * 0.015 + c.f * 0.84;
        c.i = (c.i + 1) % c.b.length;
        s += y;
      }
      for (const a of as) {
        const y = a.b[a.i];
        a.b[a.i] = s + y * 0.5;
        s = y - s * 0.5;
        a.i = (a.i + 1) % a.b.length;
      }
      out[n] = s;
    }
    return out;
  };
  const wl = proc(L, 0);
  const wr = proc(R, 23);
  for (let n = 0; n < L.length; n++) {
    L[n] = L[n] * (1 - mix * 0.5) + wl[n] * mix * 3;
    R[n] = R[n] * (1 - mix * 0.5) + wr[n] * mix * 3;
  }
};

const normalize = ([L, R], peak = 0.89) => {
  let m = 1e-9;
  for (let i = 0; i < L.length; i++) m = Math.max(m, Math.abs(L[i]), Math.abs(R[i]));
  const g = peak / m;
  for (let i = 0; i < L.length; i++) {
    L[i] *= g;
    R[i] *= g;
  }
};
const fadeEdges = ([L, R], inSec = 0.003, outSec = 0.05) => {
  const fi = Math.floor(inSec * SR);
  const fo = Math.floor(outSec * SR);
  for (let i = 0; i < fi; i++) {
    L[i] *= i / fi;
    R[i] *= i / fi;
  }
  for (let i = 0; i < fo; i++) {
    const k = L.length - 1 - i;
    L[k] *= i / fo;
    R[k] *= i / fo;
  }
};
/** Add a mono signal fn(t, i) into the stereo buffer at offset with pan (-1..1). */
const add = ([L, R], start, sec, fn, pan = 0, gain = 1) => {
  const s0 = Math.floor(start * SR);
  const n = Math.floor(sec * SR);
  const gl = Math.cos(((pan + 1) * Math.PI) / 4) * gain;
  const gr = Math.sin(((pan + 1) * Math.PI) / 4) * gain;
  for (let i = 0; i < n && s0 + i < L.length; i++) {
    if (s0 + i < 0) continue;
    const v = fn(i / SR, i);
    L[s0 + i] += v * gl;
    R[s0 + i] += v * gr;
  }
};
const env = (t, a, d) => (t < a ? t / a : Math.exp(-(t - a) / d));
const saw = (ph) => 2 * (ph - Math.floor(ph + 0.5));
const tri = (ph) => 1 - 4 * Math.abs(ph - Math.floor(ph + 0.5));

const writeWav = (path, [L, R]) => {
  const n = L.length;
  const data = Buffer.alloc(44 + n * 4);
  data.write("RIFF", 0);
  data.writeUInt32LE(36 + n * 4, 4);
  data.write("WAVEfmt ", 8);
  data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20);
  data.writeUInt16LE(2, 22);
  data.writeUInt32LE(SR, 24);
  data.writeUInt32LE(SR * 4, 28);
  data.writeUInt16LE(4, 32);
  data.writeUInt16LE(16, 34);
  data.write("data", 36);
  data.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i])) * 32767), 44 + i * 4);
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i])) * 32767), 46 + i * 4);
  }
  writeFileSync(path, data);
};

// ---------------------------------------------------------------------------
// Instruments (shared by SFX + music)
// ---------------------------------------------------------------------------
const noiseGen = (seed) => {
  const r = mulberry32(seed);
  return () => r() * 2 - 1;
};

/** Pitched drum: sine with pitch drop + noise click. */
const drum = (b, at, { f0 = 90, f1 = 50, decay = 0.35, noise = 0.3, pan = 0, gain = 1, seed = 1, len = 1.2 }) => {
  const nz = noiseGen(seed);
  const lp = new Biquad("lp", 1800);
  let ph = 0;
  add(
    b,
    at,
    len,
    (t) => {
      const f = f1 + (f0 - f1) * Math.exp(-t * 18);
      ph += f / SR;
      return Math.sin(TAU * ph) * env(t, 0.002, decay) + lp.run(nz()) * noise * env(t, 0.001, 0.04);
    },
    pan,
    gain,
  );
};

/** Detuned-saw ensemble note (strings / brass / pads). */
const ensemble = (b, at, dur, note, { voices = 5, detune = 0.12, cutoff = 1400, attack = 0.25, release = 0.6, vibrato = 0.004, pan = 0, gain = 0.15, brass = false, seed = 2 }) => {
  const r = mulberry32(seed + note * 31);
  const f = midi(note);
  const phases = Array.from({ length: voices }, () => r());
  const dets = Array.from({ length: voices }, (_, i) => 1 + ((i - (voices - 1) / 2) / voices) * detune * 0.06);
  const lp = new Biquad("lp", cutoff, 0.8);
  const total = dur + release;
  add(
    b,
    at,
    total,
    (t) => {
      const vib = 1 + Math.sin(TAU * 5.2 * t) * vibrato * Math.min(1, t * 2);
      let s = 0;
      for (let v = 0; v < voices; v++) {
        phases[v] += (f * dets[v] * vib) / SR;
        s += saw(phases[v]);
      }
      const a = t < attack ? t / attack : t < dur ? 1 : Math.max(0, 1 - (t - dur) / release);
      if (brass) lp.set(cutoff * (0.4 + 0.8 * Math.min(1, t / 0.08)) * (t < dur ? 1 : 0.6));
      return lp.run(s / voices) * a;
    },
    pan,
    gain,
  );
};

/** Bell / celesta / pluck (additive, inharmonic partial option). */
const bell = (b, at, note, { decay = 1.6, partials = [1, 2.0, 3.01, 4.2], amps = [1, 0.4, 0.2, 0.1], pan = 0, gain = 0.2, len = 3 }) => {
  const f = midi(note);
  add(
    b,
    at,
    len,
    (t) => {
      let s = 0;
      for (let k = 0; k < partials.length; k++) s += Math.sin(TAU * f * partials[k] * t) * amps[k] * Math.exp(-t * (k + 1) / decay);
      return s * env(t, 0.003, 10);
    },
    pan,
    gain,
  );
};

// ---------------------------------------------------------------------------
// SOUND EFFECTS
// ---------------------------------------------------------------------------
const SFX = {
  stamp_slam: () => {
    const b = buf(1.4);
    drum(b, 0, { f0: 140, f1: 45, decay: 0.22, noise: 0.9, gain: 1.1, len: 1.2 });
    const nz = noiseGen(3);
    const bp = new Biquad("bp", 1600, 1.2);
    add(b, 0, 0.12, (t) => bp.run(nz()) * env(t, 0.001, 0.02) * 1.6);
    reverb(b, 0.18, 0.6);
    return b;
  },
  whoosh: () => {
    const b = buf(1.1);
    const nz = noiseGen(5);
    const bp = new Biquad("bp", 400, 1.4);
    for (const [pan0, pan1] of [[-0.8, 0.8]]) {
      add(b, 0, 1.0, (t) => {
        const u = t / 1.0;
        bp.set(300 + 2800 * Math.sin(Math.PI * u) ** 1.5);
        return bp.run(nz()) * Math.sin(Math.PI * u) ** 2 * 2.2;
      }, (pan0 + pan1) / 2);
    }
    // pan sweep
    const [L, R] = b;
    for (let i = 0; i < L.length; i++) {
      const p = i / L.length;
      const m = (L[i] + R[i]) / 2;
      L[i] = m * (1 - p) * 1.4;
      R[i] = m * p * 1.4;
    }
    return b;
  },
  ripple: () => {
    const b = buf(2.4);
    const nz = noiseGen(8);
    const bp = new Biquad("bp", 600, 3);
    add(b, 0, 1.6, (t) => {
      bp.set(500 + 3500 * (t / 1.6) ** 1.6);
      return bp.run(nz()) * Math.sin((Math.PI * t) / 1.6) * 0.9;
    });
    [72, 76, 79, 83, 86, 91].forEach((n, i) => bell(b, 0.1 + i * 0.12, n, { decay: 1.2, gain: 0.16, pan: (i % 2 ? 1 : -1) * 0.5 }));
    reverb(b, 0.45, 1.1);
    return b;
  },
  war_drum: () => {
    const b = buf(2.2);
    drum(b, 0, { f0: 110, f1: 52, decay: 0.55, noise: 0.5, gain: 1.2, len: 2 });
    reverb(b, 0.35, 1.2, 0.5);
    return b;
  },
  clash: () => {
    const b = buf(1.6);
    const parts = [523, 1380, 2210, 3170, 4400, 5730];
    add(b, 0, 1.5, (t) => parts.reduce((s, f, k) => s + Math.sin(TAU * f * t + k) * Math.exp(-t * (3 + k * 1.5)) / (k + 1), 0) * env(t, 0.001, 9) * 0.9, 0.2);
    const nz = noiseGen(11);
    const hp = new Biquad("hp", 3000);
    add(b, 0, 0.1, (t) => hp.run(nz()) * env(t, 0.0005, 0.02) * 1.2, -0.2);
    reverb(b, 0.25, 0.8);
    return b;
  },
  waves: () => loopRender(8, (b) => {
    const nz = noiseGen(13);
    let brown = 0;
    const lp = new Biquad("lp", 900);
    add(b, 0, 17.5, (t) => {
      brown = brown * 0.985 + nz() * 0.15;
      const swell = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin((TAU * t) / 8 - 1.2)) ** 2;
      lp.set(400 + 1400 * swell);
      return lp.run(brown) * swell * 1.6;
    });
  }, 1.5),
  gong: () => {
    const b = buf(5);
    const parts = [[110, 1], [111.3, 0.8], [237, 0.6], [311, 0.45], [442, 0.35], [596, 0.25], [811, 0.15]];
    add(b, 0, 5, (t) => parts.reduce((s, [f, a], k) => s + Math.sin(TAU * f * t) * a * Math.exp(-t / (3.2 - k * 0.3)), 0) * Math.min(1, t / 0.04 + 0.4) * 0.35);
    reverb(b, 0.3, 1.3, 0.3);
    return b;
  },
  crowd_cheer: () => {
    const b = buf(3.2);
    const r = mulberry32(21);
    for (let v = 0; v < 46; v++) {
      const nz = noiseGen(100 + v);
      const bp = new Biquad("bp", 500 + r() * 2200, 4 + r() * 4);
      const start = r() * 0.5;
      const rate = 3 + r() * 6;
      add(b, start, 2.6, (t) => bp.run(nz()) * (0.6 + 0.4 * Math.sin(TAU * rate * t)) * Math.sin(Math.PI * Math.min(1, t / 2.6)) ** 0.7 * 1.2, r() * 2 - 1, 0.5);
    }
    for (let c = 0; c < 60; c++) {
      const nz = noiseGen(500 + c);
      const hp = new Biquad("hp", 1200);
      add(b, 0.3 + r() * 2.2, 0.06, (t) => hp.run(nz()) * env(t, 0.001, 0.012), r() * 2 - 1, 0.35);
    }
    reverb(b, 0.3, 1.2);
    return b;
  },
  rumble: () => {
    const b = buf(3.5);
    const nz = noiseGen(31);
    let brown = 0;
    const lp = new Biquad("lp", 140);
    add(b, 0, 3.5, (t) => {
      brown = brown * 0.99 + nz() * 0.1;
      const sw = Math.sin((Math.PI * t) / 3.5) ** 0.8;
      return (lp.run(brown) * 6 + Math.sin(TAU * 38 * t) * 0.4) * sw;
    });
    return b;
  },
  impact: () => {
    const b = buf(3.2);
    drum(b, 0, { f0: 90, f1: 28, decay: 0.9, noise: 1.2, gain: 1.3, len: 3 });
    const nz = noiseGen(41);
    const lp = new Biquad("lp", 4000);
    add(b, 0, 2.6, (t) => {
      lp.set(4000 * Math.exp(-t * 2.5) + 120);
      return Math.tanh(lp.run(nz()) * 2.5 * env(t, 0.002, 0.45));
    });
    reverb(b, 0.4, 1.4, 0.5);
    return b;
  },
  crackle: () => loopRender(4, (b) => {
    const r = mulberry32(51);
    const nz = noiseGen(52);
    const lp = new Biquad("lp", 600);
    add(b, 0, 8.5, () => lp.run(nz()) * 0.25);
    for (let i = 0; i < 150; i++) {
      const bp = new Biquad("bp", 1500 + r() * 4000, 2);
      const nz2 = noiseGen(600 + i);
      add(b, r() * 8.5, 0.03, (t) => bp.run(nz2()) * env(t, 0.0005, 0.004 + r() * 0.006) * (0.6 + r()), r() * 1.4 - 0.7);
    }
  }, 0.5),
  coins: () => {
    const b = buf(1.4);
    const r = mulberry32(61);
    for (let i = 0; i < 7; i++) {
      const f = 2800 + r() * 2600;
      add(b, i * 0.07 + r() * 0.05, 0.9, (t) => (Math.sin(TAU * f * t) + 0.5 * Math.sin(TAU * f * 1.48 * t)) * Math.exp(-t * 9) * 0.4, r() * 1.2 - 0.6);
    }
    reverb(b, 0.2, 0.6);
    return b;
  },
  page_flip: () => {
    const b = buf(0.5);
    const nz = noiseGen(71);
    const bp = new Biquad("bp", 2500, 0.8);
    const r = mulberry32(72);
    add(b, 0, 0.4, (t) => bp.run(nz()) * Math.sin((Math.PI * t) / 0.4) ** 1.5 * (0.6 + 0.4 * (r() > 0.85 ? 1 : 0)) * 1.4);
    return b;
  },
  pop: () => {
    const b = buf(0.3);
    let ph = 0;
    add(b, 0, 0.25, (t) => {
      ph += (300 + 900 * Math.exp(-t * 40)) / SR;
      return Math.sin(TAU * ph) * env(t, 0.002, 0.05);
    });
    return b;
  },
  /** Epic horn: a long, low brass call (Roman cornu) with a rising second note and a hall tail. */
  horn: () => {
    const b = buf(4.2);
    ensemble(b, 0, 1.3, 43, { brass: true, voices: 4, attack: 0.18, release: 0.5, cutoff: 1800, vibrato: 0.004, gain: 0.42, seed: 91 });
    ensemble(b, 0, 1.3, 31, { brass: true, voices: 3, attack: 0.22, release: 0.5, cutoff: 900, gain: 0.3, seed: 92 });
    ensemble(b, 1.25, 1.9, 50, { brass: true, voices: 4, attack: 0.12, release: 0.9, cutoff: 2200, vibrato: 0.005, gain: 0.42, seed: 93 });
    ensemble(b, 1.25, 1.9, 38, { brass: true, voices: 3, attack: 0.15, release: 0.9, cutoff: 1000, gain: 0.3, seed: 94 });
    drum(b, 1.25, { f0: 90, f1: 45, decay: 0.8, noise: 0.3, gain: 0.7, len: 2, seed: 95 });
    reverb(b, 0.45, 1.5, 0.35);
    return b;
  },
  /** Steam hiss (seamless 4 s loop): pressurised hiss with puffs. */
  steam: () =>
    loopRender(
      4,
      (b) => {
        const nz = noiseGen(101);
        const hp = new Biquad("hp", 2500);
        const bp = new Biquad("bp", 5500, 0.9);
        add(b, 0, 9, (t) => {
          const puff = 0.55 + 0.45 * Math.max(0, Math.sin(TAU * 1.5 * t)) ** 3;
          const x = nz();
          return (hp.run(x) * 0.5 + bp.run(x) * 0.9) * puff;
        });
      },
      0.5,
    ),
  /** Final hit: a cinematic stinger (sub boom + orchestral stab + cymbal). */
  hit: () => {
    const b = buf(3.4);
    drum(b, 0, { f0: 70, f1: 30, decay: 1.1, noise: 0.8, gain: 1.2, len: 3, seed: 111 });
    [38, 45, 50, 57, 62].forEach((n, i) => ensemble(b, 0, 0.22, n, { brass: true, attack: 0.005, release: 0.6, cutoff: 3000, gain: 0.16, pan: (i - 2) * 0.3, seed: 112 + i }));
    const nz = noiseGen(118);
    const hp = new Biquad("hp", 4000);
    add(b, 0, 2.8, (t) => hp.run(nz()) * Math.exp(-t * 1.6) * 0.5);
    reverb(b, 0.4, 1.5, 0.4);
    return b;
  },
  /** Eerie choir: a slow "aah" cluster (diminished, drifting) with breath, washed in a big hall reverb. */
  choir: () => {
    const b = buf(7.5);
    const voice = (note, at, dur, pan, seed, gain) => {
      const f = midi(note);
      const rnd = mulberry32(seed);
      const det = [0, 0.006, -0.007, 0.011].map((d) => d + (rnd() - 0.5) * 0.004);
      const f1 = new Biquad("bp", 780, 3.2);
      const f2 = new Biquad("bp", 1150, 4);
      const f3 = new Biquad("bp", 2600, 5);
      const nz = noiseGen(seed + 7);
      add(
        b,
        at,
        dur,
        (t) => {
          const vib = 1 + 0.006 * Math.sin(TAU * 5.1 * t + seed) * Math.min(1, t / 1.5);
          let x = 0;
          for (const d of det) x += saw(f * (1 + d) * vib * t);
          x = x / det.length + nz() * 0.08;
          const e = Math.min(1, t / 1.6) * Math.min(1, (dur - t) / 1.4);
          return (f1.run(x) * 1.0 + f2.run(x) * 0.6 + f3.run(x) * 0.18) * e * gain;
        },
        pan,
      );
    };
    voice(45, 0, 7.2, -0.5, 301, 0.9);
    voice(57, 0.2, 7.0, 0.4, 302, 0.75);
    voice(60, 0.6, 6.6, -0.2, 303, 0.65);
    voice(63, 1.4, 5.8, 0.55, 304, 0.6);
    voice(62, 3.8, 3.4, -0.6, 305, 0.45);
    reverb(b, 0.55, 1.8, 0.5);
    return b;
  },
  /** Synth + horn: modern saw-pad arpeggio under a heroic horn call ("Rome, but futuristic"). */
  synth_horn: () => {
    const b = buf(5.2);
    const arp = [57, 60, 64, 69, 64, 60];
    for (let i = 0; i < 24; i++) {
      const n = arp[i % arp.length];
      const f = midi(n + 12);
      const lp = new Biquad("lp", 2400, 2);
      add(b, i * 0.15, 0.4, (t) => lp.run(saw(f * t) * 0.6 + saw(f * 1.005 * t) * 0.4) * Math.exp(-t * 7) * 0.32, (i % 2 ? 1 : -1) * 0.4);
    }
    [45, 52, 57, 60].forEach((n, i) => ensemble(b, 0, 3.6, n, { voices: 5, attack: 0.6, release: 1.2, cutoff: 1500, gain: 0.07, pan: (i - 1.5) * 0.4, seed: 120 + i }));
    ensemble(b, 1.2, 0.8, 57, { brass: true, attack: 0.1, release: 0.4, cutoff: 2200, gain: 0.3, seed: 125 });
    ensemble(b, 2.0, 1.8, 64, { brass: true, attack: 0.1, release: 0.9, cutoff: 2400, vibrato: 0.005, gain: 0.32, seed: 126 });
    drum(b, 0, { f0: 120, f1: 50, decay: 0.35, noise: 0.2, gain: 0.7, seed: 127 });
    drum(b, 2.0, { f0: 120, f1: 50, decay: 0.35, noise: 0.2, gain: 0.7, seed: 128 });
    reverb(b, 0.35, 1.3, 0.4);
    return b;
  },
  /** Royal brass fanfare: two rising calls then a held major chord with a timpani roll. */
  fanfare: () => {
    const b = buf(3.6);
    const call = [[67, 0], [72, 0.16], [76, 0.32], [79, 0.48]];
    call.forEach(([n, t]) => ensemble(b, t, 0.14, n, { brass: true, attack: 0.02, release: 0.1, cutoff: 3200, gain: 0.32, seed: 41 }));
    call.forEach(([n, t]) => ensemble(b, 0.75 + t * 0.8, 0.12, n + 2, { brass: true, attack: 0.02, release: 0.1, cutoff: 3200, gain: 0.3, seed: 42 }));
    [60, 64, 67, 72, 76].forEach((n, i) => ensemble(b, 1.45, 1.4, n, { brass: true, attack: 0.04, release: 0.7, cutoff: 3000, gain: 0.2, pan: (i - 2) * 0.3, seed: 43 }));
    for (let i = 0; i < 10; i++) drum(b, 1.0 + i * 0.045, { f0: 120, f1: 80, decay: 0.12, noise: 0.25, gain: 0.25 + i * 0.03, seed: 50 + i });
    drum(b, 1.45, { f0: 110, f1: 55, decay: 0.7, noise: 0.3, gain: 0.9, seed: 60 });
    reverb(b, 0.3, 1.3, 0.4);
    return b;
  },
  /** Soft wind (seamless 8 s loop): band-passed noise with slow gusts. */
  wind: () =>
    loopRender(
      8,
      (b) => {
        const nz = noiseGen(71);
        const nz2 = noiseGen(72);
        const bp = new Biquad("bp", 500, 0.8);
        const bp2 = new Biquad("bp", 900, 1.2);
        add(b, 0, 17.5, (t) => {
          const g = 0.45 + 0.35 * Math.sin((TAU * t) / 5.3) + 0.2 * Math.sin((TAU * t) / 2.1 + 1);
          bp.set(380 + 380 * g);
          bp2.set(700 + 600 * g);
          return (bp.run(nz()) * 1.4 + bp2.run(nz2()) * 0.6) * g;
        }, -0.3);
        reverb(b, 0.3, 1.2, 0.5);
      },
      1.5,
    ),
  /** Epic swell: rising orchestral crescendo (strings + cymbal roll) into a hit. */
  swell: () => {
    const b = buf(4.2);
    [48, 55, 60, 64, 67].forEach((n, i) =>
      ensemble(b, 0, 2.6, n, { attack: 2.4, release: 0.9, cutoff: 2600, vibrato: 0.006, gain: 0.13, pan: (i - 2) * 0.35, seed: 80 + i }),
    );
    const nz = noiseGen(81);
    const hp = new Biquad("hp", 3500);
    add(b, 0, 2.7, (t) => hp.run(nz()) * (t / 2.7) ** 2.5 * 0.9);
    drum(b, 2.6, { f0: 100, f1: 45, decay: 0.9, noise: 0.6, gain: 1, len: 1.6, seed: 82 });
    reverb(b, 0.35, 1.4, 0.4);
    return b;
  },
  sparkle: () => {
    const b = buf(1.6);
    [84, 88, 91, 96, 100].forEach((n, i) => bell(b, i * 0.06, n, { decay: 0.8, gain: 0.14, pan: (i - 2) * 0.3 }));
    reverb(b, 0.35, 0.9);
    return b;
  },
};

/**
 * Render a seamless loop: synthesise 2× length and keep the 2nd half (periodic music: reverb
 * tails wrap naturally). For non-periodic noise beds pass `xfade` seconds: the audio just past
 * the loop end is crossfaded into the start so the seam is continuous.
 */
function loopRender(sec, draw, xfade = 0) {
  const big = buf(sec * 2 + xfade);
  draw(big);
  const n = Math.floor(sec * SR);
  const out = [big[0].slice(n, 2 * n), big[1].slice(n, 2 * n)];
  const x = Math.floor(xfade * SR);
  for (let c = 0; c < 2; c++)
    for (let i = 0; i < x; i++) {
      const w = i / x;
      out[c][i] = out[c][i] * w + big[c][2 * n + i] * (1 - w);
    }
  return out;
}

// ---------------------------------------------------------------------------
// MUSIC LOOPS (8 bars each, seamless)
// ---------------------------------------------------------------------------
const chordNotes = (root, minor) => [root, root + (minor ? 3 : 4), root + 7];

const MUSIC = {
  /** D minor, 100 bpm — war drums, string ostinato, brass swells. */
  epic_tense: () => {
    const bpm = 100;
    const beat = 60 / bpm;
    const bar = beat * 4;
    const len = bar * 8;
    return loopRender(len, (b) => {
      const prog = [[50, true], [46, false], [48, false], [45, false]]; // Dm Bb C A
      for (let rep = 0; rep < 4; rep++) {
        prog.forEach(([root, minor], k) => {
          const t0 = rep * bar * 4 + k * bar;
          // brass / string pad
          chordNotes(root, minor).forEach((n, i) => ensemble(b, t0, bar * 0.95, n + 12, { attack: 0.4, release: 0.5, cutoff: 1300, gain: 0.07, pan: (i - 1) * 0.5, seed: 3 }));
          // low string ostinato 8ths
          for (let e = 0; e < 8; e++) {
            const n = root - 12 + ([0, 0, 3, 0, 7, 0, 3, 0][e] ?? 0) - (minor ? 0 : 0);
            ensemble(b, t0 + e * beat * 0.5, beat * 0.42, n, { voices: 3, attack: 0.01, release: 0.08, cutoff: 900, gain: 0.11, seed: 4 });
          }
          // drums: big on 1 & 3, toms on the "and"s of 4
          drum(b, t0, { f0: 110, f1: 48, decay: 0.45, noise: 0.5, gain: 0.85, seed: 9 + k });
          drum(b, t0 + beat * 2, { f0: 105, f1: 50, decay: 0.4, noise: 0.5, gain: 0.7, seed: 10 + k });
          [3, 3.5, 3.75].forEach((x, j) => drum(b, t0 + beat * x, { f0: 180 - j * 20, f1: 90, decay: 0.15, noise: 0.35, gain: 0.35, pan: j * 0.4 - 0.4, seed: 20 + j }));
        });
      }
      reverb(b, 0.22, 1.2, 0.45);
    });
  },
  /** A minor-ish, 80 bpm — soft pad, celesta arpeggios, low drone. */
  mysterious: () => {
    const beat = 60 / 80;
    const bar = beat * 4;
    const len = bar * 8;
    return loopRender(len, (b) => {
      const prog = [[57, true], [53, false], [55, false], [52, true]]; // Am F G Em
      for (let rep = 0; rep < 4; rep++) {
        prog.forEach(([root, minor], k) => {
          const t0 = rep * bar * 4 + k * bar;
          chordNotes(root, minor).forEach((n, i) => ensemble(b, t0, bar, n, { voices: 4, attack: 1.2, release: 1.4, cutoff: 900, vibrato: 0.002, gain: 0.06, pan: (i - 1) * 0.6, seed: 5 }));
          const arp = [...chordNotes(root + 12, minor), root + 24];
          for (let e = 0; e < 8; e++) bell(b, t0 + e * beat * 0.5, arp[(e * 3 + k) % arp.length] + (e % 4 === 3 ? 2 : 0), { decay: 1.4, gain: 0.07, pan: Math.sin(e) * 0.6, partials: [1, 4.0, 2.7], amps: [1, 0.25, 0.15] });
          ensemble(b, t0, bar, root - 24, { voices: 2, attack: 0.8, release: 1, cutoff: 300, gain: 0.12, seed: 6 });
        });
      }
      reverb(b, 0.45, 1.4, 0.35);
    });
  },
  /** E minor, 66 bpm — slow strings with a simple high melody. */
  sad_strings: () => {
    const beat = 60 / 66;
    const bar = beat * 4;
    const len = bar * 8;
    return loopRender(len, (b) => {
      const prog = [[52, true], [48, false], [55, false], [50, false]]; // Em C G D
      const melody = [71, 69, 67, 66, 67, 64, 66, 62];
      for (let rep = 0; rep < 4; rep++) {
        prog.forEach(([root, minor], k) => {
          const t0 = rep * bar * 4 + k * bar;
          chordNotes(root, minor).forEach((n, i) => ensemble(b, t0, bar, n, { voices: 6, attack: 0.9, release: 1.2, cutoff: 1500, vibrato: 0.006, gain: 0.07, pan: (i - 1) * 0.5, seed: 7 }));
          ensemble(b, t0, bar, root - 12, { voices: 4, attack: 0.6, release: 1, cutoff: 700, gain: 0.08, seed: 8 });
          const m = melody[((rep % 2) * 4 + k) % melody.length];
          ensemble(b, t0 + beat * 0.5, bar * 0.8, m, { voices: 3, attack: 0.5, release: 0.9, cutoff: 2400, vibrato: 0.008, gain: 0.07, pan: 0.1, seed: 9 });
        });
      }
      reverb(b, 0.5, 1.5, 0.3);
    });
  },
  /** C major, 112 bpm — brass stabs, timpani, bright plucks. */
  triumphant: () => {
    const beat = 60 / 112;
    const bar = beat * 4;
    const len = bar * 8;
    return loopRender(len, (b) => {
      const prog = [[48, false], [55, false], [57, true], [53, false]]; // C G Am F
      for (let rep = 0; rep < 4; rep++) {
        prog.forEach(([root, minor], k) => {
          const t0 = rep * bar * 4 + k * bar;
          chordNotes(root + 12, minor).forEach((n, i) => {
            ensemble(b, t0, beat * 1.4, n, { brass: true, attack: 0.03, release: 0.25, cutoff: 2600, gain: 0.08, pan: (i - 1) * 0.4, seed: 11 });
            ensemble(b, t0 + beat * 2.5, beat * 1.2, n, { brass: true, attack: 0.03, release: 0.25, cutoff: 2400, gain: 0.07, pan: (i - 1) * 0.4, seed: 12 });
          });
          ensemble(b, t0, bar, root - 12, { voices: 3, attack: 0.05, release: 0.3, cutoff: 600, gain: 0.13, seed: 13 });
          for (let e = 0; e < 8; e++) bell(b, t0 + e * beat * 0.5, chordNotes(root + 24, minor)[e % 3], { decay: 0.5, gain: 0.05, pan: e % 2 ? 0.5 : -0.5, partials: [1, 2, 3], amps: [1, 0.3, 0.1] });
          drum(b, t0, { f0: 130, f1: 70, decay: 0.5, noise: 0.25, gain: 0.7, seed: 30 + k });
          drum(b, t0 + beat * 2, { f0: 120, f1: 65, decay: 0.45, noise: 0.25, gain: 0.55, seed: 31 + k });
          drum(b, t0 + beat * 3.5, { f0: 200, f1: 120, decay: 0.12, noise: 0.6, gain: 0.3, seed: 32 + k });
        });
      }
      reverb(b, 0.25, 1.2, 0.45);
    });
  },
};

// ---------------------------------------------------------------------------
const what = process.argv[2] ?? "all";
const out = (dir) => {
  const p = join(ROOT, "public", dir);
  mkdirSync(p, { recursive: true });
  return p;
};
if (what === "all" || what === "sfx") {
  const dir = out("sfx");
  for (const [name, make] of Object.entries(SFX)) {
    const b = make();
    normalize(b, 0.9);
    if (name !== "waves" && name !== "crackle") fadeEdges(b);
    writeWav(join(dir, `${name}.wav`), b);
    console.log(`sfx    ${name}.wav  ${(b[0].length / SR).toFixed(2)}s`);
  }
}
if (what === "all" || what === "music") {
  const dir = out("music");
  for (const [name, make] of Object.entries(MUSIC)) {
    const b = make();
    normalize(b, 0.8);
    writeWav(join(dir, `${name}.wav`), b);
    console.log(`music  ${name}.wav  ${(b[0].length / SR).toFixed(2)}s (seamless loop)`);
  }
}
