import { fetchBbcNews } from './newsBbc';
import { fetchGuardianNews } from './newsGuardian';
import { fetchEspnNews } from './newsEspn';
import { getCached, getStale, setCached, NEWS_TTL_MS } from './cache';
import type { NewsArticle } from './types';

const CACHE_KEY = 'news';
const NEWS_FRESHNESS_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

export async function getNews(force = false): Promise<NewsArticle[]> {
  if (!force) {
    const cached = getCached<NewsArticle[]>(CACHE_KEY);
    if (cached) return cached;
  }

  // Promise.allSettled means one dead source degrades the merged list instead of
  // failing the whole request — same contract as lib/matches.ts.
  const results = await Promise.allSettled([
    fetchBbcNews(),
    fetchGuardianNews(),
    fetchEspnNews(),
  ]);

  const allFailed = results.every(r => r.status === 'rejected');

  let articles = results
    .filter((r): r is PromiseFulfilledResult<NewsArticle[]> => r.status === 'fulfilled')
    .flatMap(r => r.value);

  // ESPN is its own promise slot (index 2) — a rejection there (e.g. its bot-protection
  // returning a transient 403, see lib/espn.ts) would otherwise make ESPN articles vanish
  // from the list outright rather than just going stale for one poll cycle.
  if (results[2].status === 'rejected') {
    const stale = getStale<NewsArticle[]>(CACHE_KEY) ?? [];
    articles = [...articles, ...stale.filter(a => a.source === 'ESPN')];
  }

  articles = articles.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

  // Deduplicate: RSS feeds can return the same article URL more than once
  // (e.g. BBC's general feed filtered for MU mentions). Same (source, url) → same id.
  const seen = new Set<string>();
  const uniqueArticles = articles.filter(a => {
    if (seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  });

  const freshArticles = uniqueArticles.filter(
    a => Date.now() - new Date(a.publishedAt).getTime() <= NEWS_FRESHNESS_WINDOW_MS,
  );

  if (!allFailed) {
    setCached(CACHE_KEY, freshArticles, NEWS_TTL_MS);
  }
  return freshArticles;
}
