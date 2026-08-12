"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ClientProfile, Job, Page, Suggestion } from "@/lib/types";
import { TONES } from "@/lib/types";
import { COUNTRIES, LANGUAGES, regionConfig } from "@/lib/regions";
import { getActiveAccountId } from "@/lib/activeAccount";

export default function ClientPage({ params }: { params: { id: string } }) {
  const id = params.id;
  const [client, setClient] = useState<ClientProfile | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [job, setJob] = useState<Job | null>(null);
  const [editing, setEditing] = useState(false);
  const poll = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadAll = useCallback(async () => {
    const [c, s] = await Promise.all([
      fetch(`/api/clients/${id}`).then((r) => r.json()),
      fetch(`/api/clients/${id}/suggestions`).then((r) => r.json()),
    ]);
    setClient(c.client ?? null);
    setPages(c.pages ?? []);
    setSuggestions(s.suggestions ?? []);
  }, [id]);

  useEffect(() => {
    loadAll();
    return () => {
      if (poll.current) clearInterval(poll.current);
    };
  }, [loadAll]);

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }
  function keyOf(s: Suggestion) {
    return `${s.service}::${s.city}`;
  }
  function selectAll() {
    setSelected(new Set(suggestions.map(keyOf)));
  }

  async function generate() {
    const targets = suggestions.filter((s) => selected.has(keyOf(s)));
    if (targets.length === 0) return;
    const accountId = getActiveAccountId();
    if (!accountId) {
      alert("Pick or create an account (top right) and add your API key first.");
      return;
    }
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: id, accountId, targets }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Failed to start job");
      if (data.job) startPolling(data.job.id);
      return;
    }
    setSelected(new Set());
    startPolling(data.job.id);
  }

  function startPolling(jobId: string) {
    if (poll.current) clearInterval(poll.current);
    poll.current = setInterval(async () => {
      const res = await fetch(`/api/jobs/${jobId}`);
      const data = await res.json();
      const j: Job = data.job;
      setJob(j);
      if (j.status === "done" || j.status === "error") {
        if (poll.current) clearInterval(poll.current);
        await loadAll();
      }
    }, 1500);
  }

  if (!client) return <p className="muted">Loading...</p>;

  const pct = job && job.total ? Math.round((job.completed / job.total) * 100) : 0;

  return (
    <div>
      <a href="/" className="small">← All clients</a>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
        <h1 style={{ margin: 0 }}>{client.name}</h1>
        <button className="secondary" onClick={() => setEditing((e) => !e)}>
          {editing ? "Close" : "Edit profile"}
        </button>
      </div>
      <p className="muted small">
        {client.industry || "—"} · {client.services.length} services · {client.cities.length} cities ·{" "}
        tone: {TONES.find((t) => t.value === client.tone)?.label}
      </p>

      {editing && (
        <EditProfile
          client={client}
          onSaved={() => {
            setEditing(false);
            loadAll();
          }}
        />
      )}

      {/* Job progress */}
      {job && (
        <div className="panel">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <strong>
              {job.status === "running" && `Generating: ${job.currentLabel}`}
              {job.status === "queued" && "Queued..."}
              {job.status === "done" && "Generation complete"}
              {job.status === "error" && "Job error"}
            </strong>
            <span className="muted small">
              {job.completed}/{job.total} · {job.failed > 0 && <span className="badge warn">{job.failed} to review</span>}{" "}
              {job.status === "running" && job.etaSeconds != null && `~${fmtEta(job.etaSeconds)} left`}
            </span>
          </div>
          <div className="spacer" />
          <div className="progress">
            <div style={{ width: `${pct}%` }} />
          </div>
          {job.status === "error" && <div className="err">{job.error}</div>}
          {job.status !== "running" && job.status !== "queued" && (
            <div className="small muted" style={{ marginTop: 8 }}>
              You can close this tab during a run and come back; the job keeps going on the server.
            </div>
          )}
        </div>
      )}

      {/* Suggestions */}
      <div className="panel">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0 }}>Suggested pages ({suggestions.length})</h2>
          <div className="row">
            <button className="secondary" onClick={selectAll} disabled={suggestions.length === 0}>
              Select all
            </button>
            <button onClick={generate} disabled={selected.size === 0 || job?.status === "running"}>
              Generate {selected.size > 0 ? `(${selected.size})` : ""}
            </button>
          </div>
        </div>
        <p className="muted small">
          Every service × city combination this client doesn't have yet. Pick some and let it run.
        </p>
        {suggestions.length === 0 ? (
          <p className="muted small">No gaps — every service/city page exists. Add services or cities to get more.</p>
        ) : (
          <div style={{ maxHeight: 260, overflowY: "auto" }}>
            {suggestions.map((s) => (
              <label key={keyOf(s)} className="checkline">
                <input
                  type="checkbox"
                  checked={selected.has(keyOf(s))}
                  onChange={() => toggle(keyOf(s))}
                />
                <span>
                  <strong>{s.service}</strong> in {s.city}{" "}
                  <span className="muted small">{s.slug}</span>
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Existing pages */}
      <div className="panel">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0 }}>Generated pages ({pages.length})</h2>
          {pages.length > 0 && (
            <div className="row">
              <a className="small" href={`/api/clients/${id}/export?type=urls`}>Download urls.txt</a>
              <a className="small" href={`/api/clients/${id}/export?type=sitemap`}>sitemap.xml</a>
            </div>
          )}
        </div>
        {pages.length === 0 ? (
          <p className="muted small">No pages yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Page</th>
                <th>Words</th>
                <th>Read ease</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pages.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div>{p.service} in {p.city}</div>
                    <div className="muted small">{p.slug}</div>
                  </td>
                  <td>{p.wordCount}</td>
                  <td>{p.fleschReadingEase}</td>
                  <td>
                    {p.status === "generated" ? (
                      <span className="badge ok">passed</span>
                    ) : (
                      <span className="badge fail">review</span>
                    )}
                  </td>
                  <td>
                    <a className="small" href={`/api/pages/${p.id}?format=html`}>HTML</a>
                    {" · "}
                    <a className="small" href={`/api/pages/${p.id}?format=schema`}>Schema</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function fmtEta(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function EditProfile({ client, onSaved }: { client: ClientProfile; onSaved: () => void }) {
  const [f, setF] = useState({
    name: client.name,
    website: client.website,
    phone: client.phone,
    industry: client.industry,
    description: client.description,
    tone: client.tone,
    country: client.country || "United States",
    language: client.language || "English",
    state: client.state || "",
    urlPattern: client.urlPattern,
    services: client.services.join("\n"),
    cities: client.cities.join("\n"),
    keywords: client.keywords.join("\n"),
    serviceAreas: client.serviceAreas.join("\n"),
    bannedWordsExtra: client.bannedWordsExtra.join("\n"),
    servesRemotely: client.servesRemotely ?? true,
    pricingInfo: client.pricingInfo ?? "",
    guarantee: client.guarantee ?? "",
    deliverables: (client.deliverables ?? []).join("\n"),
    differentiators: (client.differentiators ?? []).join("\n"),
    industries: (client.industries ?? []).join("\n"),
    proofPoints: (client.proofPoints ?? []).join("\n"),
  });
  const [saving, setSaving] = useState(false);

  function set(k: string, v: string | boolean) {
    setF((p) => ({ ...p, [k]: v }));
  }
  async function save() {
    setSaving(true);
    await fetch(`/api/clients/${client.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...f,
        services: split(f.services),
        cities: split(f.cities),
        keywords: split(f.keywords),
        serviceAreas: split(f.serviceAreas),
        bannedWordsExtra: split(f.bannedWordsExtra),
        deliverables: split(f.deliverables),
        differentiators: split(f.differentiators),
        industries: split(f.industries),
        proofPoints: split(f.proofPoints),
      }),
    });
    setSaving(false);
    onSaved();
  }

  return (
    <div className="panel">
      <div className="grid2">
        <div>
          <label>Business name</label>
          <input value={f.name} onChange={(e) => set("name", e.target.value)} />
        </div>
        <div>
          <label>Website</label>
          <input value={f.website} onChange={(e) => set("website", e.target.value)} />
        </div>
        <div>
          <label>Phone</label>
          <input value={f.phone} onChange={(e) => set("phone", e.target.value)} />
        </div>
        <div>
          <label>Industry</label>
          <input value={f.industry} onChange={(e) => set("industry", e.target.value)} />
        </div>
      </div>
      <label>About</label>
      <textarea value={f.description} onChange={(e) => set("description", e.target.value)} />
      <div className="grid2">
        <div>
          <label>Country</label>
          <select
            value={f.country}
            onChange={(e) => {
              set("country", e.target.value);
              set("state", "");
            }}
          >
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label>Language</label>
          <select value={f.language} onChange={(e) => set("language", e.target.value)}>
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
      </div>
      {f.country && f.language && regionConfig(f.country) && (
        <div>
          <label>{regionConfig(f.country)!.label}</label>
          <select value={f.state} onChange={(e) => set("state", e.target.value)}>
            <option value="">Select {regionConfig(f.country)!.label.toLowerCase()}…</option>
            {regionConfig(f.country)!.options.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      )}
      <div className="grid2">
        <div>
          <label>Tone</label>
          <select value={f.tone} onChange={(e) => set("tone", e.target.value as ClientProfile["tone"])}>
            {TONES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label>URL pattern</label>
          <input value={f.urlPattern} onChange={(e) => set("urlPattern", e.target.value)} />
        </div>
        <div>
          <label>Services (one per line)</label>
          <textarea value={f.services} onChange={(e) => set("services", e.target.value)} />
        </div>
        <div>
          <label>Cities (one per line)</label>
          <textarea value={f.cities} onChange={(e) => set("cities", e.target.value)} />
        </div>
        <div>
          <label>Keywords (one per line)</label>
          <textarea value={f.keywords} onChange={(e) => set("keywords", e.target.value)} />
        </div>
        <div>
          <label>Service areas (one per line)</label>
          <textarea value={f.serviceAreas} onChange={(e) => set("serviceAreas", e.target.value)} />
        </div>
      </div>
      <h3 style={{ marginTop: 18 }}>Positioning & proof</h3>
      <p className="muted small" style={{ marginTop: 0 }}>
        Makes each city page unique and trustworthy. Blank fields are left out — nothing is invented.
      </p>
      <label className="checkline">
        <input
          type="checkbox"
          checked={f.servesRemotely}
          onChange={(e) => set("servesRemotely", e.target.checked)}
        />
        <span>Serves target cities remotely (no physical office in each city)</span>
      </label>
      <div className="grid2">
        <div>
          <label>Pricing (optional)</label>
          <input value={f.pricingInfo} onChange={(e) => set("pricingInfo", e.target.value)} placeholder='e.g. "Starting at $2,500"' />
        </div>
        <div>
          <label>Guarantee (optional)</label>
          <input value={f.guarantee} onChange={(e) => set("guarantee", e.target.value)} placeholder='e.g. "5X ROI in 12 months or money back"' />
        </div>
        <div>
          <label>What every project includes (one per line)</label>
          <textarea value={f.deliverables} onChange={(e) => set("deliverables", e.target.value)} />
        </div>
        <div>
          <label>Real differentiators (one per line)</label>
          <textarea value={f.differentiators} onChange={(e) => set("differentiators", e.target.value)} />
        </div>
        <div>
          <label>Industries served (one per line)</label>
          <textarea value={f.industries} onChange={(e) => set("industries", e.target.value)} />
        </div>
        <div>
          <label>Proof points — real results / testimonials (one per line)</label>
          <textarea value={f.proofPoints} onChange={(e) => set("proofPoints", e.target.value)} placeholder="Blank = a team placeholder is inserted instead of fake proof." />
        </div>
      </div>

      <label>Extra banned words for this client (one per line)</label>
      <textarea value={f.bannedWordsExtra} onChange={(e) => set("bannedWordsExtra", e.target.value)} />
      <div className="spacer" />
      <button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save profile"}</button>
    </div>
  );
}

function split(s: string): string[] {
  return s.split(/[\n,]/).map((x) => x.trim()).filter(Boolean);
}
