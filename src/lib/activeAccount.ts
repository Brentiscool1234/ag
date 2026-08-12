// Client-side helpers for the "active account" selection. Stored in
// localStorage (and mirrored to a cookie) so the choice persists across
// reloads. When real auth is added, the logged-in user replaces this.

const KEY = "activeAccountId";

export function getActiveAccountId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(KEY);
}

export function setActiveAccountId(id: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, id);
  document.cookie = `${KEY}=${id}; path=/; max-age=31536000; samesite=lax`;
}

export function clearActiveAccountId(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
  document.cookie = `${KEY}=; path=/; max-age=0`;
}
