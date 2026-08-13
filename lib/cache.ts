// Module-level Map = one cache per server process, which is exactly what the spec calls
// for at this stage (local dev, single process). Ported concept from
// WC-2026-live-tracker/functions/_lib/cache.mjs, simplified: that version cached at the
// edge (Cloudflare `caches.default`) with stale-if-error; we don't need that here because
// error handling happens one level up, in the route handler (Promise.allSettled).

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();

export function getCached<T>(key: string): T | undefined {
  const entry = store.get(key);
  if (!entry || Date.now() >= entry.expiresAt) return undefined;
  return entry.value as T;
}

// Unlike getCached, ignores expiry — entries stay in `store` after they expire (setCached
// only ever overwrites, nothing deletes on expiry), so this is a free way to reach last
// known good data. For upstream sources that fail intermittently (see lib/matches.ts,
// lib/news.ts, app/api/team/route.ts): serving stale-but-real data beats serving nothing.
export function getStale<T>(key: string): T | undefined {
  return store.get(key)?.value as T | undefined;
}

export function setCached<T>(key: string, value: T, ttlMs: number): void {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function clearCache(): void {
  store.clear();
}

export const LIVE_TTL_MS = 30_000;
export const STATIC_TTL_MS = 300_000;
export const NEAR_KICKOFF_TTL_MS = 30_000;
export const NEAR_KICKOFF_WINDOW_MS = 60 * 60_000; // 60 minutes — lineups can land any time in this window
export const LEADERS_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours — see plan's Global Constraints
export const NEWS_TTL_MS = 20 * 60 * 1000; // 20 minutes — news doesn't need live-match freshness

export function matchesTtlMs(matches: Array<{ status: string }>): number {
  const hasLive = matches.some(m => m.status === 'IN_PLAY' || m.status === 'PAUSED');
  return hasLive ? LIVE_TTL_MS : STATIC_TTL_MS;
}

// Pre-match detail (rosters/lineups) is cached at STATIC_TTL_MS normally, but that's a
// 5-minute window a just-published lineup could sit stale in. Once kickoff is close enough
// that a lineup might land any minute, poll it as tightly as a live match.
export function matchDetailTtlMs(state: string | undefined, kickoffIso: string, now: number = Date.now()): number {
  if (state === 'in') return LIVE_TTL_MS;
  if (state === 'pre' && new Date(kickoffIso).getTime() - now <= NEAR_KICKOFF_WINDOW_MS) return NEAR_KICKOFF_TTL_MS;
  return STATIC_TTL_MS;
}
