import { NextRequest, NextResponse } from "next/server";
import { activeJobForClient, getClient } from "@/lib/db";
import { startGenerationJob } from "@/lib/jobs";
import type { Suggestion } from "@/lib/types";

export const dynamic = "force-dynamic";

// Start an async batch generation. Body: { clientId, targets: Suggestion[] }.
// Returns the job immediately; the client polls /api/jobs/[id].
export async function POST(req: NextRequest) {
  const { clientId, targets } = (await req.json()) as {
    clientId: string;
    targets: Suggestion[];
  };

  const client = getClient(clientId);
  if (!client) return NextResponse.json({ error: "client not found" }, { status: 404 });

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

  const job = startGenerationJob(clientId, targets);
  return NextResponse.json({ job });
}
