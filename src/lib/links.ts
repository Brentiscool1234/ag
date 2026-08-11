import type { ClientProfile, InternalLink, Page } from "./types";

// Turn a service/city into a URL-safe slug segment.
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Build the predicted URL path from the client's urlPattern template.
// Supports {service} and {city} tokens. Falls back to a sane default.
export function predictUrl(
  pattern: string,
  service: string,
  city: string,
): string {
  const tpl = pattern && pattern.includes("{") ? pattern : "/services/{service}/{city}/";
  let out = tpl
    .replace(/\{service\}/g, slugify(service))
    .replace(/\{city\}/g, slugify(city));
  if (!out.startsWith("/")) out = "/" + out;
  return out;
}

// Silo internal-linking: each city page links UP to the service hub, ACROSS to
// a couple of sibling city pages, and OVER to a related service in the same
// city. This is the structure Google rewards — not random links.
export function buildInternalLinks(
  profile: ClientProfile,
  service: string,
  city: string,
): InternalLink[] {
  const links: InternalLink[] = [];

  // 1. Up to the service hub.
  links.push({
    anchor: `${service} services`,
    href: predictServiceHub(profile.urlPattern, service),
    reason: "service hub",
  });

  // 2. Across to sibling cities (same service, up to 3 others).
  const otherCities = profile.cities.filter((c) => c !== city).slice(0, 3);
  for (const other of otherCities) {
    links.push({
      anchor: `${service} in ${other}`,
      href: predictUrl(profile.urlPattern, service, other),
      reason: "sibling city",
    });
  }

  // 3. Over to a related service in the same city (up to 2).
  const otherServices = profile.services.filter((s) => s !== service).slice(0, 2);
  for (const other of otherServices) {
    links.push({
      anchor: `${other} in ${city}`,
      href: predictUrl(profile.urlPattern, other, city),
      reason: "related service",
    });
  }

  return links;
}

// The service hub is the pattern with the {city} segment removed.
function predictServiceHub(pattern: string, service: string): string {
  const tpl = pattern && pattern.includes("{") ? pattern : "/services/{service}/{city}/";
  let out = tpl
    .replace(/\{service\}/g, slugify(service))
    .replace(/\/?\{city\}\/?/g, "/");
  if (!out.startsWith("/")) out = "/" + out;
  return out.replace(/\/{2,}/g, "/");
}

// The build plan the client follows: one predicted URL per line.
export function buildUrlsTxt(profile: ClientProfile, pages: Page[]): string {
  const header = [
    `# URL build plan for ${profile.name}`,
    `# Base: ${profile.website}`,
    `# Create each page at the path below. Generated ${new Date().toISOString()}`,
    "",
  ];
  const lines = pages.map((p) => joinUrl(profile.website, p.slug));
  return header.concat(lines).join("\n") + "\n";
}

// A minimal sitemap.xml for the generated pages.
export function buildSitemap(profile: ClientProfile, pages: Page[]): string {
  const urls = pages
    .map(
      (p) =>
        `  <url>\n    <loc>${escapeXml(joinUrl(profile.website, p.slug))}</loc>\n    <changefreq>monthly</changefreq>\n  </url>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export function joinUrl(base: string, path: string): string {
  const b = base.replace(/\/+$/, "");
  const p = path.startsWith("/") ? path : "/" + path;
  return b + p;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
