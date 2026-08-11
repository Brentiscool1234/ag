import { NextRequest, NextResponse } from "next/server";
import { activeJobForClient, getAccount, getClient } from "@/lib/db";
import { startGenerationJob } from "@/lib/jobs";
import type { Suggestion } from "@/lib/types";

export const dynamic = "force-dynamic";

// Start an async batch generation. Body: { clientId, accountId, targets }.
// Runs on the chosen account's API key. Returns the job immediately; the
// client polls /api/jobs/[id].
export async function POST(req: NextRequest) {
  const { clientId, accountId, targets } = (await req.json()) as {
    clientId: string;
    accountId: string;
    targets: Suggestion[];
  };

  const client = getClient(clientId);
  if (!client) return NextResponse.json({ error: "client not found" }, { status: 404 });

  const account = accountId ? getAccount(accountId) : null;
  if (!account) {
    return NextResponse.json(
      { error: "Pick an account first (top right), then add its API key in Account settings." },
      { status: 400 },
    );
  }
  const keyMissing =
    account.provider === "anthropic"
      ? !account.anthropicApiKey && !process.env.ANTHROPIC_API_KEY
      : !account.openaiApiKey && !process.env.OPENAI_API_KEY;
  if (keyMissing) {
    return NextResponse.json(
      { error: `No ${account.provider === "openai" ? "OpenAI" : "Anthropic"} API key on this account. Add it in Account settings.` },
      { status: 400 },
    );
  }

  if (!Array.isArray(targets) || targets.length === 0) {
    return NextResponse.json({ error: "no targets selected" }, { status: 400 });
  }

  const existing = activeJobForClient(clientId);
  if (existing) {
    return NextResponse.json(
      { error: "A generation job is already running for this client.", job: existing },
      { status: 409 },
    );
  }

  const job = startGenerationJob(clientId, account.id, targets);
  return NextResponse.json({ job });
}
