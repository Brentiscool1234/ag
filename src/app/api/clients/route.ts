import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { listClients, saveClient } from "@/lib/db";
import type { ClientProfile } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ clients: listClients() });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Partial<ClientProfile>;
  if (!body.name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  const now = Date.now();
  const client: ClientProfile = {
    id: randomUUID(),
    name: body.name,
    website: body.website ?? "",
    phone: body.phone ?? "",
    industry: body.industry ?? "",
    description: body.description ?? "",
    country: body.country ?? "United States",
    language: body.language ?? "English",
    state: body.state ?? "",
    tone: body.tone ?? "professional",
    services: clean(body.services),
    cities: clean(body.cities),
    keywords: clean(body.keywords),
    serviceAreas: clean(body.serviceAreas),
    bannedWordsExtra: clean(body.bannedWordsExtra),
    urlPattern: body.urlPattern || "/services/{service}/{city}/",
    servesRemotely: body.servesRemotely !== false,
    pricingInfo: body.pricingInfo ?? "",
    guarantee: body.guarantee ?? "",
    deliverables: clean(body.deliverables),
    differentiators: clean(body.differentiators),
    industries: clean(body.industries),
    proofPoints: clean(body.proofPoints),
    createdAt: now,
    updatedAt: now,
  };
  saveClient(client);
  return NextResponse.json({ client });
}

function clean(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  return [];
}
