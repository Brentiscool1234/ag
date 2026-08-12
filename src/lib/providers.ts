import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { SYSTEM_PROMPT, buildUserPrompt, buildExpandPrompt, type GenParams } from "./prompt";
import type { Account } from "./types";
import { DEFAULT_ANTHROPIC_MODEL, DEFAULT_OPENAI_MODEL } from "./types";

export interface RawPage {
  title: string;
  metaDescription: string;
  h1: string;
  html: string;
  faqs: { question: string; answer: string }[];
}

// Resolve the effective API key for an account's chosen provider. Falls back to
// env vars so it also works from a shell / CI without the dashboard.
function anthropicKey(a: Account): string {
  const k = a.anthropicApiKey || process.env.ANTHROPIC_API_KEY || "";
  if (!k) throw new Error("No Anthropic API key set on this account.");
  return k;
}
function openaiKey(a: Account): string {
  const k = a.openaiApiKey || process.env.OPENAI_API_KEY || "";
  if (!k) throw new Error("No OpenAI API key set on this account.");
  return k;
}

// One page generation, dispatched to whichever provider the account selected.
// Both providers use the same prompt and return the same JSON shape, so the
// validation gates downstream are provider-agnostic.
export async function generateRawPage(account: Account, params: GenParams): Promise<RawPage> {
  return runProvider(account, buildUserPrompt(params));
}

// Expansion pass: rewrite a too-short draft longer and more complete. Feeding
// the existing draft back is far more reliable at increasing length than
// regenerating from scratch, especially with terse models.
export async function expandRawPage(
  account: Account,
  params: GenParams,
  current: RawPage,
  wordCount: number,
  fixes: string[],
): Promise<RawPage> {
  return runProvider(account, buildExpandPrompt(params, current, wordCount, fixes));
}

async function runProvider(account: Account, userPrompt: string): Promise<RawPage> {
  if (account.provider === "openai") return openaiRun(account, userPrompt);
  return anthropicRun(account, userPrompt);
}

async function anthropicRun(account: Account, userPrompt: string): Promise<RawPage> {
  const client = new Anthropic({ apiKey: anthropicKey(account) });
  const model = account.anthropicModel || DEFAULT_ANTHROPIC_MODEL;

  // Adaptive thinking + effort are current API features whose typings lag in
  // this SDK version; the body is valid and forwarded as-is at runtime.
  const requestParams = {
    model,
    max_tokens: 12000,
    thinking: { type: "adaptive" },
    output_config: { effort: "medium" },
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  } as unknown as Anthropic.MessageStreamParams;

  const message = await client.messages.stream(requestParams).finalMessage();
  let text = "";
  for (const block of message.content) {
    if (block.type === "text") text += block.text;
  }
  return parsePage(text);
}

async function openaiRun(account: Account, userPrompt: string): Promise<RawPage> {
  const client = new OpenAI({ apiKey: openaiKey(account) });
  const model = account.openaiModel || DEFAULT_OPENAI_MODEL;

  // No response_format: JSON mode makes gpt-4o terse and truncate the HTML.
  // We use a delimited plain-text format instead (parsed by parsePage).
  const completion = await client.chat.completions.create({
    model,
    max_tokens: 8000,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
  });
  const text = completion.choices[0]?.message?.content ?? "";
  return parsePage(text);
}

// A cheap round-trip so the dashboard's "Test" button confirms the key works
// before someone kicks off a big batch. Returns the model that answered.
export async function testAccount(account: Account): Promise<{ ok: true; model: string }> {
  if (account.provider === "openai") {
    const client = new OpenAI({ apiKey: openaiKey(account) });
    const model = account.openaiModel || DEFAULT_OPENAI_MODEL;
    await client.chat.completions.create({
      model,
      max_tokens: 5,
      messages: [{ role: "user", content: "Reply with the word OK." }],
    });
    return { ok: true, model };
  }
  const client = new Anthropic({ apiKey: anthropicKey(account) });
  const model = account.anthropicModel || DEFAULT_ANTHROPIC_MODEL;
  await client.messages.create({
    model,
    max_tokens: 5,
    messages: [{ role: "user", content: "Reply with the word OK." }],
  });
  return { ok: true, model };
}

// Primary parser for the delimited output format. Falls back to JSON parsing
// if a model ignores the format and returns JSON anyway.
export function parsePage(text: string): RawPage {
  const t = text.replace(/\r\n/g, "\n");
  if (/===\s*BODY\s*===/i.test(t)) {
    const section = (name: string): string => {
      const re = new RegExp(
        `===\\s*${name}\\s*===\\s*\\n([\\s\\S]*?)(?=\\n===\\s*[A-Z0-9]+\\s*===|$)`,
        "i",
      );
      const m = t.match(re);
      return m ? m[1].trim() : "";
    };
    const firstLine = (s: string) => s.split("\n").map((l) => l.trim()).find(Boolean) ?? "";
    const title = firstLine(section("TITLE"));
    const html = section("BODY");
    if (title && html) {
      return {
        title,
        metaDescription: firstLine(section("META")),
        h1: firstLine(section("H1")) || title,
        html,
        faqs: parseFaqBlock(section("FAQ")),
      };
    }
  }
  return parseRawPage(text);
}

function parseFaqBlock(raw: string): { question: string; answer: string }[] {
  const faqs: { question: string; answer: string }[] = [];
  let cur: { question: string; answer: string } | null = null;
  for (const line of raw.split("\n")) {
    const q = line.match(/^\s*Q[:.)]\s*(.*)/i);
    const a = line.match(/^\s*A[:.)]\s*(.*)/i);
    if (q) {
      if (cur) faqs.push(cur);
      cur = { question: q[1].trim(), answer: "" };
    } else if (a && cur) {
      cur.answer = (cur.answer ? cur.answer + " " : "") + a[1].trim();
    } else if (cur && line.trim()) {
      // continuation line of the current answer
      cur.answer = (cur.answer ? cur.answer + " " : "") + line.trim();
    }
  }
  if (cur) faqs.push(cur);
  return faqs.filter((f) => f.question && f.answer);
}

// Fallback parser for models that return JSON despite the delimited instruction.
export function parseRawPage(text: string): RawPage {
  let s = text.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) s = fence[1].trim();
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start !== -1 && end !== -1) s = s.slice(start, end + 1);

  let parsed: unknown;
  try {
    parsed = JSON.parse(s);
  } catch {
    throw new Error("Model did not return valid JSON for the page.");
  }
  const p = parsed as Partial<RawPage>;
  if (!p.html || !p.title) {
    throw new Error("Model response missing required fields (title/html).");
  }
  return {
    title: String(p.title),
    metaDescription: String(p.metaDescription ?? ""),
    h1: String(p.h1 ?? p.title),
    html: String(p.html),
    faqs: Array.isArray(p.faqs)
      ? p.faqs
          .filter((f) => f && f.question && f.answer)
          .map((f) => ({ question: String(f.question), answer: String(f.answer) }))
      : [],
  };
}
