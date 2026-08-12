import { NextRequest, NextResponse } from "next/server";
import { getClient, listPages } from "@/lib/db";
import { buildSitemap, buildUrlsTxt } from "@/lib/links";

export const dynamic = "force-dynamic";

// ?type=urls  -> the urls.txt build plan (text/plain)
// ?type=sitemap -> sitemap.xml
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const client = getClient(params.id);
  if (!client) return NextResponse.json({ error: "not found" }, { status: 404 });
  const pages = listPages(client.id);
  const type = req.nextUrl.searchParams.get("type") || "urls";

  if (type === "sitemap") {
    return new NextResponse(buildSitemap(client, pages), {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Content-Disposition": 'attachment; filename="sitemap.xml"',
      },
    });
  }

  return new NextResponse(buildUrlsTxt(client, pages), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": 'attachment; filename="urls.txt"',
    },
  });
}
