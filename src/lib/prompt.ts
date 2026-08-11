import type { ClientProfile, InternalLink, Tone } from "./types";
import { GLOBAL_BANNED_WORDS } from "./validators";

const TONE_GUIDE: Record<Tone, string> = {
  professional: "polished and credible, like a well-run established company",
  friendly: "warm and approachable, like a helpful neighbor who does great work",
  authoritative: "confident and expert, the obvious specialist in this field",
  conversational: "natural and direct, like talking to a real person",
  "local-downtoearth": "plainspoken and local, no corporate fluff",
};

// Opening archetypes are rotated across sibling pages so pages have genuinely
// different first impressions by design, not by luck.
export const OPENING_ARCHETYPES = [
  "Open with a specific local scenario a customer in this exact city would recognize.",
  "Open with a direct, plain answer to what the reader is trying to accomplish.",
  "Open with a concrete local detail (climate, common local issue, local conditions).",
  "Open with a short, honest question the reader is actually asking themselves.",
  "Open with a specific, believable fact relevant to this service in this area.",
  "Open with a seasonal or timing angle relevant to this service in this city.",
];

export interface GenParams {
  profile: ClientProfile;
  service: string;
  city: string;
  internalLinks: InternalLink[];
  archetype: string;
  feedback?: string[];
  siblingOpenings?: string[];
}

export const SYSTEM_PROMPT = `You are a senior local-SEO copywriter who writes long, detailed service-area pages that rank on Google and read like a real person wrote them for a real local business. You write clear, concrete, genuinely useful copy that would never be flagged as thin or doorway content. You are ruthless about avoiding generic AI filler, and you always write the full requested length. You never stop early or leave a section thin.`;

// Location label: "Austin, Texas" when a state is set, else just the city.
function locationLabel(city: string, state: string): string {
  return state ? `${city}, ${state}` : city;
}

export function buildUserPrompt(p: GenParams): string {
  const { profile, service, city } = p;
  const loc = locationLabel(city, profile.state);
  const language = profile.language || "English";
  const banned = [...GLOBAL_BANNED_WORDS, ...profile.bannedWordsExtra].join(", ");
  const linkList = p.internalLinks
    .map((l) => `- anchor "${l.anchor}" -> ${l.href} (${l.reason})`)
    .join("\n");

  const feedbackBlock = p.feedback?.length
    ? `\n!!! YOUR PREVIOUS DRAFT FAILED THESE CHECKS. Fix EVERY one before returning:\n${p.feedback.map((f) => `- ${f}`).join("\n")}\n`
    : "";

  const avoidBlock = p.siblingOpenings?.length
    ? `\nDo NOT open the page like any of these existing sibling pages:\n${p.siblingOpenings.map((o) => `- "${o}..."`).join("\n")}\n`
    : "";

  const langBlock =
    language.toLowerCase() !== "english"
      ? `\nWRITE THE ENTIRE PAGE IN ${language.toUpperCase()}. Every heading, paragraph, FAQ, title, and meta description must be in ${language}.\n`
      : "";

  return `Write a long, detailed service page for "${service}" targeting ${loc} (${profile.country || "United States"}).
${langBlock}
BUSINESS
- Name: ${profile.name}
- Website: ${profile.website}
- Phone: ${profile.phone}
- Industry: ${profile.industry}
- Location: ${loc}
- About: ${profile.description}
- Service areas / neighborhoods: ${profile.serviceAreas.join(", ") || "(none provided)"}
- Priority keywords to work in naturally (do not stuff): ${profile.keywords.join(", ") || "(none)"}

TONE: ${TONE_GUIDE[profile.tone]}

OPENING: ${p.archetype}
${avoidBlock}
=== LENGTH IS A HARD REQUIREMENT ===
The finished page body MUST be AT LEAST 1,500 words, and should be 1,700-2,200 words.
This is not a suggestion. Short pages are rejected automatically. Write full,
substantive paragraphs, not summaries. Do NOT stop early. If you find yourself
running short, add more genuinely useful, specific detail (real local context,
concrete examples, step-by-step explanation, more FAQ entries). Refer to the
location as "${loc}" throughout.

REQUIRED SECTIONS (each must meet its minimum word count):
1. Intro / hook (at least 120 words) - unique local angle for ${loc}.
2. What "${service}" involves (at least 300 words) - explain it thoroughly and plainly.
3. Why it matters specifically in ${loc} (at least 250 words) - local climate, common
   local problems, local conditions. Must be genuinely specific to ${loc}, not generic.
4. Common problems / signs you need this service (at least 220 words) - concrete,
   with a bulleted list plus explanation around it.
5. Our process, step by step (at least 250 words) - what the customer can expect.
6. Why choose ${profile.name} (at least 180 words) - credentials, differentiators, trust.
7. Service areas / neighborhoods we cover (at least 130 words) - reference real nearby areas.
8. FAQ - 7 to 9 real questions with genuinely helpful answers (at least 450 words total),
   several specific to ${loc}.
9. Short closing with a clear call to action and the phone number (at least 60 words).

HARD WRITING RULES (checked automatically; violations fail the page):
- NEVER use em dashes (—), en dashes used as breaks (–), or "--". Use commas and periods.
- NEVER use any of these AI-tell words or phrases: ${banned}.
- Keep it readable: mostly short sentences, short paragraphs, plain words, active voice,
  direct address ("we fix", "you get"). Being readable and being long are both required.
- Make it genuinely unique to ${loc}. It must not read identically for another city with
  the name swapped.
- Use descriptive H2/H3 subheadings and some bullet lists so it is scannable.

INTERNAL LINKS: weave these in naturally as HTML anchors in the body where they fit
(do not dump them in a list). Use the full URLs exactly as given:
${linkList}
${feedbackBlock}
Return ONLY a JSON object (no markdown, no code fences) with exactly these fields:
{
  "title": "SEO title tag, under 60 chars, includes ${service} and ${city}",
  "metaDescription": "meta description, 140-160 chars, compelling, includes ${city}",
  "h1": "the page H1 heading",
  "html": "the full page body as clean semantic HTML using <h2>,<h3>,<p>,<ul>,<li>,<a>. Do NOT include <html>,<head>,<body>, the H1, or the schema. Include the internal-link anchors inline. This must be the full 1,500+ word body.",
  "faqs": [{"question": "...", "answer": "..."}]
}`;
}
