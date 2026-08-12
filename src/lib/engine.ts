import type { Account, ClientProfile, Page } from "./types";
import { expandRawPage, generateRawPage, type RawPage } from "./providers";
import { OPENING_ARCHETYPES } from "./prompt";
import { buildInternalLinks, predictUrl } from "./links";
import { buildSchemaJsonLd } from "./schema";
import {
  evaluatePage,
  openingFingerprint,
  sanitizeEmDashes,
  readability,
  stripHtml,
  words,
} from "./validators";
import { randomUUID } from "crypto";

const MAX_ATTEMPTS = 4;

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
  const english = (profile.language || "English").toLowerCase().startsWith("en");
  const params = {
    profile,
    service,
    city,
    internalLinks,
    archetype: OPENING_ARCHETYPES[0],
    siblingOpenings: ctx.siblingOpenings,
  };

  const evaluate = (html: string) =>
    evaluatePage(html, {
      bannedWordsExtra: profile.bannedWordsExtra,
      siblingOpenings: ctx.siblingOpenings,
      siblingBodies: ctx.siblingBodies,
      skipReadability: !english,
    });

  const validationNotes: string[] = [];
  let best: RawPage | null = null; // longest passing-ish draft, kept as fallback
  let bestWords = -1;
  let raw: RawPage | null = null;
  let lastFailures: string[] = [];

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (attempt === 1) {
      raw = await generateRawPage(account, { ...params, archetype: OPENING_ARCHETYPES[0] });
    } else {
      // Every retry EXPANDS the running draft (fix issues + make it longer),
      // rather than regenerating short from scratch.
      const wc = words(stripHtml(raw!.html)).length;
      raw = await expandRawPage(account, params, raw!, wc, lastFailures);
    }

    // Deterministic safety net: strip any em dash the model slipped through.
    raw.html = sanitizeEmDashes(raw.html);
    raw.title = sanitizeEmDashes(raw.title);
    raw.metaDescription = sanitizeEmDashes(raw.metaDescription);

    const result = evaluate(raw.html);
    const wc = result.wordCount;

    // Track the fullest draft as a fallback if we never fully pass.
    if (wc > bestWords) {
      best = raw;
      bestWords = wc;
    }

    if (result.ok) {
      return assemblePage(profile, service, city, slug, raw, internalLinks, [
        ...validationNotes,
        ...result.warnings,
      ]);
    }

    validationNotes.push(`Attempt ${attempt} (${wc} words): ${result.hardFailures.join(" ")}`);
    lastFailures = result.hardFailures;
  }

  // Exhausted attempts: ship the fullest draft, flagged so the team reviews it.
  const page = assemblePage(profile, service, city, slug, best!, internalLinks, validationNotes);
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
