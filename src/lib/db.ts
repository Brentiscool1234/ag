import Database from "better-sqlite3";
import { mkdirSync } from "fs";
import { dirname } from "path";
import type { Account, ClientProfile, Job, Page } from "./types";

// A single SQLite connection for the whole app. For higher concurrency or a
// multi-server deployment, swap this file for Postgres (the store functions
// below are the only surface that would change).

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;
  const path = process.env.DATABASE_PATH || "./data/app.db";
  mkdirSync(dirname(path), { recursive: true });
  db = new Database(path);
  db.pragma("journal_mode = WAL");
  init(db);
  return db;
}

function init(d: Database.Database) {
  d.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      updatedAt INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS pages (
      id TEXT PRIMARY KEY,
      clientId TEXT NOT NULL,
      service TEXT NOT NULL,
      city TEXT NOT NULL,
      slug TEXT NOT NULL,
      data TEXT NOT NULL,
      createdAt INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_pages_client ON pages(clientId);
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      clientId TEXT NOT NULL,
      data TEXT NOT NULL,
      createdAt INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_jobs_client ON jobs(clientId);
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      updatedAt INTEGER NOT NULL
    );
  `);
}

// ---- Accounts (each holds its own provider + API key) ----

export function listAccounts(): Account[] {
  const rows = getDb().prepare("SELECT data FROM accounts ORDER BY updatedAt DESC").all() as {
    data: string;
  }[];
  return rows.map((r) => JSON.parse(r.data) as Account);
}

export function getAccount(id: string): Account | null {
  const row = getDb().prepare("SELECT data FROM accounts WHERE id = ?").get(id) as
    | { data: string }
    | undefined;
  return row ? (JSON.parse(row.data) as Account) : null;
}

export function saveAccount(a: Account): void {
  getDb()
    .prepare(
      "INSERT INTO accounts (id, data, updatedAt) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data, updatedAt = excluded.updatedAt",
    )
    .run(a.id, JSON.stringify(a), a.updatedAt);
}

export function deleteAccount(id: string): void {
  getDb().prepare("DELETE FROM accounts WHERE id = ?").run(id);
}

// ---- Clients ----

export function listClients(): ClientProfile[] {
  const rows = getDb().prepare("SELECT data FROM clients ORDER BY updatedAt DESC").all() as {
    data: string;
  }[];
  return rows.map((r) => JSON.parse(r.data) as ClientProfile);
}

export function getClient(id: string): ClientProfile | null {
  const row = getDb().prepare("SELECT data FROM clients WHERE id = ?").get(id) as
    | { data: string }
    | undefined;
  return row ? (JSON.parse(row.data) as ClientProfile) : null;
}

export function saveClient(c: ClientProfile): void {
  getDb()
    .prepare(
      "INSERT INTO clients (id, data, updatedAt) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data, updatedAt = excluded.updatedAt",
    )
    .run(c.id, JSON.stringify(c), c.updatedAt);
}

export function deleteClient(id: string): void {
  const d = getDb();
  d.prepare("DELETE FROM pages WHERE clientId = ?").run(id);
  d.prepare("DELETE FROM jobs WHERE clientId = ?").run(id);
  d.prepare("DELETE FROM clients WHERE id = ?").run(id);
}

// ---- Pages ----

export function listPages(clientId: string): Page[] {
  const rows = getDb()
    .prepare("SELECT data FROM pages WHERE clientId = ? ORDER BY createdAt DESC")
    .all(clientId) as { data: string }[];
  return rows.map((r) => JSON.parse(r.data) as Page);
}

export function getPage(id: string): Page | null {
  const row = getDb().prepare("SELECT data FROM pages WHERE id = ?").get(id) as
    | { data: string }
    | undefined;
  return row ? (JSON.parse(row.data) as Page) : null;
}

export function savePage(p: Page): void {
  getDb()
    .prepare(
      "INSERT INTO pages (id, clientId, service, city, slug, data, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .run(p.id, p.clientId, p.service, p.city, p.slug, JSON.stringify(p), p.createdAt);
}

export function deletePage(id: string): void {
  getDb().prepare("DELETE FROM pages WHERE id = ?").run(id);
}

// ---- Jobs ----

export function saveJob(j: Job): void {
  getDb()
    .prepare(
      "INSERT INTO jobs (id, clientId, data, createdAt) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data",
    )
    .run(j.id, j.clientId, JSON.stringify(j), j.createdAt);
}

export function getJob(id: string): Job | null {
  const row = getDb().prepare("SELECT data FROM jobs WHERE id = ?").get(id) as
    | { data: string }
    | undefined;
  return row ? (JSON.parse(row.data) as Job) : null;
}

export function activeJobForClient(clientId: string): Job | null {
  const rows = getDb()
    .prepare("SELECT data FROM jobs WHERE clientId = ? ORDER BY createdAt DESC LIMIT 5")
    .all(clientId) as { data: string }[];
  for (const r of rows) {
    const j = JSON.parse(r.data) as Job;
    if (j.status === "queued" || j.status === "running") return j;
  }
  return null;
}
