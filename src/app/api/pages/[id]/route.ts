import { NextRequest, NextResponse } from "next/server";
import { getClient, getPage } from "@/lib/db";
import { pageHtmlDocument } from "@/lib/export";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const page = getPage(params.id);
  if (!page) return NextResponse.json({ error: "not found" }, { status: 404 });
  const client = getClient(page.clientId);
  const doc = client ? pageHtmlDocument(client, page) : page.html;

  const format = req.nextUrl.searchParams.get("format");
  const base = page.slug.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "page";

  if (format === "html") {
    return new NextResponse(doc, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="${base}.html"`,
      },
    });
  }

  // Downloadable JSON-LD schema for this page (paste into the page <head>,
  // or feed to Google's Rich Results test).
  if (format === "schema") {
    return new NextResponse(page.schemaJsonLd, {
      headers: {
        "Content-Type": "application/ld+json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${base}.jsonld"`,
      },
    });
  }

  return NextResponse.json({ page, document: doc });
}
