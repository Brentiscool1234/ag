"use client";

import { useEffect, useState } from "react";
import type { AccountView } from "@/lib/accountView";
import { getActiveAccountId, setActiveAccountId } from "@/lib/activeAccount";

// Header widget: pick the active account (whose API key generation runs on),
// create a new one, or jump to Account settings.
export default function AccountBar() {
  const [accounts, setAccounts] = useState<AccountView[]>([]);
  const [activeId, setActive] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  async function load() {
    const res = await fetch("/api/accounts");
    const data = await res.json();
    const list: AccountView[] = data.accounts ?? [];
    setAccounts(list);
    let current = getActiveAccountId();
    if (!current || !list.some((a) => a.id === current)) {
      current = list[0]?.id ?? null;
      if (current) setActiveAccountId(current);
    }
    setActive(current);
    setLoaded(true);
  }
  useEffect(() => {
    load();
  }, []);

  async function createAccount() {
    const name = window.prompt("Name this account (e.g. your name):");
    if (!name?.trim()) return;
    const res = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    const data = await res.json();
    if (data.account) {
      setActiveAccountId(data.account.id);
      window.location.href = "/account"; // go straight to add the API key
    }
  }

  function switchTo(id: string) {
    setActiveAccountId(id);
    setActive(id);
  }

  if (!loaded) return <span className="accountbar muted small">…</span>;

  const active = accounts.find((a) => a.id === activeId);
  const keyOk = active
    ? active.provider === "anthropic"
      ? active.hasAnthropicKey
      : active.hasOpenaiKey
    : false;

  return (
    <span className="accountbar">
      {accounts.length === 0 ? (
        <button className="secondary small" onClick={createAccount}>
          + Create account
        </button>
      ) : (
        <>
          <select
            value={activeId ?? ""}
            onChange={(e) => {
              if (e.target.value === "__new__") createAccount();
              else switchTo(e.target.value);
            }}
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} · {a.provider === "openai" ? "OpenAI" : "Claude"}
              </option>
            ))}
            <option value="__new__">+ New account…</option>
          </select>
          <a href="/account" className="small" title="Account settings">
            {keyOk ? "⚙ key set" : "⚠ add key"}
          </a>
        </>
      )}
    </span>
  );
}
