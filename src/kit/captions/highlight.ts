// Which words get a special colour: years/dates and names. Emphasis can be forced with *word* in
// the script (asterisks are stripped from the caption).

export type WordKind = "year" | "name" | "emph" | null;

export const CAPTION_COLORS = {
  text: "#ffffff",
  current: "#ffd23f",
  year: "#5ce1e6",
  name: "#ff9fc4",
  emph: "#ffb347",
  stroke: "#1e1428",
};

const STOP = new Set(["I", "A", "The", "And", "But", "Or", "So", "If", "What", "When", "Then", "This", "That", "It", "In", "On", "At", "Of", "To", "He", "She", "They", "We", "You", "His", "Her", "Their", "Our", "Its", "Now", "Just", "Instead", "Today", "Imagine"]);
const YEAR = /^(~|c\.)?\d{1,4}(s|BC|BCE|AD|CE)?$/i;
const ERA = /^(BC|BCE|AD|CE)$/i;

export const cleanWord = (w: string) => w.replace(/\*/g, "");
const core = (w: string) => w.replace(/^[^\p{L}\p{N}~]+|[^\p{L}\p{N}]+$/gu, "");

/** Classify each word of a page (needs neighbours for "44 BC" and sentence starts). */
export const classify = (words: string[], names: string[] = [], prevEndsSentence = true): WordKind[] => {
  const nameSet = new Set(names.map((n) => n.toLowerCase()));
  return words.map((raw, i) => {
    const w = core(raw);
    if (/^\*.*\*$/.test(raw.trim().replace(/[^\w*]+$/, ""))) return "emph";
    if (YEAR.test(w) && /\d/.test(w)) return "year";
    if (ERA.test(w) && i > 0 && /\d/.test(core(words[i - 1]))) return "year";
    if (nameSet.has(w.toLowerCase())) return "name";
    const sentenceStart = i === 0 ? prevEndsSentence : /[.!?…]$/.test(words[i - 1].trim());
    if (/^\p{Lu}/u.test(w) && !sentenceStart && !STOP.has(w) && w.length > 1) return "name";
    return null;
  });
};
