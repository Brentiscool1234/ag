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
  "Open with the reader's business problem this service solves (leads, calls, customers).",
  "Open with a direct, plain answer to what the reader is trying to accomplish.",
  "Open with a concrete competitive angle: what the reader loses by not fixing this.",
  "Open with a short, honest question a buyer in this city is actually asking.",
  "Open with a specific, believable outcome this service produces.",
  "Open with a timing or urgency angle relevant to this service.",
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

export const SYSTEM_PROMPT = `You are a senior local-SEO conversion copywriter. You write service-area pages that (1) rank because they are genuinely useful and unique, and (2) convert because they are written for a buyer deciding who to hire, not for an algorithm. You never write generic "city culture" filler, never fabricate proof or a physical location, and never pad to hit a word count. Every sentence must help the reader decide to call this business. You follow Google's guidance: original, expert-led, non-commodity content, accurate real-world business information, and no doorway or scaled-content patterns.`;

function locationLabel(city: string, state: string): string {
  return state ? `${city}, ${state}` : city;
}

function bulletList(items: string[]): string {
  return items.map((i) => `  - ${i}`).join("\n");
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

  // Location honesty: don't invent a physical presence.
  const locationRule = profile.servesRemotely
    ? `The business SERVES ${loc} but is NOT physically located there. NEVER say it is "based in", "located in", or "proud to call ${city} home". Frame it as "serving businesses throughout ${loc} and the surrounding area".`
    : `The business has a real presence serving ${loc}. Still, do not invent a specific street address, and only state location facts you were given.`;

  // Deliverables: use the client's real list if provided, else demand specifics.
  const deliverablesRule = profile.deliverables.length
    ? `Present these concrete deliverables as a clear list, each with one short line of explanation. Use exactly these (do not invent others):\n${bulletList(profile.deliverables)}`
    : `List the concrete, tangible things included in this service (e.g. specific tools, setup steps, or outputs). Be specific to ${profile.industry || service}. Do NOT use vague buzzwords like "great UX", "responsive design", "seamless experience".`;

  // Proof: use real proof if provided, otherwise insert a team placeholder.
  const proofRule = profile.proofPoints.length
    ? `Build a "Recent Work & Results" section from these REAL proof points (present them well, but do not exaggerate or add numbers that aren't here):\n${bulletList(profile.proofPoints)}`
    : `You have NO real proof data for this client. Do NOT invent testimonials, client names, star ratings, awards, years in business, or result numbers. Instead, insert this exact placeholder block so the team fills it before publishing:\n<div class="proof-placeholder"><!-- TEAM: add 1-2 recent ${loc} projects (screenshots), a real client testimonial, and any real results/numbers here before publishing. --><p><em>[Recent ${loc} projects, results, and a client testimonial go here.]</em></p></div>`;

  const differentiatorsRule = profile.differentiators.length
    ? `Base the "Why choose ${profile.name}" section on these real differentiators:\n${bulletList(profile.differentiators)}`
    : `Write "Why choose ${profile.name}" using only real, concrete differentiators from the About text. If you don't have concrete differentiators, keep this section short and honest rather than making claims up.`;

  const pricingSection = profile.pricingInfo
    ? `- Pricing: give pricing a short section using exactly this: "${profile.pricingInfo}". Frame it plainly.`
    : `- Pricing: SKIP this section (no pricing was provided; do not invent prices).`;

  const guaranteeSection = profile.guarantee
    ? `- Guarantee: give this its OWN clearly-headed section and explain it properly (what qualifies, how it's measured, the time period): "${profile.guarantee}".`
    : `- Guarantee: SKIP (none provided; do not invent one).`;

  const industriesLine = profile.industries.length
    ? `Where natural, mention the industries served (${profile.industries.join(", ")}) — this adds real relevance.`
    : "";

  return `Write a conversion-focused, locally-relevant service page for "${service}" targeting ${loc} (${profile.country || "United States"}).
${langBlock}
BUSINESS
- Name: ${profile.name}
- Website: ${profile.website}
- Phone: ${profile.phone}
- Industry: ${profile.industry}
- Serving: ${loc}
- About / positioning: ${profile.description}
- Priority keywords to work in naturally (do not stuff): ${profile.keywords.join(", ") || "(none)"}
${industriesLine ? "- " + industriesLine + "\n" : ""}
TONE: ${TONE_GUIDE[profile.tone]}
OPENING: ${p.archetype}
${avoidBlock}
=== WHAT MAKES THIS PAGE GOOD (read carefully) ===
This page must be written for a buyer choosing who to hire, and it must have a
real reason to exist for ${loc} specifically. It is one of many city pages, so
about 60-70% can be solid core service content, but 30-40% must be genuinely
specific: real local business context, real proof, and city-appropriate detail.

DO NOT DO THESE (they are the classic AI/doorway giveaways and will be rejected):
- NO city-culture filler: no weather, history, "heart of", "vibrant/thriving
  community", tourism copy, or anything a tourism board would write. Local
  relevance means real business/market context and real nearby areas, NOT this.
- NO fabricated proof: no invented testimonials, client names, ratings, awards,
  years in business, or specific result numbers.
- NO fabricated location. ${locationRule}
- NO padding. Write as long as the content genuinely warrants (roughly
  1,000-1,600 words). Cut anything that doesn't help the reader decide.

PAGE STRUCTURE (use clear H2/H3 headings; skip any section marked SKIP):
1. Hook / hero intro: the reader's problem and the business outcome (leads,
   calls, customers), plus a clear call to action with the phone number.
2. "${service}" services: what you actually deliver. ${deliverablesRule}
3. Recent Work & Results (proof). ${proofRule}
4. Why choose ${profile.name}. ${differentiatorsRule}
5. Our process, step by step (consultation -> ... -> launch -> support). Concrete.
${pricingSection}
${guaranteeSection}
6. Areas we serve around ${city}: name 4-6 REAL, well-known towns/suburbs
   adjacent to ${city} in ${profile.state || profile.country}. Only real ones.
   Weave them into natural sentences; do NOT dump an unnatural block of city
   names (that is keyword stuffing).${profile.serviceAreas.length ? ` Prefer these if relevant: ${profile.serviceAreas.join(", ")}.` : ""}
7. FAQ: 6-8 purchase-intent questions with genuinely helpful answers. Include
   commercial ones like cost, redesigning/replacing an existing setup, work for
   ads/landing pages, and what happens after launch. Some should be ${city}-specific.
8. Final call to action with the phone number.

HARD WRITING RULES (checked automatically; violations fail the page):
- NEVER use em dashes (—), en dashes as breaks (–), or "--". Use commas and periods.
- NEVER use any of these words/phrases: ${banned}.
- Short sentences, short paragraphs, plain words, active voice, direct address.
- Must not read identically for another city with the name swapped.

INTERNAL LINKS: weave these in naturally as HTML anchors where they fit (use the
full URLs exactly as given, do not dump them in a list):
${linkList}
${feedbackBlock}
Return ONLY a JSON object (no markdown, no code fences) with exactly these fields:
{
  "title": "SEO title, under 60 chars, lead with ${service} + ${city}, then a short outcome. Example style: '${service} ${city}${profile.state ? ", " + abbrev(profile.state) : ""} | <short outcome>'",
  "metaDescription": "meta description, 140-160 chars, compelling, includes ${city}",
  "h1": "H1 that leads with the service and location, then the outcome. Example style: '${service} ${city}${profile.state ? ", " + abbrev(profile.state) : ""} | <short benefit>'",
  "html": "the full page body as clean semantic HTML using <h2>,<h3>,<p>,<ul>,<li>,<a>. Do NOT include <html>,<head>,<body>, the H1, or the schema.",
  "faqs": [{"question": "...", "answer": "..."}]
}`;
}

// Expansion pass: feed the current (too-short) draft back and ask the model to
// build ON it and make it fuller. Terse models (e.g. gpt-4o in JSON mode)
// lengthen far more reliably by expanding an existing draft than by
// regenerating from scratch.
export function buildExpandPrompt(
  p: GenParams,
  current: { title: string; metaDescription: string; h1: string; html: string; faqs: { question: string; answer: string }[] },
  wordCount: number,
  fixes: string[],
): string {
  const loc = locationLabel(p.city, p.profile.state);
  const banned = [...GLOBAL_BANNED_WORDS, ...p.profile.bannedWordsExtra].join(", ");
  const fixBlock = fixes.length
    ? `\nAlso fix these problems from the current draft:\n${fixes.map((f) => `- ${f}`).join("\n")}\n`
    : "";

  return `Below is a DRAFT service page for "${p.service}" in ${loc}. It is too short at ${wordCount} words and reads thin.

Your job: rewrite it LONGER and more complete, aiming for 1,200-1,600 words. Keep every good, specific sentence that is already there. Do NOT start over or drop content. Make it fuller by:
- Expanding each existing section with more concrete, useful, buyer-focused detail.
- Adding any missing sections: concrete deliverables, a proof/results block, why choose us, a step-by-step process, "areas we serve" with 4-6 REAL towns near ${p.city}, and a solid FAQ of 6-8 purchase-intent questions.
- Making answers and explanations thorough rather than one-liners.

Keep ALL of these rules (they are checked automatically):
- No em dashes (—), en dashes as breaks (–), or "--".
- Never use these words/phrases: ${banned}.
- No city-culture filler (weather, history, "vibrant", tourism copy). No fabricated testimonials, numbers, or physical location.
- Short sentences, plain words, active voice. Must not read identically for another city.
${fixBlock}
CURRENT DRAFT (title: ${current.title}):
${current.html}

Return ONLY a JSON object with the same fields as before:
{"title": "...", "metaDescription": "...", "h1": "...", "html": "the full EXPANDED body, 1,200+ words", "faqs": [{"question":"...","answer":"..."}]}`;
}

// Rough US/CA/AU state abbreviation for titles ("Texas" -> "TX"). Falls back to
// the full name if unknown.
const ABBREV: Record<string, string> = {
  Alabama: "AL", Alaska: "AK", Arizona: "AZ", Arkansas: "AR", California: "CA",
  Colorado: "CO", Connecticut: "CT", Delaware: "DE", "District of Columbia": "DC",
  Florida: "FL", Georgia: "GA", Hawaii: "HI", Idaho: "ID", Illinois: "IL",
  Indiana: "IN", Iowa: "IA", Kansas: "KS", Kentucky: "KY", Louisiana: "LA",
  Maine: "ME", Maryland: "MD", Massachusetts: "MA", Michigan: "MI",
  Minnesota: "MN", Mississippi: "MS", Missouri: "MO", Montana: "MT",
  Nebraska: "NE", Nevada: "NV", "New Hampshire": "NH", "New Jersey": "NJ",
  "New Mexico": "NM", "New York": "NY", "North Carolina": "NC",
  "North Dakota": "ND", Ohio: "OH", Oklahoma: "OK", Oregon: "OR",
  Pennsylvania: "PA", "Rhode Island": "RI", "South Carolina": "SC",
  "South Dakota": "SD", Tennessee: "TN", Texas: "TX", Utah: "UT",
  Vermont: "VT", Virginia: "VA", Washington: "WA", "West Virginia": "WV",
  Wisconsin: "WI", Wyoming: "WY",
};
function abbrev(state: string): string {
  return ABBREV[state] || state;
}
