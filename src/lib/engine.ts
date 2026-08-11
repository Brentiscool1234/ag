import type { Account, ClientProfile, Page } from "./types";
import { generateRawPage } from "./providers";
import { OPENING_ARCHETYPES } from "./prompt";
import { buildInternalLinks, predictUrl } from "./links";
import { buildSchemaJsonLd } from "./schema";
import {
  evaluatePage,
  openingFingerprint,
  sanitizeEmDashes,
  readability,
  stripHtml,
} from "./validators";
import { randomUUID } from "crypto";

const MAX_ATTEMPTS = 3;

export interface GenerateContext {
  // Openings + bodies of pages already generated for this client, so each new
  // page is checked for uniqueness against its siblings.
  siblingOpenings: string[];
  siblingBodies: string[];
}

// Generate one page for a service/city, running the full validate->regenerate
// loop. Returns a Page whether it ultimately passed or exhausted attempts.
export async function generatePage(
  account: Account,
  profile: ClientProfile,
  service: string,
  city: string,
  ctx: GenerateContext,
): Promise<Page> {
  const slug = predictUrl(profile.urlPattern, service, city);
  const internalLinks = buildInternalLinks(profile, service, city);
  const validationNotes: string[] = [];

  let feedback: string[] = [];
  let lastRaw: Awaited<ReturnType<typeof generateRawPage>> | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    // Rotate the opening archetype each attempt so a regen genuinely differs.
    const archetype = OPENING_ARCHETYPES[(attempt - 1) % OPENING_ARCHETYPES.length];

    const raw = await generateRawPage(account, {
      profile,
      service,
      city,
      internalLinks,
      archetype,
      feedback: feedback.length ? feedback : undefined,
      siblingOpenings: ctx.siblingOpenings,
    });
    lastRaw = raw;

    // Deterministic safety net: strip any em dash the model slipped through.
    raw.html = sanitizeEmDashes(raw.html);
    raw.title = sanitizeEmDashes(raw.title);
    raw.metaDescription = sanitizeEmDashes(raw.metaDescription);

    const english = (profile.language || "English").toLowerCase().startsWith("en");
    const result = evaluatePage(raw.html, {
      bannedWordsExtra: profile.bannedWordsExtra,
      siblingOpenings: ctx.siblingOpenings,
      siblingBodies: ctx.siblingBodies,
      skipReadability: !english,
    });

    if (result.ok) {
      const page = assemblePage(profile, service, city, slug, raw, internalLinks, [
        ...validationNotes,
        ...result.warnings,
      ]);
      return page;
    }

    validationNotes.push(`Attempt ${attempt} failed: ${result.hardFailures.join(" ")}`);
    feedback = result.hardFailures;
  }

  // Exhausted attempts: ship the best-effort last draft, flagged as failed so
  // the team can review it rather than silently publishing.
  const raw = lastRaw!;
  const page = assemblePage(profile, service, city, slug, raw, internalLinks, validationNotes);
  page.status = "failed";
  page.attempts = MAX_ATTEMPTS;
  return page;
}

function assemblePage(
  profile: ClientProfile,
  service: string,
  city: string,
  slug: string,
  raw: Awaited<ReturnType<typeof generateRawPage>>,
  internalLinks: Page["internalLinks"],
  notes: string[],
): Page {
  const schemaJsonLd = buildSchemaJsonLd(profile, service, city, slug, raw.faqs);
  const text = stripHtml(raw.html);
  const read = readability(text);
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  return {
    id: randomUUID(),
    clientId: profile.id,
    service,
    city,
    slug,
    title: raw.title,
    metaDescription: raw.metaDescription,
    h1: raw.h1,
    html: raw.html,
    schemaJsonLd,
    internalLinks,
    wordCount,
    fleschReadingEase: read.fleschReadingEase,
    fleschKincaidGrade: read.fleschKincaidGrade,
    openingFingerprint: openingFingerprint(raw.html),
    status: "generated",
    attempts: 1,
    validationNotes: notes,
    createdAt: Date.now(),
  };
}
