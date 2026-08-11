import { NextRequest, NextResponse } from "next/server";
import { deleteAccount, getAccount, saveAccount } from "@/lib/db";
import type { Account } from "@/lib/types";
import { redactAccount } from "@/lib/accountView";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const account = getAccount(params.id);
  if (!account) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ account: redactAccount(account) });
}

// Keys are only overwritten when a non-empty value is provided, so saving other
// fields (model, provider, name) never wipes a stored key.
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const existing = getAccount(params.id);
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });
  const body = (await req.json()) as Partial<Account>;

  const updated: Account = {
    ...existing,
    name: body.name?.trim() || existing.name,
    provider: body.provider === "openai" ? "openai" : body.provider === "anthropic" ? "anthropic" : existing.provider,
    anthropicModel: body.anthropicModel?.trim() || existing.anthropicModel,
    openaiModel: body.openaiModel?.trim() || existing.openaiModel,
    anthropicApiKey: nonEmpty(body.anthropicApiKey) ?? existing.anthropicApiKey,
    openaiApiKey: nonEmpty(body.openaiApiKey) ?? existing.openaiApiKey,
    updatedAt: Date.now(),
  };
  saveAccount(updated);
  return NextResponse.json({ account: redactAccount(updated) });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  deleteAccount(params.id);
  return NextResponse.json({ ok: true });
}

function nonEmpty(v: string | undefined): string | undefined {
  const t = (v ?? "").trim();
  return t.length > 0 ? t : undefined;
}
