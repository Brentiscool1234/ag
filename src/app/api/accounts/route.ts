import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { listAccounts, saveAccount } from "@/lib/db";
import type { Account } from "@/lib/types";
import { DEFAULT_ANTHROPIC_MODEL, DEFAULT_OPENAI_MODEL } from "@/lib/types";
import { redactAccount } from "@/lib/accountView";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ accounts: listAccounts().map(redactAccount) });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Partial<Account>;
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  const now = Date.now();
  const account: Account = {
    id: randomUUID(),
    name: body.name.trim(),
    provider: body.provider === "openai" ? "openai" : "anthropic",
    anthropicApiKey: body.anthropicApiKey ?? "",
    openaiApiKey: body.openaiApiKey ?? "",
    anthropicModel: body.anthropicModel || DEFAULT_ANTHROPIC_MODEL,
    openaiModel: body.openaiModel || DEFAULT_OPENAI_MODEL,
    createdAt: now,
    updatedAt: now,
  };
  saveAccount(account);
  return NextResponse.json({ account: redactAccount(account) });
}
