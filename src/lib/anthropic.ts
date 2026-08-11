import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT, buildUserPrompt, type GenParams } from "./prompt";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    // Reads ANTHROPIC_API_KEY from the environment.
    client = new Anthropic();
  }
  return client;
}

const MODEL = process.env.SEO_MODEL || "claude-opus-5";

export interface RawPage {
  title: string;
  metaDescription: string;
  h1: string;
  html: string;
  faqs: { question: string; answer: string }[];
}

// One generation call. Streams to avoid HTTP timeouts on long output.
export async function generateRawPage(params: GenParams): Promise<RawPage> {
  const anthropic = getClient();

  // Adaptive thinking + effort are current API features whose typings lag in
  // this SDK version; the request body is valid and forwarded as-is at runtime.
  const requestParams = {
    model: MODEL,
    max_tokens: 8000,
    thinking: { type: "adaptive" },
    output_config: { effort: "medium" },
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserPrompt(params) }],
  } as unknown as Anthropic.MessageStreamParams;

  const stream = anthropic.messages.stream(requestParams);

  const message = await stream.finalMessage();

  let text = "";
  for (const block of message.content) {
    if (block.type === "text") text += block.text;
  }

  return parseRawPage(text);
}

// The prompt asks for raw JSON, but models occasionally wrap it. Parse defensively.
export function parseRawPage(text: string): RawPage {
  let s = text.trim();
  // Strip code fences if present.
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) s = fence[1].trim();
  // Grab the outermost JSON object.
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
