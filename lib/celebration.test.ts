import { describe, it, expect } from 'vitest';
import { manUtdWon, isWithinCelebrationWindow } from './celebration';
import type { EspnDetail } from './types';

function detail(overrides: {
  state?: 'pre' | 'in' | 'post';
  homeTeam?: string;
  awayTeam?: string;
  homeScore?: string;
  awayScore?: string;
  homeShootout?: string;
  awayShootout?: string;
}): EspnDetail {
  return {
    header: {
      competitions: [{
        status: { type: { state: overrides.state ?? 'post' } },
        competitors: [
          { homeAway: 'home', team: { displayName: overrides.homeTeam ?? 'Manchester United' }, score: overrides.homeScore, shootoutScore: overrides.homeShootout },
          { homeAway: 'away', team: { displayName: overrides.awayTeam ?? 'Brighton & Hove Albion' }, score: overrides.awayScore, shootoutScore: overrides.awayShootout },
        ],
      }],
    },
  };
}

describe('manUtdWon', () => {
  it('returns true when MU (home) win by full-time score', () => {
    expect(manUtdWon(detail({ homeScore: '2', awayScore: '1' }))).toBe(true);
  });

  it('returns true when MU (away) win by full-time score', () => {
    expect(manUtdWon(detail({ homeTeam: 'Brighton & Hove Albion', awayTeam: 'Manchester United', homeScore: '1', awayScore: '2' }))).toBe(true);
  });

  it('returns false when MU lose by full-time score', () => {
    expect(manUtdWon(detail({ homeScore: '1', awayScore: '2' }))).toBe(false);
  });

  it('returns false for a draw with no shootout data', () => {
    expect(manUtdWon(detail({ homeScore: '1', awayScore: '1' }))).toBe(false);
  });

  it('returns true when MU (home) win on penalties after a regulation draw', () => {
    expect(manUtdWon(detail({ homeScore: '1', awayScore: '1', homeShootout: '4', awayShootout: '3' }))).toBe(true);
  });

  it('returns true when MU (away) win on penalties after a regulation draw', () => {
    expect(manUtdWon(detail({
      homeTeam: 'Brighton & Hove Albion', awayTeam: 'Manchester United',
      homeScore: '1', awayScore: '1', homeShootout: '3', awayShootout: '4',
    }))).toBe(true);
  });

  it('returns false when MU lose on penalties after a regulation draw', () => {
    expect(manUtdWon(detail({ homeScore: '1', awayScore: '1', homeShootout: '3', awayShootout: '4' }))).toBe(false);
  });

  it('returns false when the match has not finished yet', () => {
    expect(manUtdWon(detail({ state: 'in', homeScore: '2', awayScore: '1' }))).toBe(false);
  });
});

describe('isWithinCelebrationWindow', () => {
  const kickoff = new Date(2026, 7, 8, 8, 0).toISOString(); // local Aug 8, 08:00

  it('returns true on the same calendar day as kickoff', () => {
    expect(isWithinCelebrationWindow(kickoff, new Date(2026, 7, 8, 17, 0))).toBe(true);
  });

  it('returns true late on the day after kickoff', () => {
    expect(isWithinCelebrationWindow(kickoff, new Date(2026, 7, 9, 23, 30))).toBe(true);
  });

  it('returns false two days after kickoff', () => {
    expect(isWithinCelebrationWindow(kickoff, new Date(2026, 7, 10, 0, 30))).toBe(false);
  });

  it('returns false when kickoffIso is missing', () => {
    expect(isWithinCelebrationWindow(undefined, new Date(2026, 7, 8, 10, 0))).toBe(false);
  });
});
