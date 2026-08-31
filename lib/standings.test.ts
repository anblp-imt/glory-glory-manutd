import { describe, it, expect } from 'vitest';
import { formatGoalDifference, recentForm, standingsAroundMu } from './standings';
import type { Match, StandingRow } from './types';

function row(position: number, teamName: string): StandingRow {
  return { position, team: { name: teamName }, playedGames: 10, won: 0, draw: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0 };
}

function match(id: string, utcDate: string, competition: Match['competition'], status: Match['status'], venue: 'H' | 'A', homeScore: number | null, awayScore: number | null): Match {
  return {
    id, utcDate, status, competition, venue,
    home: { name: 'Manchester United FC' }, away: { name: 'Opponent' },
    score: { fullTime: { home: homeScore, away: awayScore }, display: { home: homeScore, away: awayScore } },
    sources: { fd: 1 },
  };
}

describe('recentForm', () => {
  it('maps a win, draw, and loss correctly from MU\'s perspective (home and away)', () => {
    const matches = [
      match('a', '2026-08-01T00:00:00Z', 'PL', 'FINISHED', 'H', 2, 0), // MU won at home
      match('b', '2026-08-08T00:00:00Z', 'PL', 'FINISHED', 'A', 1, 1), // MU drew away
      match('c', '2026-08-15T00:00:00Z', 'PL', 'FINISHED', 'H', 0, 1), // MU lost at home
    ];
    expect(recentForm(matches, 'PL')).toEqual(['W', 'D', 'L']);
  });

  it('takes only the last N finished matches, oldest-first within that window', () => {
    const matches = Array.from({ length: 7 }, (_, i) =>
      match(`m${i}`, `2026-08-${String(i + 1).padStart(2, '0')}T00:00:00Z`, 'PL', 'FINISHED', 'H', i, 0),
    );
    expect(recentForm(matches, 'PL', 5)).toHaveLength(5);
  });

  it('ignores matches from other competitions and matches that have not finished', () => {
    const matches = [
      match('a', '2026-08-01T00:00:00Z', 'PL', 'FINISHED', 'H', 1, 0),
      match('b', '2026-08-08T00:00:00Z', 'CL', 'FINISHED', 'H', 1, 0),
      match('c', '2026-08-15T00:00:00Z', 'PL', 'SCHEDULED', 'H', null, null),
    ];
    expect(recentForm(matches, 'PL')).toEqual(['W']);
  });

  it('returns an empty array when there are no finished matches in this competition', () => {
    expect(recentForm([], 'PL')).toEqual([]);
  });
});

describe('standingsAroundMu', () => {
  const bigTable = Array.from({ length: 36 }, (_, i) =>
    i === 17 ? row(18, 'Manchester United FC') : row(i + 1, `Team ${i + 1}`),
  );

  it('returns MU plus windowSize rows on each side when MU is mid-table', () => {
    const result = standingsAroundMu(bigTable, 2);
    expect(result.map(r => r.position)).toEqual([16, 17, 18, 19, 20]);
    expect(result.find(r => r.position === 18)?.team.name).toBe('Manchester United FC');
  });

  it('clamps at the top of the table when MU is near position 1', () => {
    const table = [row(1, 'Manchester United FC'), row(2, 'B'), row(3, 'C'), row(4, 'D')];
    const result = standingsAroundMu(table, 2);
    expect(result.map(r => r.position)).toEqual([1, 2, 3]);
  });

  it('clamps at the bottom of the table when MU is near the last position', () => {
    const table = [row(1, 'A'), row(2, 'B'), row(3, 'C'), row(4, 'Manchester United FC')];
    const result = standingsAroundMu(table, 2);
    expect(result.map(r => r.position)).toEqual([2, 3, 4]);
  });

  it('returns an empty array when MU is not present in the standings', () => {
    const table = [row(1, 'A'), row(2, 'B')];
    expect(standingsAroundMu(table, 2)).toEqual([]);
  });
});

describe('formatGoalDifference', () => {
  it('prefixes a positive goal difference with a plus sign', () => {
    expect(formatGoalDifference(19)).toBe('+19');
  });

  it('keeps the minus sign on a negative goal difference', () => {
    expect(formatGoalDifference(-16)).toBe('-16');
  });

  it('renders a level goal difference as a bare zero, with no sign', () => {
    expect(formatGoalDifference(0)).toBe('0');
  });
});
