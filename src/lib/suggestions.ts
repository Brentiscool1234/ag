import type { ClientProfile, Page, Suggestion } from "./types";
import { predictUrl } from "./links";

// Suggest new pages so the team doesn't have to keep re-entering the same info.
// The natural expansion of a local-SEO site is the full service x city matrix;
// we surface every combination the client doesn't already have a page for.
export function suggestPages(
  profile: ClientProfile,
  existing: Page[],
): Suggestion[] {
  const have = new Set(existing.map((p) => key(p.service, p.city)));
  const out: Suggestion[] = [];

  for (const service of profile.services) {
    for (const city of profile.cities) {
      if (have.has(key(service, city))) continue;
      out.push({
        service,
        city,
        slug: predictUrl(profile.urlPattern, service, city),
        reason: `Fills the ${service} x ${city} gap in the service-area matrix.`,
      });
    }
  }

  return out;
}

function key(service: string, city: string): string {
  return `${service.toLowerCase()}::${city.toLowerCase()}`;
}
