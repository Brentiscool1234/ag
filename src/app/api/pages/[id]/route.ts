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
  if (format === "html") {
    return new NextResponse(doc, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="${page.slug.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "page"}.html"`,
      },
    });
  }

  return NextResponse.json({ page, document: doc });
}
