import { isManUtd } from './normalize';
import type { EspnDetail } from './types';

// Same team-matching approach as displayTeamName/isManUtd — this only needs to know
// which side is MU, not merge per-team event data the way extractShootout does.
export function manUtdWon(detail: EspnDetail): boolean {
  const comp = detail.header?.competitions?.[0];
  if (comp?.status?.type?.state !== 'post') return false;

  const home = comp.competitors?.find(c => c.homeAway === 'home');
  const away = comp.competitors?.find(c => c.homeAway === 'away');
  if (!home || !away) return false;

  const homeIsMu = isManUtd(home.team?.displayName || '');
  const awayIsMu = isManUtd(away.team?.displayName || '');
  if (!homeIsMu && !awayIsMu) return false;

  const homeScore = Number(home.score);
  const awayScore = Number(away.score);
  if (!Number.isNaN(homeScore) && !Number.isNaN(awayScore) && homeScore !== awayScore) {
    return homeIsMu ? homeScore > awayScore : awayScore > homeScore;
  }

  const homeShootout = Number(home.shootoutScore);
  const awayShootout = Number(away.shootoutScore);
  if (!Number.isNaN(homeShootout) && !Number.isNaN(awayShootout) && homeShootout !== awayShootout) {
    return homeIsMu ? homeShootout > awayShootout : awayShootout > homeShootout;
  }

  return false;
}

// ESPN only exposes kickoff time, not a finish time, but day-level granularity is enough
// here — the caller already gates on the match being 'post' (finished) before checking
// this window, so "kickoff's calendar day" and "finish's calendar day" are the same day
// for all but the rarest post-midnight kickoff.
export function isWithinCelebrationWindow(kickoffIso: string | undefined, now: Date): boolean {
  if (!kickoffIso) return false;
  const kickoff = new Date(kickoffIso);
  if (Number.isNaN(kickoff.getTime())) return false;
  const windowEnd = new Date(kickoff.getFullYear(), kickoff.getMonth(), kickoff.getDate() + 2);
  return now < windowEnd;
}
