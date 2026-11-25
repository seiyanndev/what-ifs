import { createTikTokStyleCaptions, type Caption } from "@remotion/captions";
import { useMemo } from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { FONT_DISPLAY } from "../look";
import { CAPTION_COLORS as C, classify, cleanWord } from "./highlight";
import { withPageBreaks } from "./timing";

type Props = {
  captions: Caption[];
  /** Words to always colour as names (in addition to auto-detected capitalised words). */
  names?: string[];
  /** Vertical centre of the caption block (0 top … 1 bottom). Lower third by default. */
  y?: number;
  maxWords?: number;
  fontSize?: number;
  /** Offset (ms) added to the clock — e.g. when captions sit inside a later Sequence. */
  offsetMs?: number;
};

/**
 * Word-by-word captions: big bold white text with a thick dark outline in the lower third.
 * The word being spoken turns gold and pops; years and names get their own colours.
 */
export const Captions: React.FC<Props> = ({ captions, names = [], y = 0.74, maxWords = 4, fontSize = 92, offsetMs = 0 }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const nowMs = (frame / fps) * 1000 + offsetMs;

  const pages = useMemo(() => createTikTokStyleCaptions({ captions: withPageBreaks(captions, maxWords), combineTokensWithinMilliseconds: 99999 }).pages, [captions, maxWords]);
  const idx = pages.findIndex((p, i) => nowMs >= p.startMs && (i === pages.length - 1 ? nowMs < p.startMs + p.durationMs + 600 : nowMs < pages[i + 1].startMs));
  if (idx < 0) return null;
  const page = pages[idx];
  const prev = pages[idx - 1];
  const prevEnds = !prev || /[.!?…]$/.test(prev.text.trim());
  const words = page.tokens.map((t) => t.text);
  const kinds = classify(words, names, prevEnds);

  const pageFrame = ((nowMs - page.startMs) / 1000) * fps;
  const enter = spring({ frame: pageFrame, fps, config: { damping: 14, stiffness: 260, mass: 0.5 } });
  const lastEnd = page.tokens[page.tokens.length - 1].toMs;
  const nextStart = pages[idx + 1]?.startMs ?? lastEnd + 600;
  const exit = interpolate(nowMs, [Math.min(nextStart, lastEnd + 500) - 120, Math.min(nextStart, lastEnd + 500)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          left: (width - Math.min(940, width * 0.88)) / 2,
          width: Math.min(940, width * 0.88),
          top: `${y * 100}%`,
          transform: `translateY(-50%) scale(${0.86 + 0.14 * enter})`,
          opacity: 1 - exit,
          textAlign: "center",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          rowGap: fontSize * 0.08,
          fontFamily: FONT_DISPLAY,
          fontSize,
          lineHeight: 1.08,
          textTransform: "uppercase",
          letterSpacing: 1,
        }}
      >
        {page.tokens.map((t, i) => {
          const active = nowMs >= t.fromMs && nowMs < t.toMs;
          const spoken = nowMs >= t.fromMs;
          const kind = kinds[i];
          const color = active ? C.current : kind ? C[kind] : C.text;
          const pop = spring({ frame: ((nowMs - t.fromMs) / 1000) * fps, fps, config: { damping: 10, stiffness: 300, mass: 0.4 } });
          const scale = active ? 1 + 0.12 * (1 - Math.abs(1 - pop)) + 0.04 : 1;
          const text = cleanWord(t.text);
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                margin: `0 ${fontSize * 0.13}px`,
                color,
                WebkitTextStroke: `${fontSize * 0.2}px ${C.stroke}`,
                paintOrder: "stroke",
                textShadow: `0 ${fontSize * 0.08}px 0 ${C.stroke}`,
                transform: `scale(${scale}) translateY(${active ? -4 : 0}px) rotate(${active ? -2 : 0}deg)`,
                opacity: spoken ? 1 : 0.92,
              }}
            >
              {text.trim()}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
