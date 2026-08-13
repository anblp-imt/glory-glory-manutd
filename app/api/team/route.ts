import { NextRequest, NextResponse } from 'next/server';
import { fetchSquad } from '@/lib/fd';
import { fetchEspnRoster } from '@/lib/espn';
import { buildSquad } from '@/lib/team';
import { getCached, getStale, setCached, STATIC_TTL_MS } from '@/lib/cache';
import type { TeamGroup } from '@/lib/team';

const CACHE_KEY = 'team';

export async function GET(request: NextRequest) {
  const force = request.nextUrl.searchParams.get('force') === '1';
  if (!force) {
    const cached = getCached<TeamGroup[]>(CACHE_KEY);
    if (cached) return NextResponse.json({ groups: cached });
  }

  const apiKey = process.env.FOOTBALL_API_KEY || '';
  try {
    const [fdSquad, espnRoster] = await Promise.all([
      fetchSquad(apiKey),
      fetchEspnRoster(),
    ]);

    const groups = buildSquad(fdSquad, espnRoster);
    setCached(CACHE_KEY, groups, STATIC_TTL_MS);
    return NextResponse.json({ groups });
  } catch (e) {
    // Unlike lib/matches.ts and lib/news.ts, fetchSquad/fetchEspnRoster have no
    // Promise.allSettled degrade path (both sources are required to build a squad) — so
    // a transient upstream failure (e.g. ESPN's bot protection returning a 403, see
    // lib/espn.ts) would otherwise 500 the whole route even though last poll's roster is
    // still perfectly good to show. Only genuinely propagate the error if there's no
    // stale data to fall back on (first-ever request, or a fresh deploy's cold cache).
    const stale = getStale<TeamGroup[]>(CACHE_KEY);
    if (stale) return NextResponse.json({ groups: stale });
    throw e;
  }
}
