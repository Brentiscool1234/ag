// Shared domain types for the SEO page generator.

export type Provider = "anthropic" | "openai";

// An account = the person/team member who uses the dashboard. Each account
// holds its OWN provider choice + API key, so everyone brings their own key.
// (This is the profile real auth will attach to later: user -> account.)
export interface Account {
  id: string;
  name: string;
  provider: Provider;
  anthropicApiKey: string;
  openaiApiKey: string;
  anthropicModel: string; // e.g. claude-opus-5
  openaiModel: string; // e.g. gpt-4o
  createdAt: number;
  updatedAt: number;
}

export const DEFAULT_ANTHROPIC_MODEL = "claude-opus-5";
export const DEFAULT_OPENAI_MODEL = "gpt-4o";

export type Tone =
  | "professional"
  | "friendly"
  | "authoritative"
  | "conversational"
  | "local-downtoearth";

export const TONES: { value: Tone; label: string }[] = [
  { value: "professional", label: "Professional" },
  { value: "friendly", label: "Friendly" },
  { value: "authoritative", label: "Authoritative" },
  { value: "conversational", label: "Conversational" },
  { value: "local-downtoearth", label: "Local / Down-to-earth" },
];

// A reusable client profile. Enter this once per client; every page reuses it,
// so the team never re-types the same context.
export interface ClientProfile {
  id: string;
  name: string; // Business name, e.g. "Lone Star Roofing"
  website: string; // e.g. "https://lonestarroofing.com"
  phone: string;
  industry: string; // e.g. "Roofing"
  description: string; // What the business does, differentiators, credentials.
  country: string; // e.g. "United States"
  language: string; // page language, e.g. "English"
  state: string; // state/province, only for countries that use them (e.g. "Texas")
  tone: Tone;
  services: string[]; // e.g. ["Roof Repair", "Roof Replacement", "Storm Damage"]
  cities: string[]; // target cities, e.g. ["Austin", "Round Rock"]
  keywords: string[]; // priority keywords/phrases to work in naturally
  serviceAreas: string[]; // neighborhoods / nearby areas for local specificity
  bannedWordsExtra: string[]; // per-client additions to the global banned list
  urlPattern: string; // e.g. "/services/{service}/{city}/"

  // Positioning & proof. These make each page unique and trustworthy instead of
  // generic. Provided data is used; missing data is omitted or placeholdered,
  // NEVER fabricated.
  servesRemotely: boolean; // true = serves the city remotely (no physical office there)
  pricingInfo: string; // e.g. "Starting at $2,500" — drives a Pricing section if set
  guarantee: string; // e.g. "5X ROI or money back in 12 months" — its own explained section
  deliverables: string[]; // concrete things every project includes (tangible, not buzzwords)
  differentiators: string[]; // real reasons to choose this business
  industries: string[]; // industries served (adds real relevance/uniqueness)
  proofPoints: string[]; // real results / testimonials / case studies (never invented)

  createdAt: number;
  updatedAt: number;
}

// The result of one generated page.
export interface Page {
  id: string;
  clientId: string;
  service: string;
  city: string;
  slug: string; // predicted URL path
  title: string; // <title> / SEO title
  metaDescription: string;
  h1: string;
  html: string; // full page body HTML (sections)
  schemaJsonLd: string; // JSON-LD block
  internalLinks: InternalLink[];
  wordCount: number;
  fleschReadingEase: number;
  fleschKincaidGrade: number;
  openingFingerprint: string;
  status: "generated" | "failed";
  attempts: number;
  validationNotes: string[]; // what was fixed / any residual warnings
  createdAt: number;
}

export interface InternalLink {
  anchor: string;
  href: string;
  reason: string; // "service hub" | "sibling city" | "related service"
}

// A background generation job (service x city matrix).
export interface Job {
  id: string;
  clientId: string;
  accountId: string; // whose API key this job runs on
  status: "queued" | "running" | "done" | "error";
  total: number;
  completed: number;
  failed: number;
  currentLabel: string; // "Roof Repair in Austin"
  startedAt: number | null;
  finishedAt: number | null;
  etaSeconds: number | null; // estimated seconds remaining
  error: string | null;
  createdAt: number;
}

// A suggested page the client doesn't have yet.
export interface Suggestion {
  service: string;
  city: string;
  slug: string;
  reason: string;
}
