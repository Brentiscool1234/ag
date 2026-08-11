import type { ClientProfile } from "./types";
import { joinUrl } from "./links";

// Build valid JSON-LD schema for a service page: a Service node wired to the
// LocalBusiness provider, plus an FAQPage node from the page's Q&As.
// This is what most cheap competitors skip — and it's what earns rich results.

export interface FaqPair {
  question: string;
  answer: string;
}

export function buildSchemaJsonLd(
  profile: ClientProfile,
  service: string,
  city: string,
  slug: string,
  faqs: FaqPair[],
): string {
  const pageUrl = joinUrl(profile.website, slug);

  const localBusiness = {
    "@type": "LocalBusiness",
    name: profile.name,
    url: profile.website,
    telephone: profile.phone || undefined,
    areaServed: profile.cities.map((c) => ({ "@type": "City", name: c })),
  };

  const serviceNode = {
    "@type": "Service",
    serviceType: service,
    name: `${service} in ${city}`,
    url: pageUrl,
    areaServed: { "@type": "City", name: city },
    provider: localBusiness,
  };

  const graph: Record<string, unknown>[] = [serviceNode];

  if (faqs.length > 0) {
    graph.push({
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer },
      })),
    });
  }

  const doc = {
    "@context": "https://schema.org",
    "@graph": graph,
  };

  return JSON.stringify(doc, null, 2);
}

// Wrap JSON-LD in the <script> tag ready to paste into a page <head>.
export function schemaScriptTag(jsonLd: string): string {
  return `<script type="application/ld+json">\n${jsonLd}\n</script>`;
}
