import { NextRequest, NextResponse } from "next/server";
import { getAccount } from "@/lib/db";
import { testAccount } from "@/lib/providers";

export const dynamic = "force-dynamic";

// Cheap round-trip to confirm the account's key + model work before a big batch.
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const account = getAccount(params.id);
  if (!account) return NextResponse.json({ error: "not found" }, { status: 404 });
  try {
    const res = await testAccount(account);
    return NextResponse.json({ ok: true, provider: account.provider, model: res.model });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String((err as Error).message || err) }, { status: 200 });
  }
}
