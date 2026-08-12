import { NextRequest, NextResponse } from "next/server";
import { deleteClient, getClient, listPages, saveClient } from "@/lib/db";
import type { ClientProfile } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const client = getClient(params.id);
  if (!client) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ client, pages: listPages(client.id) });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const existing = getClient(params.id);
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });
  const body = (await req.json()) as Partial<ClientProfile>;
  const updated: ClientProfile = {
    ...existing,
    ...body,
    id: existing.id,
    services: clean(body.services ?? existing.services),
    cities: clean(body.cities ?? existing.cities),
    keywords: clean(body.keywords ?? existing.keywords),
    serviceAreas: clean(body.serviceAreas ?? existing.serviceAreas),
    bannedWordsExtra: clean(body.bannedWordsExtra ?? existing.bannedWordsExtra),
    urlPattern: body.urlPattern || existing.urlPattern,
    servesRemotely: body.servesRemotely ?? existing.servesRemotely ?? true,
    pricingInfo: body.pricingInfo ?? existing.pricingInfo ?? "",
    guarantee: body.guarantee ?? existing.guarantee ?? "",
    deliverables: clean(body.deliverables ?? existing.deliverables),
    differentiators: clean(body.differentiators ?? existing.differentiators),
    industries: clean(body.industries ?? existing.industries),
    proofPoints: clean(body.proofPoints ?? existing.proofPoints),
    createdAt: existing.createdAt,
    updatedAt: Date.now(),
  };
  saveClient(updated);
  return NextResponse.json({ client: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  deleteClient(params.id);
  return NextResponse.json({ ok: true });
}

function clean(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  return [];
}
