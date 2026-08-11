# SEO Page Generator

A dashboard your team logs into, enters a client's info once, and generates
**SEO-optimized service-area pages** in bulk — each one with valid JSON-LD
schema, silo internal linking, a predicted URL, and a `urls.txt` build plan.

Built for the "programmatic SEO for local service businesses" play: rank a
client for `[service] [city]` and `[service] near me` searches by covering the
full **service × city matrix** — without the pages reading as thin/doorway
spam that Google penalizes.

## What makes it different

The dashboard/auth/forms are the easy part. The value is the **quality layer**:
every page runs through a `generate → validate → regenerate → save` pipeline.
Rules are enforced in **code**, not just asked for in the prompt (LLMs slip),
so violations never ship:

| Rule | How it's enforced |
| --- | --- |
| 1,200–2,000 words | Word-count gate; regenerates if short |
| Genuinely unique per city | Cross-sibling 4-gram similarity gate (anti-doorway) |
| No two pages start the same | Opening-fingerprint registry + rotated opening archetypes |
| No em dashes (`—`, `–`, `--`) | Deterministic scan **+ auto-sanitize** — guaranteed clean |
| No AI-tell words ("unleash", "seamless", …) | Editable banned-word list; regenerates on a hit |
| Easy to read (6th–8th grade) | Flesch Reading Ease gate |
| Chosen tone | Prompt parameter (5 presets) |
| Valid schema | `Service` + `LocalBusiness` + `FAQPage` JSON-LD per page |
| Silo internal links | Hub + sibling-city + related-service links, not random |

Deterministic gates are unit-tested — run `npm test`.

## Core features

- **Bring your own key, per account** — each account picks its provider
  (**Claude** or **OpenAI**), stores its own API key + model on its profile
  (top-right account picker → Account settings), and a "Save & test key" button
  confirms it works before a batch. Keys are stored in the app DB and never
  shown back in full. Generation runs on the active account's key.
- **Clients with reusable profiles** — enter business info, tone, services,
  cities, keywords, banned words, and URL pattern **once**; every page reuses it.
- **Page suggestions** — the app surfaces every service × city combo the client
  doesn't have yet, so you never re-type the same info to add more pages.
- **Set it and leave it** — batch generation runs as a background job on the
  server. Kick it off, close the tab, come back later. A **progress bar with a
  live ETA** (refined as pages complete) shows how long is left.
- **Exports** — per-page ready-to-publish HTML (title + meta + schema + body),
  a `urls.txt` build plan, and a `sitemap.xml`.

## Architecture

```
Next.js (App Router)            single deployable: dashboard + API routes
  src/lib/engine.ts             generate → validate → regenerate loop  ← the moat
  src/lib/validators.ts         all deterministic gates (unit-tested)
  src/lib/anthropic.ts          Claude call (claude-opus-5, adaptive thinking)
  src/lib/prompt.ts             section-structured prompt + opening archetypes
  src/lib/schema.ts             JSON-LD builders
  src/lib/links.ts              URL prediction, silo links, urls.txt, sitemap
  src/lib/suggestions.ts        service × city gap finder
  src/lib/jobs.ts               in-process background job runner + ETA
  src/lib/db.ts                 SQLite (better-sqlite3) persistence
Data model:  Agency → Client (profile) → Page,  plus Job
```

The data model is multi-tenant-shaped from day one (Client = workspace), so the
eventual "sell access" step is adding a tenant above Client + billing, not a
rewrite.

## Running it

```bash
cp .env.example .env      # optional: env keys are only fallbacks now
npm install
npm run build
npm start                 # http://localhost:3000
```

Then in the dashboard: create an account (top-right), open **Account settings**,
pick Claude or OpenAI, paste your API key, and hit **Save & test key**. Now you
can generate.

Dev mode: `npm run dev`. Tests: `npm test`. Typecheck: `npm run typecheck`.

### Environment

See `.env.example`. Key vars: `ANTHROPIC_API_KEY` (required), `SEO_MODEL`
(default `claude-opus-5`; use `claude-sonnet-5` for cheaper high-volume runs),
`DATABASE_PATH`, and an optional `DASHBOARD_PASSWORD`.

## Deployment notes (important)

- **Use a persistent Node host** — Render, Railway, Fly.io, or a VM — **not a
  serverless platform**. "Set it and leave it" needs a long-running process for
  the background job runner and a persistent disk for the SQLite file. Serverless
  (e.g. Vercel functions) can't run the jobs or keep the DB.
- **Mount `DATABASE_PATH` on a persistent volume** so data survives restarts.
- **Cost model when you sell access:** LLM content costs money per page. For
  internal use it's negligible; before selling, switch to usage/credit pricing
  or a bring-your-own-API-key model so a $49/mo user can't generate 500 pages on
  your dime.

## Roadmap to SaaS

Current build is **v1: internal agency tool**. Deliberately deferred:

1. **Auth** — accounts exist and each holds its own key, but there's no login
   yet (anyone with dashboard access can switch accounts). Add real auth
   (Clerk / Supabase / Auth0) so a logged-in user maps to their account.
   API keys are stored unencrypted in the DB — encrypt them at rest before
   multi-tenant use.
2. **Tenant + billing layer** — the Client model is already the workspace
   boundary; add an Agency/Account tenant above it and Stripe billing.
3. **Postgres + Redis queue** — swap SQLite for Postgres and the in-process job
   runner for BullMQ when you have concurrent users / high volume. `db.ts` and
   `jobs.ts` are the only files that change.
4. **Framework upgrade** — this runs on Next 14.2.35 (latest hardened 14.2).
   `npm audit` flags the Next 14.x line broadly; move to Next 15/16 before any
   public, unauthenticated exposure.

## A note on AI-content transparency

Pages are AI-generated. Upcoming Claude models add imperceptible content
marking (EU AI Act Art. 50) — it does **not** affect readability, SEO, or
ranking, and it's fine to leave in place. Honest provenance protects the agency;
the pages win on quality and real local value, not on hiding how they were made.
