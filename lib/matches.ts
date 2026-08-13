import { fetchMuMatches } from './fd';
import { fetchEspnSchedule } from './espn';
import { mergeMatches } from './merge';
import { getCached, getStale, setCached, matchesTtlMs } from './cache';
import { currentSeasonLabel } from './season';
import { COMPETITIONS } from './competitions';
import type { CompetitionId, EspnScheduleEvent, FdMatch, MatchesResponse } from './types';

const CACHE_KEY = 'matches';

export async function getMatches(apiKey: string, force = false): Promise<MatchesResponse> {
  if (!force) {
    const cached = getCached<MatchesResponse>(CACHE_KEY);
    if (cached) return cached;
  }

  // Promise.allSettled means one dead source degrades the response instead of failing
  // it outright — spec section 8's error-handling requirement.
  const [fdResult, ...espnResults] = await Promise.allSettled([
    fetchMuMatches(apiKey),
    ...COMPETITIONS.map(c => fetchEspnSchedule(c.espnSlug)),
  ]);

  const fdMatches: FdMatch[] = fdResult.status === 'fulfilled' ? fdResult.value : [];
  const espnEventsByCompetition: Partial<Record<CompetitionId, EspnScheduleEvent[]>> = {};
  const failedEspnOnlyCompetitions: CompetitionId[] = [];
  COMPETITIONS.forEach((c, i) => {
    const result = espnResults[i];
    espnEventsByCompetition[c.id] = result.status === 'fulfilled' ? result.value : [];
    // fdCode-less competitions (FRIENDLY/FA/EFL) have no football-data backbone — an
    // ESPN failure there means the competition goes fully empty, not just missing live
    // enrichment (PL/CL keep their FD-sourced matches either way). Flagged here so a
    // transient ESPN outage (e.g. a 403 from its bot protection) can fall back to last
    // known data below instead of the competition silently vanishing from the response.
    if (result.status === 'rejected' && !c.fdCode) failedEspnOnlyCompetitions.push(c.id);
  });

  let matches = mergeMatches(fdMatches, espnEventsByCompetition);
  if (failedEspnOnlyCompetitions.length) {
    const stale = getStale<MatchesResponse>(CACHE_KEY);
    const staleFallback = (stale?.matches ?? []).filter(m => failedEspnOnlyCompetitions.includes(m.competition));
    matches = [...matches, ...staleFallback].sort((a, b) => a.utcDate.localeCompare(b.utcDate));
  }
  const response: MatchesResponse = {
    season: currentSeasonLabel(),
    matches,
    meta: {
      sources: {
        fd: fdResult.status === 'fulfilled',
        espn: espnResults.some(r => r.status === 'fulfilled'),
      },
    },
  };

  setCached(CACHE_KEY, response, matchesTtlMs(matches));
  return response;
}
