import type { CompetitionId, Match, StandingRow } from './types';
import { isManUtd } from './normalize';
import { matchResult } from './result';

// Football convention: oldest of the window first, most recent last (reads left-to-right
// as "how they've been trending", ending on "right now").
export function recentForm(matches: Match[], competition: CompetitionId, limit = 5): ('W' | 'D' | 'L')[] {
  const finished = matches
    .filter(m => m.competition === competition && m.status === 'FINISHED')
    .slice()
    .sort((a, b) => b.utcDate.localeCompare(a.utcDate))
    .slice(0, limit);

  return finished
    .map((m): 'W' | 'D' | 'L' => matchResult(m) ?? 'D')
    .reverse();
}

// Large single-table competitions (e.g. Champions League's 36-team Swiss league phase)
// make MU's own row hard to find by scrolling. Returns MU's row plus `windowSize` rows
// on either side, clamped to the table's actual bounds — never invents empty rows past
// position 1 or the last position.
export function standingsAroundMu(standings: StandingRow[], windowSize = 2): StandingRow[] {
  const muIndex = standings.findIndex(row => isManUtd(row.team.name));
  if (muIndex === -1) return [];
  const start = Math.max(0, muIndex - windowSize);
  const end = Math.min(standings.length, muIndex + windowSize + 1);
  return standings.slice(start, end);
}

// League tables sign the goal difference so a squad's margin reads at a glance: "+9"
// beats "9" when the column next to it might be "-16". Zero stays bare — "+0" reads as
// a rounding artefact rather than a level record.
export function formatGoalDifference(goalDifference: number): string {
  return goalDifference > 0 ? `+${goalDifference}` : String(goalDifference);
}
