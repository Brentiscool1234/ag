import type { ClientProfile, Page } from "./types";
import { schemaScriptTag } from "./schema";

// Assemble a full, ready-to-publish HTML document for one page: SEO title +
// meta description + JSON-LD schema in the head, H1 + body in the body.
export function pageHtmlDocument(profile: ClientProfile, page: Page): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeAttr(page.title)}</title>
  <meta name="description" content="${escapeAttr(page.metaDescription)}">
  ${schemaScriptTag(page.schemaJsonLd)}
</head>
<body>
  <main>
    <h1>${escapeHtml(page.h1)}</h1>
${page.html}
  </main>
</body>
</html>
`;
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}
function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
