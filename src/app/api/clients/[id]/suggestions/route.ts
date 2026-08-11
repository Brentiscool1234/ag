import { NextRequest, NextResponse } from "next/server";
import { getClient, listPages } from "@/lib/db";
import { suggestPages } from "@/lib/suggestions";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const client = getClient(params.id);
  if (!client) return NextResponse.json({ error: "not found" }, { status: 404 });
  const suggestions = suggestPages(client, listPages(client.id));
  return NextResponse.json({ suggestions });
}
