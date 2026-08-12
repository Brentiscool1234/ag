"use client";

import { useEffect, useState } from "react";
import type { AccountView } from "@/lib/accountView";
import type { Provider } from "@/lib/types";
import { DEFAULT_ANTHROPIC_MODEL, DEFAULT_OPENAI_MODEL } from "@/lib/types";
import { clearActiveAccountId, getActiveAccountId } from "@/lib/activeAccount";

export default function AccountPage() {
  const [account, setAccount] = useState<AccountView | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [provider, setProvider] = useState<Provider>("anthropic");
  const [name, setName] = useState("");
  const [anthropicModel, setAnthropicModel] = useState(DEFAULT_ANTHROPIC_MODEL);
  const [openaiModel, setOpenaiModel] = useState(DEFAULT_OPENAI_MODEL);
  const [anthropicKey, setAnthropicKey] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [testMsg, setTestMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    const id = getActiveAccountId();
    if (!id) {
      setLoaded(true);
      return;
    }
    fetch(`/api/accounts/${id}`)
      .then((r) => r.json())
      .then((data) => {
        const a: AccountView | undefined = data.account;
        if (a) {
          setAccount(a);
          setProvider(a.provider);
          setName(a.name);
          setAnthropicModel(a.anthropicModel);
          setOpenaiModel(a.openaiModel);
        }
        setLoaded(true);
      });
  }, []);

  async function save() {
    if (!account) return;
    setSaving(true);
    setTestMsg(null);
    const res = await fetch(`/api/accounts/${account.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        provider,
        anthropicModel,
        openaiModel,
        // Only send keys if the user typed a new one; blank leaves them intact.
        anthropicApiKey: anthropicKey || undefined,
        openaiApiKey: openaiKey || undefined,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (data.account) {
      setAccount(data.account);
      setAnthropicKey("");
      setOpenaiKey("");
    }
  }

  async function test() {
    if (!account) return;
    setTestMsg({ ok: true, text: "Testing…" });
    // Save first so the test uses the latest key/model.
    await save();
    const res = await fetch(`/api/accounts/${account.id}/test`, { method: "POST" });
    const data = await res.json();
    if (data.ok) setTestMsg({ ok: true, text: `Working — ${data.provider} responded with ${data.model}.` });
    else setTestMsg({ ok: false, text: data.error || "Test failed." });
  }

  async function remove() {
    if (!account) return;
    if (!window.confirm(`Delete account "${account.name}"? This does not delete clients or pages.`)) return;
    await fetch(`/api/accounts/${account.id}`, { method: "DELETE" });
    clearActiveAccountId();
    window.location.href = "/";
  }

  if (!loaded) return <p className="muted">Loading…</p>;

  if (!account) {
    return (
      <div className="panel">
        <h1 style={{ marginTop: 0 }}>No account selected</h1>
        <p className="muted">
          Use the account picker in the top-right to create one, then come back here to add your
          API key.
        </p>
        <a href="/">← Back</a>
      </div>
    );
  }

  return (
    <div>
      <a href="/" className="small">← All clients</a>
      <h1 style={{ marginTop: 8 }}>Account settings</h1>
      <p className="muted small">
        Your API key lives on this account and is used to generate pages. Keys are stored in the
        app database and never shown back in full.
      </p>

      <div className="panel">
        <label>Account name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} />

        <label>Provider</label>
        <div className="radio-row">
          <label>
            <input
              type="radio"
              checked={provider === "anthropic"}
              onChange={() => setProvider("anthropic")}
            />
            Claude (Anthropic)
          </label>
          <label>
            <input
              type="radio"
              checked={provider === "openai"}
              onChange={() => setProvider("openai")}
            />
            OpenAI
          </label>
        </div>

        {provider === "anthropic" ? (
          <div className="grid2">
            <div>
              <label>Anthropic API key</label>
              <input
                type="password"
                value={anthropicKey}
                onChange={(e) => setAnthropicKey(e.target.value)}
                placeholder={account.hasAnthropicKey ? `saved: ${account.anthropicKeyMasked}` : "sk-ant-..."}
              />
            </div>
            <div>
              <label>Model</label>
              <input value={anthropicModel} onChange={(e) => setAnthropicModel(e.target.value)} />
              <div className="muted small" style={{ marginTop: 4 }}>
                Best quality: claude-opus-5. Cheaper for volume: claude-sonnet-5.
              </div>
            </div>
          </div>
        ) : (
          <div className="grid2">
            <div>
              <label>OpenAI API key</label>
              <input
                type="password"
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                placeholder={account.hasOpenaiKey ? `saved: ${account.openaiKeyMasked}` : "sk-..."}
              />
            </div>
            <div>
              <label>Model</label>
              <input value={openaiModel} onChange={(e) => setOpenaiModel(e.target.value)} />
              <div className="muted small" style={{ marginTop: 4 }}>
                Default gpt-4o. Any JSON-capable chat model works.
              </div>
            </div>
          </div>
        )}

        {testMsg && (
          <div className={testMsg.ok ? "ok small" : "err"} style={{ marginTop: 12 }}>
            {testMsg.text}
          </div>
        )}

        <div className="spacer" />
        <div className="row">
          <button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
          <button className="secondary" onClick={test} disabled={saving}>
            Save & test key
          </button>
          <span style={{ flex: 1 }} />
          <button className="danger" onClick={remove}>
            Delete account
          </button>
        </div>
      </div>
    </div>
  );
}
