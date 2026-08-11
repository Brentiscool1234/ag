import type { ClientProfile, InternalLink, Tone } from "./types";
import { GLOBAL_BANNED_WORDS } from "./validators";

const TONE_GUIDE: Record<Tone, string> = {
  professional: "polished and credible, like a well-run established company",
  friendly: "warm and approachable, like a helpful neighbor who does great work",
  authoritative: "confident and expert, the obvious specialist in this field",
  conversational: "natural and direct, like talking to a real person",
  "local-downtoearth": "plainspoken and local, no corporate fluff",
};

// Opening archetypes are rotated across sibling pages so 50 pages have 50
// genuinely different first impressions by design, not by luck.
export const OPENING_ARCHETYPES = [
  "Open with a specific local scenario a homeowner in this exact city would recognize.",
  "Open with a direct, plain answer to what the reader is trying to accomplish.",
  "Open with a concrete local detail (climate, common local issue, local building codes or conditions).",
  "Open with a short, honest question the reader is actually asking themselves.",
  "Open with a specific, believable statistic or fact relevant to this service in this area.",
  "Open with a seasonal or timing angle relevant to this service in this city.",
];

export interface GenParams {
  profile: ClientProfile;
  service: string;
  city: string;
  internalLinks: InternalLink[];
  archetype: string; // one of OPENING_ARCHETYPES
  feedback?: string[]; // failures from a prior attempt to correct
  siblingOpenings?: string[]; // openings to avoid duplicating
}

export const SYSTEM_PROMPT = `You are a senior local-SEO copywriter who writes service-area pages that rank on Google and read like a real person wrote them for a real local business. You write clear, concrete, genuinely useful copy that would never be flagged as thin or doorway content. You are ruthless about avoiding generic AI filler.`;

export function buildUserPrompt(p: GenParams): string {
  const { profile, service, city } = p;
  const banned = [...GLOBAL_BANNED_WORDS, ...profile.bannedWordsExtra].join(", ");
  const linkList = p.internalLinks
    .map((l) => `- anchor "${l.anchor}" -> ${l.href} (${l.reason})`)
    .join("\n");

  const feedbackBlock = p.feedback?.length
    ? `\nYOUR PREVIOUS DRAFT FAILED THESE CHECKS. Fix every one:\n${p.feedback.map((f) => `- ${f}`).join("\n")}\n`
    : "";

  const avoidBlock = p.siblingOpenings?.length
    ? `\nDo NOT open the page like any of these existing sibling pages:\n${p.siblingOpenings.map((o) => `- "${o}..."`).join("\n")}\n`
    : "";

  return `Write a service page for "${service}" targeting the city of "${city}".

BUSINESS
- Name: ${profile.name}
- Website: ${profile.website}
- Phone: ${profile.phone}
- Industry: ${profile.industry}
- About: ${profile.description}
- Service areas / neighborhoods: ${profile.serviceAreas.join(", ") || "(none provided)"}
- Priority keywords to work in naturally (do not stuff): ${profile.keywords.join(", ") || "(none)"}

TONE: ${TONE_GUIDE[profile.tone]}

OPENING: ${p.archetype}
${avoidBlock}
REQUIRED PAGE STRUCTURE (aim for 1,300-1,800 words total, at least 40% of it specific to ${city}):
1. Intro / hook (100-150 words) — unique local angle for ${city}.
2. The service explained (250-350 words).
3. Why it matters specifically in ${city} (200-300 words) — local climate, common local problems, local codes/conditions. This section must be genuinely city-specific, not generic.
4. Our process / what to expect (200-300 words).
5. Service areas / neighborhoods covered (100-150 words) — reference real nearby areas.
6. FAQ — 5 to 7 real questions with helpful answers (300-450 words), some specific to ${city}.
7. Short closing with a clear call to action and the phone number.

HARD WRITING RULES (these are checked automatically and will fail the page):
- NEVER use em dashes (—), en dashes used as breaks (–), or "--". Use commas and periods.
- NEVER use any of these AI-tell words or phrases: ${banned}.
- Write for a 6th-8th grade reading level: short sentences (mostly under 20 words), short paragraphs (2-4 sentences), plain words over fancy ones, active voice, direct address ("we fix", "you get").
- Make it genuinely unique to ${city}. Do not write something that would read identically for another city with the name swapped.
- Use descriptive H2/H3 subheadings and short bullet lists so it is scannable.

INTERNAL LINKS: weave these in naturally as HTML anchors in the body where they fit (do not dump them in a list):
${linkList}
${feedbackBlock}
Return ONLY a JSON object (no markdown, no code fences) with exactly these fields:
{
  "title": "SEO title tag, under 60 chars, includes ${service} and ${city}",
  "metaDescription": "meta description, 140-160 chars, compelling, includes ${city}",
  "h1": "the page H1 heading",
  "html": "the full page body as clean semantic HTML using <h2>,<h3>,<p>,<ul>,<li>,<a>. Do NOT include <html>,<head>,<body>, the H1, or the schema. Include the internal-link anchors inline.",
  "faqs": [{"question": "...", "answer": "..."}]
}`;
}
