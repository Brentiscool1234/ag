// Deterministic quality gates. These run AFTER generation; the engine
// regenerates a page whenever a hard gate fails. Never trust the prompt alone
// to enforce these rules — enforce them in code.

// ---------------------------------------------------------------------------
// Text helpers
// ---------------------------------------------------------------------------

export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function words(text: string): string[] {
  const m = text.toLowerCase().match(/[a-z0-9']+/g);
  return m ?? [];
}

export function sentences(text: string): string[] {
  return text
    .split(/[.!?]+(?:\s+|$)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

// ---------------------------------------------------------------------------
// 1. Em dashes (the #1 AI punctuation tell). Guaranteed removable.
// ---------------------------------------------------------------------------

// Em dash U+2014, plus en dash U+2013 used as a sentence break ( – with spaces),
// plus the "--" ASCII stand-in.
const EM_DASH_RE = /\s*—\s*|\s+–\s+|\s*--\s*/g;

export function hasEmDash(text: string): boolean {
  const re = new RegExp(EM_DASH_RE.source, "g");
  return re.test(text);
}

// Safety net if the model slips one through: convert to a comma or period so
// the page never ships an em dash even when a regen would be wasteful.
export function sanitizeEmDashes(text: string): string {
  return text
    .replace(/\s*—\s*/g, ", ")
    .replace(/\s+–\s+/g, ", ")
    .replace(/\s*--\s*/g, ", ")
    // collapse accidental doubled punctuation from the swap
    .replace(/,\s*,/g, ",")
    .replace(/\s+([.,;:])/g, "$1");
}

// ---------------------------------------------------------------------------
// 2. Banned "AI tell" words/phrases. Editable per client.
// ---------------------------------------------------------------------------

export const GLOBAL_BANNED_WORDS: string[] = [
  "unleash", "unlock", "elevate", "delve", "dive in", "dive into",
  "tapestry", "testament", "realm", "seamless", "seamlessly", "robust",
  "in today's fast-paced", "in today's digital age", "when it comes to",
  "look no further", "nestled", "boasts", "bustling", "myriad", "plethora",
  "navigating", "navigate the", "landscape of", "game-changer", "game changer",
  "cutting-edge", "cutting edge", "top-notch", "world-class", "best-in-class",
  "leverage", "synergy", "revolutionize", "revolutionary", "embark",
  "embark on", "journey", "at the end of the day", "rest assured",
  "peace of mind when", "we've got you covered", "second to none",
  "unparalleled", "unrivaled", "ever-evolving", "fast-paced world",
  "moreover", "furthermore", "in conclusion", "it's worth noting",
  "needless to say", "first and foremost",
  // Fake "local flavor" fluff — the biggest AI/doorway giveaway on city pages.
  "in the heart of", "heart of", "rich blend", "rich tapestry", "vibrant",
  "thriving", "hot summers", "mild winters", "proud to call",
  "unique blend", "hustle and bustle", "melting pot", "diverse community",
  "picturesque", "charming", "steeped in", "rich history",
];

export interface BannedHit {
  phrase: string;
  index: number;
}

export function findBannedWords(
  text: string,
  extra: string[] = [],
): BannedHit[] {
  const list = [...GLOBAL_BANNED_WORDS, ...extra.map((w) => w.toLowerCase().trim())].filter(Boolean);
  const lower = text.toLowerCase();
  const hits: BannedHit[] = [];
  for (const phrase of list) {
    // word-boundary-ish match so "realm" doesn't hit "realmonte"
    const re = new RegExp(`(?<![a-z])${escapeRegex(phrase)}(?![a-z])`, "g");
    let m: RegExpExecArray | null;
    while ((m = re.exec(lower)) !== null) {
      hits.push({ phrase, index: m.index });
      if (m.index === re.lastIndex) re.lastIndex++;
    }
  }
  return hits;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ---------------------------------------------------------------------------
// 3. Readability — Flesch Reading Ease + Flesch-Kincaid Grade.
//    Target: reading ease 60-70 (~6th-8th grade). Higher ease = easier.
// ---------------------------------------------------------------------------

export function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 0;
  if (w.length <= 3) return 1;
  let cleaned = w
    .replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "")
    .replace(/^y/, "");
  const groups = cleaned.match(/[aeiouy]{1,2}/g);
  const count = groups ? groups.length : 1;
  return Math.max(1, count);
}

export interface Readability {
  words: number;
  sentences: number;
  syllables: number;
  fleschReadingEase: number;
  fleschKincaidGrade: number;
}

export function readability(text: string): Readability {
  const ws = words(text);
  const ss = sentences(text);
  const wordCount = ws.length || 1;
  const sentCount = ss.length || 1;
  const syllables = ws.reduce((sum, w) => sum + countSyllables(w), 0);
  const wordsPerSentence = wordCount / sentCount;
  const syllablesPerWord = syllables / wordCount;
  const fre = 206.835 - 1.015 * wordsPerSentence - 84.6 * syllablesPerWord;
  const fkg = 0.39 * wordsPerSentence + 11.8 * syllablesPerWord - 15.59;
  return {
    words: wordCount,
    sentences: sentCount,
    syllables,
    fleschReadingEase: round1(fre),
    fleschKincaidGrade: round1(fkg),
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// ---------------------------------------------------------------------------
// 4. Opening fingerprint — no two pages may start the same way.
// ---------------------------------------------------------------------------

export function openingFingerprint(text: string): string {
  const first = words(stripHtml(text)).slice(0, 15).join(" ");
  return first;
}

// Jaccard similarity on the first-N word sets. 1.0 = identical opener.
export function openingSimilarity(a: string, b: string): number {
  const setA = new Set(words(a).slice(0, 12));
  const setB = new Set(words(b).slice(0, 12));
  return jaccard(setA, setB);
}

// ---------------------------------------------------------------------------
// 5. Cross-page uniqueness — body content must differ from sibling pages.
//    Uses word 4-gram (shingle) Jaccard similarity.
// ---------------------------------------------------------------------------

export function shingles(text: string, n = 4): Set<string> {
  const w = words(stripHtml(text));
  const out = new Set<string>();
  for (let i = 0; i + n <= w.length; i++) {
    out.add(w.slice(i, i + n).join(" "));
  }
  return out;
}

export function contentSimilarity(a: string, b: string): number {
  return jaccard(shingles(a), shingles(b));
}

function jaccard<T>(a: Set<T>, b: Set<T>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

// ---------------------------------------------------------------------------
// The gate config + a single evaluator the engine calls.
// ---------------------------------------------------------------------------

export const GATES = {
  // Quality over length. Floor just guards against genuinely thin pages; the
  // prompt is told to write as long as the content warrants and NOT to pad.
  minWords: 900,
  targetWords: 1200,
  maxWords: 2200, // only a soft warning above this
  minReadingEase: 45, // relaxed hard floor (~10th grade); prompt still pushes 60+
  idealReadingEase: 55,
  maxOpeningSimilarity: 0.6,
  maxContentSimilarity: 0.4, // the real anti-doorway guard: bodies must differ
};

export interface GateResult {
  ok: boolean;
  hardFailures: string[]; // require a regenerate
  warnings: string[]; // fixed automatically or acceptable
  wordCount: number;
  reading: Readability;
}

export function evaluatePage(
  html: string,
  opts: {
    bannedWordsExtra?: string[];
    siblingOpenings?: string[]; // openingFingerprints of existing sibling pages
    siblingBodies?: string[]; // html/text of existing sibling pages
    skipReadability?: boolean; // true for non-English pages (Flesch is English-only)
  } = {},
): GateResult {
  const text = stripHtml(html);
  const hardFailures: string[] = [];
  const warnings: string[] = [];

  const wordCount = words(text).length;
  if (wordCount < GATES.minWords)
    hardFailures.push(
      `Page reads thin at ${wordCount} words. Add genuinely useful specifics (concrete deliverables, real process detail, purchase-intent FAQs) to reach roughly ${GATES.targetWords}. Do NOT pad with filler or city-culture fluff.`,
    );
  if (wordCount > GATES.maxWords)
    warnings.push(`${wordCount} words (over ${GATES.maxWords}); consider trimming.`);

  if (hasEmDash(html)) warnings.push("Em dash found; auto-sanitized.");

  const banned = findBannedWords(text, opts.bannedWordsExtra ?? []);
  if (banned.length > 0) {
    const uniq = Array.from(new Set(banned.map((b) => b.phrase)));
    hardFailures.push(`Remove these AI-tell words entirely: ${uniq.join(", ")}.`);
  }

  // Readability is a WARNING, not a hard gate: we don't want to trap a
  // long, useful, unique page in an endless regen just because a technical
  // topic reads a little dense. The prompt still pushes short sentences.
  const reading = readability(text);
  if (!opts.skipReadability && reading.fleschReadingEase < GATES.idealReadingEase)
    warnings.push(
      `Reading ease ${reading.fleschReadingEase} (aim for ${GATES.idealReadingEase}+); shorter sentences would help.`,
    );

  const myOpening = openingFingerprint(html);
  for (const sib of opts.siblingOpenings ?? []) {
    if (openingSimilarity(myOpening, sib) > GATES.maxOpeningSimilarity) {
      hardFailures.push("Opening too similar to an existing page.");
      break;
    }
  }

  for (const sib of opts.siblingBodies ?? []) {
    if (contentSimilarity(html, sib) > GATES.maxContentSimilarity) {
      hardFailures.push("Body too similar to a sibling page (doorway risk).");
      break;
    }
  }

  return {
    ok: hardFailures.length === 0,
    hardFailures,
    warnings,
    wordCount,
    reading,
  };
}
