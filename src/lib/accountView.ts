import type { Account } from "./types";

// Never send raw API keys to the browser. This is the shape the dashboard sees:
// key presence + a masked preview, but not the secret itself.
export interface AccountView {
  id: string;
  name: string;
  provider: Account["provider"];
  anthropicModel: string;
  openaiModel: string;
  hasAnthropicKey: boolean;
  hasOpenaiKey: boolean;
  anthropicKeyMasked: string;
  openaiKeyMasked: string;
  createdAt: number;
  updatedAt: number;
}

export function redactAccount(a: Account): AccountView {
  return {
    id: a.id,
    name: a.name,
    provider: a.provider,
    anthropicModel: a.anthropicModel,
    openaiModel: a.openaiModel,
    hasAnthropicKey: !!a.anthropicApiKey,
    hasOpenaiKey: !!a.openaiApiKey,
    anthropicKeyMasked: mask(a.anthropicApiKey),
    openaiKeyMasked: mask(a.openaiApiKey),
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  };
}

function mask(key: string): string {
  if (!key) return "";
  if (key.length <= 8) return "••••";
  return `${key.slice(0, 4)}••••${key.slice(-4)}`;
}
