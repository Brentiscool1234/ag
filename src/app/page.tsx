"use client";

import { useEffect, useState } from "react";
import type { ClientProfile } from "@/lib/types";
import { TONES } from "@/lib/types";
import { COUNTRIES, LANGUAGES, regionConfig } from "@/lib/regions";

export default function Home() {
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    const res = await fetch("/api/clients");
    const data = await res.json();
    setClients(data.clients ?? []);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>Clients</h1>
        <button onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Cancel" : "+ New client"}
        </button>
      </div>
      <p className="muted small">
        Each client has a reusable profile. Enter their info once, then generate pages and add
        more anytime without re-typing anything.
      </p>

      {showForm && <NewClientForm onCreated={() => { setShowForm(false); load(); }} />}

      {loading ? (
        <p className="muted">Loading...</p>
      ) : clients.length === 0 ? (
        <div className="panel muted">No clients yet. Create one to get started.</div>
      ) : (
        clients.map((c) => (
          <a key={c.id} href={`/clients/${c.id}`} style={{ display: "block" }}>
            <div className="clientcard">
              <div>
                <div style={{ fontWeight: 600, color: "var(--text)" }}>{c.name}</div>
                <div className="muted small">
                  {c.industry || "—"} · {c.services.length} services · {c.cities.length} cities
                </div>
              </div>
              <span className="muted">→</span>
            </div>
          </a>
        ))
      )}
    </div>
  );
}

function NewClientForm({ onCreated }: { onCreated: () => void }) {
  const [f, setF] = useState({
    name: "",
    website: "",
    phone: "",
    industry: "",
    description: "",
    tone: "professional",
    country: "United States",
    language: "English",
    state: "",
    services: "",
    cities: "",
    keywords: "",
    serviceAreas: "",
    urlPattern: "/services/{service}/{city}/",
    servesRemotely: true,
    pricingInfo: "",
    guarantee: "",
    deliverables: "",
    differentiators: "",
    industries: "",
    proofPoints: "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  function set(k: string, v: string | boolean) {
    setF((prev) => ({ ...prev, [k]: v }));
  }

  async function submit() {
    if (!f.name.trim()) return setErr("Business name is required.");
    setSaving(true);
    setErr("");
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...f,
        services: splitLines(f.services),
        cities: splitLines(f.cities),
        keywords: splitLines(f.keywords),
        serviceAreas: splitLines(f.serviceAreas),
        deliverables: splitLines(f.deliverables),
        differentiators: splitLines(f.differentiators),
        industries: splitLines(f.industries),
        proofPoints: splitLines(f.proofPoints),
      }),
    });
    setSaving(false);
    if (!res.ok) return setErr("Failed to create client.");
    onCreated();
  }

  return (
    <div className="panel">
      <h2 style={{ marginTop: 0 }}>New client profile</h2>
      <div className="grid2">
        <div>
          <label>Business name *</label>
          <input value={f.name} onChange={(e) => set("name", e.target.value)} />
        </div>
        <div>
          <label>Website</label>
          <input value={f.website} onChange={(e) => set("website", e.target.value)} placeholder="https://..." />
        </div>
        <div>
          <label>Phone</label>
          <input value={f.phone} onChange={(e) => set("phone", e.target.value)} />
        </div>
        <div>
          <label>Industry</label>
          <input value={f.industry} onChange={(e) => set("industry", e.target.value)} placeholder="Roofing" />
        </div>
      </div>
      <label>About the business (differentiators, credentials, what makes them good)</label>
      <textarea value={f.description} onChange={(e) => set("description", e.target.value)} />

      <div className="grid2">
        <div>
          <label>Country</label>
          <select
            value={f.country}
            onChange={(e) => {
              set("country", e.target.value);
              set("state", ""); // reset state when country changes
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

      {/* State only appears once a country + language are chosen, and only for
          countries that use states/provinces. */}
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
          <select value={f.tone} onChange={(e) => set("tone", e.target.value)}>
            {TONES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>URL pattern</label>
          <input value={f.urlPattern} onChange={(e) => set("urlPattern", e.target.value)} />
        </div>
      </div>

      <div className="grid2">
        <div>
          <label>Services (one per line)</label>
          <textarea value={f.services} onChange={(e) => set("services", e.target.value)} placeholder={"Roof Repair\nRoof Replacement\nStorm Damage"} />
        </div>
        <div>
          <label>Target cities (one per line)</label>
          <textarea value={f.cities} onChange={(e) => set("cities", e.target.value)} placeholder={"Austin\nRound Rock\nCedar Park"} />
        </div>
        <div>
          <label>Priority keywords (one per line)</label>
          <textarea value={f.keywords} onChange={(e) => set("keywords", e.target.value)} />
        </div>
        <div>
          <label>Service areas / neighborhoods (one per line)</label>
          <textarea value={f.serviceAreas} onChange={(e) => set("serviceAreas", e.target.value)} />
        </div>
      </div>

      <h3 style={{ marginTop: 18 }}>Positioning & proof</h3>
      <p className="muted small" style={{ marginTop: 0 }}>
        This is what makes each city page unique and trustworthy instead of generic. Anything you
        leave blank is simply left out — the generator never invents proof, prices, or a location.
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
          <label>Pricing (optional, e.g. "Starting at $2,500")</label>
          <input value={f.pricingInfo} onChange={(e) => set("pricingInfo", e.target.value)} />
        </div>
        <div>
          <label>Guarantee (optional, e.g. "5X ROI in 12 months or money back")</label>
          <input value={f.guarantee} onChange={(e) => set("guarantee", e.target.value)} />
        </div>
        <div>
          <label>What every project includes (one per line)</label>
          <textarea value={f.deliverables} onChange={(e) => set("deliverables", e.target.value)} placeholder={"Custom design\nMobile optimization\nGA4 + Search Console\nPage speed optimization"} />
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
          <textarea value={f.proofPoints} onChange={(e) => set("proofPoints", e.target.value)} placeholder={"Leave blank if none — a placeholder for the team is inserted instead of fake proof."} />
        </div>
      </div>

      {err && <div className="err">{err}</div>}
      <div className="spacer" />
      <button onClick={submit} disabled={saving}>
        {saving ? "Saving..." : "Create client"}
      </button>
    </div>
  );
}

function splitLines(s: string): string[] {
  return s
    .split(/[\n,]/)
    .map((x) => x.trim())
    .filter(Boolean);
}
