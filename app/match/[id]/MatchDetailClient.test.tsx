import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { clearCache } from '@/lib/cache';

const mockParams = { id: '2026-08-22_hullcityafc' };

vi.mock('next/navigation', () => ({
  useParams: () => mockParams,
}));

import MatchDetailClient from './MatchDetailClient';

// usePolling's client cache is a module-level Map shared across every test in this file
// (several reuse the same match id) — clear it so each test starts from a real fetch,
// except the one test below that deliberately exercises the cache.
beforeEach(() => { clearCache(); vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('MatchDetailClient', () => {
  it('renders scorers and lineups once the detail loads', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        header: {
          competitions: [{
            status: { type: { state: 'post' } },
            competitors: [
              { homeAway: 'home', team: { id: '331', displayName: 'Brighton & Hove Albion' }, score: '1' },
              { homeAway: 'away', team: { id: '360', displayName: 'Manchester United' }, score: '2' },
            ],
            details: [{ scoringPlay: true, clock: { displayValue: "33'" }, team: { id: '360' }, participants: [{ athlete: { displayName: 'Patrick Dorgu' } }] }],
          }],
        },
        rosters: [
          { homeAway: 'home', team: { displayName: 'Brighton' }, formation: '4-2-3-1', roster: [] },
          { homeAway: 'away', team: { displayName: 'Manchester United' }, formation: '4-2-3-1', roster: [] },
        ],
      }),
    }));

    render(<MatchDetailClient />);
    await act(async () => { await Promise.resolve(); });

    expect(screen.getByText(/Patrick Dorgu/)).toBeInTheDocument();
    expect(screen.getByTestId('formation-pitch')).toBeInTheDocument();
    expect(screen.getAllByText('Red Devils').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Brighton & Hove Albion').length).toBeGreaterThan(0);
    // The away side displays the "Red Devils" nickname but its tooltip still carries
    // the full official name, proving the tooltip isn't just a copy of the visible text.
    expect(screen.getByText('Manchester United')).toBeInTheDocument();
    expect(screen.getByText(/1 – 2/)).toBeInTheDocument();
    expect(screen.getByText('Full Time')).toBeInTheDocument();
  });

  it('shows each team\'s crest and a team-colored accent in the score header when ESPN provides them', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        header: {
          competitions: [{
            status: { type: { state: 'post' } },
            competitors: [
              {
                homeAway: 'home', score: '1',
                team: {
                  id: '331', displayName: 'Brighton & Hove Albion', color: '0057B8',
                  logos: [{ href: 'https://example.com/331-default.png', rel: ['full', 'default'] }, { href: 'https://example.com/331-dark.png', rel: ['full', 'dark'] }],
                },
              },
              {
                homeAway: 'away', score: '2',
                team: { id: '360', displayName: 'Manchester United', color: 'DA020E' },
              },
            ],
          }],
        },
        rosters: [],
      }),
    }));

    render(<MatchDetailClient />);
    await act(async () => { await Promise.resolve(); });

    const homeCrest = screen.getByAltText('Brighton & Hove Albion crest') as HTMLImageElement;
    expect(homeCrest.src).toBe('https://example.com/331-dark.png');
    // Manchester United has no `logos` in this fixture — no crest image should render for it.
    expect(screen.queryByAltText('Manchester United crest')).not.toBeInTheDocument();
  });

  it('does not crash the score header when ESPN omits team color and logos entirely', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        header: {
          competitions: [{
            status: { type: { state: 'post' } },
            competitors: [
              { homeAway: 'home', team: { id: '331', displayName: 'Brighton & Hove Albion' }, score: '1' },
              { homeAway: 'away', team: { id: '360', displayName: 'Manchester United' }, score: '2' },
            ],
          }],
        },
        rosters: [],
      }),
    }));

    render(<MatchDetailClient />);
    await act(async () => { await Promise.resolve(); });

    expect(screen.getAllByText('Brighton & Hove Albion').length).toBeGreaterThan(0);
    expect(screen.queryByAltText('Brighton & Hove Albion crest')).not.toBeInTheDocument();
  });

  it('renders one row per scorer with a ball icon, not a single joined line', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        header: {
          competitions: [{
            status: { type: { state: 'post' } },
            competitors: [
              { homeAway: 'home', team: { id: '331', displayName: 'Brighton & Hove Albion' }, score: '1' },
              { homeAway: 'away', team: { id: '360', displayName: 'Manchester United' }, score: '2' },
            ],
            details: [
              { scoringPlay: true, clock: { displayValue: "33'" }, team: { id: '360' }, participants: [{ athlete: { displayName: 'Patrick Dorgu' } }] },
              { scoringPlay: true, clock: { displayValue: "70'" }, team: { id: '360' }, participants: [{ athlete: { displayName: 'Patrick Dorgu' } }] },
              { scoringPlay: true, clock: { displayValue: "80'" }, team: { id: '331' }, participants: [{ athlete: { displayName: 'Some Striker' } }] },
            ],
          }],
        },
        rosters: [],
      }),
    }));

    render(<MatchDetailClient />);
    await act(async () => { await Promise.resolve(); });

    // Dorgu scored twice — grouped into ONE row showing both minutes, not two rows.
    expect(screen.getByText(/33'.*70'|70'.*33'/)).toBeInTheDocument();
    const scorerRows = screen.getAllByTestId('scorer-row');
    expect(scorerRows).toHaveLength(2); // one row for Dorgu (both goals), one for Some Striker
  });

  it('shows a placeholder, not an empty list, when a side has no scorers', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        header: {
          competitions: [{
            status: { type: { state: 'post' } },
            competitors: [
              { homeAway: 'home', team: { id: '331', displayName: 'Brighton & Hove Albion' }, score: '0' },
              { homeAway: 'away', team: { id: '360', displayName: 'Manchester United' }, score: '1' },
            ],
            details: [
              { scoringPlay: true, clock: { displayValue: "10'" }, team: { id: '360' }, participants: [{ athlete: { displayName: 'Bruno Fernandes' } }] },
            ],
          }],
        },
        rosters: [],
      }),
    }));

    render(<MatchDetailClient />);
    await act(async () => { await Promise.resolve(); });

    expect(screen.getAllByTestId('scorer-row')).toHaveLength(1);
    expect(screen.getByTestId('scorers')).toHaveTextContent('—');
  });

  it('places Scorers before the Starting Lineup details, so it reads as part of the persistent header', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        header: {
          competitions: [{
            status: { type: { state: 'post' } },
            competitors: [
              { homeAway: 'home', team: { id: '331', displayName: 'Brighton & Hove Albion' }, score: '1' },
              { homeAway: 'away', team: { id: '360', displayName: 'Manchester United' }, score: '2' },
            ],
            details: [{ scoringPlay: true, clock: { displayValue: "33'" }, team: { id: '360' }, participants: [{ athlete: { displayName: 'Patrick Dorgu' } }] }],
          }],
        },
        rosters: [],
      }),
    }));

    render(<MatchDetailClient />);
    await act(async () => { await Promise.resolve(); });

    const scorersSection = screen.getByTestId('scorers');
    const lineupDetails = screen.getByText('Starting Lineup').closest('details')!;
    // DOCUMENT_POSITION_FOLLOWING on lineupDetails (from scorersSection's perspective)
    // means scorersSection comes first in the DOM.
    expect(scorersSection.compareDocumentPosition(lineupDetails) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('badges only the higher stat value, colored with that side\'s real ESPN color', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        header: {
          competitions: [{
            status: { type: { state: 'post' } },
            competitors: [
              { homeAway: 'home', team: { id: '331', displayName: 'Brighton & Hove Albion', color: '0057B8' }, score: '1' },
              { homeAway: 'away', team: { id: '360', displayName: 'Manchester United', color: 'da020e' }, score: '2' },
            ],
          }],
        },
        rosters: [],
        boxscore: {
          teams: [
            { homeAway: 'home', statistics: [{ name: 'totalShots', displayValue: '10' }] },
            { homeAway: 'away', statistics: [{ name: 'totalShots', displayValue: '14' }] },
          ],
        },
      }),
    }));

    render(<MatchDetailClient />);
    await act(async () => { await Promise.resolve(); });

    const homeValue = screen.getByText('10');
    const awayValue = screen.getByText('14');
    expect(homeValue.style.background).toBe(''); // Brighton, lower (10) — no badge color
    expect(awayValue.style.background).toBe('rgb(218, 2, 14)'); // MU, higher (14) — badged in its real color
  });

  it('badges neither side when a stat is tied', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        header: {
          competitions: [{
            status: { type: { state: 'post' } },
            competitors: [
              { homeAway: 'home', team: { id: '331', displayName: 'Brighton & Hove Albion', color: '0057B8' }, score: '1' },
              { homeAway: 'away', team: { id: '360', displayName: 'Manchester United', color: 'da020e' }, score: '1' },
            ],
          }],
        },
        rosters: [],
        boxscore: {
          teams: [
            { homeAway: 'home', statistics: [{ name: 'totalShots', displayValue: '10' }] },
            { homeAway: 'away', statistics: [{ name: 'totalShots', displayValue: '10' }] },
          ],
        },
      }),
    }));

    render(<MatchDetailClient />);
    await act(async () => { await Promise.resolve(); });

    const values = screen.getAllByText('10');
    expect(values[0].style.background).toBe('');
    expect(values[1].style.background).toBe('');
  });

  it('renders stats, substitutions and a penalty shootout when the detail includes them', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        header: {
          competitions: [{
            status: { type: { state: 'post' } },
            competitors: [
              { homeAway: 'home', team: { id: '331', displayName: 'Brighton & Hove Albion' }, score: '1', shootoutScore: '3' },
              { homeAway: 'away', team: { id: '360', displayName: 'Manchester United' }, score: '1', shootoutScore: '4' },
            ],
          }],
        },
        rosters: [],
        boxscore: {
          teams: [
            { homeAway: 'home', statistics: [{ name: 'totalShots', displayValue: '10' }] },
            { homeAway: 'away', statistics: [{ name: 'totalShots', displayValue: '14' }] },
          ],
        },
        keyEvents: [{
          type: { type: 'substitution' }, clock: { displayValue: "60'", value: 3600 },
          team: { id: '360' }, participants: [{ athlete: { displayName: 'Amad Diallo' } }, { athlete: { displayName: 'Antony' } }],
        }],
        shootout: [
          { id: '331', team: 'Brighton & Hove Albion', shots: [{ player: 'A', didScore: true }] },
          { id: '360', team: 'Manchester United', shots: [{ player: 'B', didScore: true }] },
        ],
      }),
    }));

    render(<MatchDetailClient />);
    await act(async () => { await Promise.resolve(); });

    expect(screen.getByTestId('stats')).toBeInTheDocument();
    expect(screen.getAllByText('10').length).toBeGreaterThan(0);
    expect(screen.getByTestId('substitutions')).toBeInTheDocument();
    expect(screen.getByText('1 Substitution')).toBeInTheDocument();
    expect(screen.getByText(/Amad Diallo/)).toBeInTheDocument();
    expect(screen.getByTestId('shootout')).toBeInTheDocument();
    expect(screen.getByText('3 – 4')).toBeInTheDocument();
  });

  it('right-aligns the away team\'s substitutions column to mirror the home column', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        header: {
          competitions: [{
            status: { type: { state: 'post' } },
            competitors: [
              { homeAway: 'home', team: { id: '331', displayName: 'Brighton & Hove Albion' }, score: '1' },
              { homeAway: 'away', team: { id: '360', displayName: 'Manchester United' }, score: '1' },
            ],
          }],
        },
        rosters: [],
        keyEvents: [{
          type: { type: 'substitution' }, clock: { displayValue: "60'", value: 3600 },
          team: { id: '360' }, participants: [{ athlete: { displayName: 'Amad Diallo' } }, { athlete: { displayName: 'Antony' } }],
        }],
      }),
    }));

    const { container } = render(<MatchDetailClient />);
    await act(async () => { await Promise.resolve(); });

    const subsGrid = container.querySelector('[class*="subsGrid"]');
    const [homeCol, awayCol] = Array.from(subsGrid?.children || []);
    expect(homeCol?.className).not.toMatch(/subsColRight/);
    expect(awayCol?.className).toMatch(/subsColRight/);
  });

  it('omits stats/substitutions/shootout sections when the detail has none of that data', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        header: {
          competitions: [{
            status: { type: { state: 'post' } },
            competitors: [
              { homeAway: 'home', team: { id: '331', displayName: 'Brighton & Hove Albion' }, score: '1' },
              { homeAway: 'away', team: { id: '360', displayName: 'Manchester United' }, score: '2' },
            ],
          }],
        },
        rosters: [],
      }),
    }));

    render(<MatchDetailClient />);
    await act(async () => { await Promise.resolve(); });

    expect(screen.queryByTestId('stats')).not.toBeInTheDocument();
    expect(screen.queryByTestId('substitutions')).not.toBeInTheDocument();
    expect(screen.queryByTestId('shootout')).not.toBeInTheDocument();
  });

  it('keeps polling and updates once a pre-match fixture goes live', async () => {
    const preDetail = {
      header: { competitions: [{ status: { type: { state: 'pre' } }, competitors: [] }] },
      rosters: [],
    };
    const liveDetail = {
      header: { competitions: [{ status: { type: { state: 'in' }, displayClock: '5\'' }, competitors: [] }] },
      rosters: [],
    };
    let resolveSecondFetch: (v: unknown) => void = () => {};
    const secondFetch = new Promise(resolve => { resolveSecondFetch = resolve; });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => preDetail })
      .mockImplementationOnce(() => secondFetch);
    vi.stubGlobal('fetch', fetchMock);

    render(<MatchDetailClient />);
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(screen.getByText('Kickoff soon')).toBeInTheDocument();
    // Second fetch (triggered by the pre-match poll interval kicking in) is deliberately
    // held open, proving it happened at all — before the fix, intervalMs stayed null and
    // this second call never fired.
    expect(fetchMock).toHaveBeenCalledTimes(2);

    resolveSecondFetch({ ok: true, json: async () => liveDetail });
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(screen.getByText(/Live/)).toBeInTheDocument();
  });

  it('opens the lineup by default before kickoff, closes it once live', async () => {
    const preDetail = {
      header: { competitions: [{ status: { type: { state: 'pre' } }, competitors: [] }] },
      rosters: [],
    };
    const liveDetail = {
      header: { competitions: [{ status: { type: { state: 'in' }, displayClock: '5\'' }, competitors: [] }] },
      rosters: [],
    };
    let resolveSecondFetch: (v: unknown) => void = () => {};
    const secondFetch = new Promise(resolve => { resolveSecondFetch = resolve; });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => preDetail })
      .mockImplementationOnce(() => secondFetch);
    vi.stubGlobal('fetch', fetchMock);

    render(<MatchDetailClient />);
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(screen.getByText('Starting Lineup').closest('details')).toHaveAttribute('open');

    resolveSecondFetch({ ok: true, json: async () => liveDetail });
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(screen.getByText('Starting Lineup').closest('details')).not.toHaveAttribute('open');
  });

  it('renders instantly from cache when the same fixture is reopened', async () => {
    const detail = {
      header: { competitions: [{ status: { type: { state: 'post' } }, competitors: [] }] },
      rosters: [],
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => detail }));

    const { unmount } = render(<MatchDetailClient />);
    await act(async () => { await Promise.resolve(); });
    expect(screen.getByText('Full Time')).toBeInTheDocument();
    unmount();

    // Simulates navigating back out to Today and clicking straight back into the same
    // fixture: no fetch has resolved yet for this new mount, so if the page were still
    // relying purely on the fresh fetch it would render the loading spinner here.
    const stillLoadingFetch = vi.fn(() => new Promise(() => {}));
    vi.stubGlobal('fetch', stillLoadingFetch);
    render(<MatchDetailClient />);
    expect(screen.getByText('Full Time')).toBeInTheDocument();
  });

  it('shows an error message when the detail fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    render(<MatchDetailClient />);
    // [React] waitFor polls via setTimeout, which never fires under vi.useFakeTimers()
    // unless the clock is advanced — matches the fake-timers precedent already
    // established in app/page.test.tsx (Task 21): flush microtasks with act() instead,
    // since this resolution needs no real/fake timer, only a settled promise.
    await act(async () => { await Promise.resolve(); });
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('shows fireworks when Manchester United have won and the match is still within the celebration window', async () => {
    vi.setSystemTime(new Date('2026-08-08T17:00:00Z')); // 2 hours after kickoff
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        header: {
          competitions: [{
            date: '2026-08-08T15:00:00Z',
            status: { type: { state: 'post' } },
            competitors: [
              { homeAway: 'home', team: { id: '331', displayName: 'Brighton & Hove Albion' }, score: '1' },
              { homeAway: 'away', team: { id: '360', displayName: 'Manchester United' }, score: '2' },
            ],
          }],
        },
        rosters: [],
      }),
    }));

    const { container } = render(<MatchDetailClient />);
    await act(async () => { await Promise.resolve(); });

    expect(container.querySelector('canvas')).not.toBeNull();
  });

  it('shows no fireworks when Manchester United lose', async () => {
    vi.setSystemTime(new Date('2026-08-08T17:00:00Z'));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        header: {
          competitions: [{
            date: '2026-08-08T15:00:00Z',
            status: { type: { state: 'post' } },
            competitors: [
              { homeAway: 'home', team: { id: '331', displayName: 'Brighton & Hove Albion' }, score: '2' },
              { homeAway: 'away', team: { id: '360', displayName: 'Manchester United' }, score: '1' },
            ],
          }],
        },
        rosters: [],
      }),
    }));

    const { container } = render(<MatchDetailClient />);
    await act(async () => { await Promise.resolve(); });

    expect(container.querySelector('canvas')).toBeNull();
  });

  it('shows no fireworks for a scoreless draw with no penalty shootout', async () => {
    vi.setSystemTime(new Date('2026-08-08T17:00:00Z'));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        header: {
          competitions: [{
            date: '2026-08-08T15:00:00Z',
            status: { type: { state: 'post' } },
            competitors: [
              { homeAway: 'home', team: { id: '331', displayName: 'Brighton & Hove Albion' }, score: '1' },
              { homeAway: 'away', team: { id: '360', displayName: 'Manchester United' }, score: '1' },
            ],
          }],
        },
        rosters: [],
      }),
    }));

    const { container } = render(<MatchDetailClient />);
    await act(async () => { await Promise.resolve(); });

    expect(container.querySelector('canvas')).toBeNull();
  });

  it('shows no fireworks once the celebration window has passed', async () => {
    vi.setSystemTime(new Date('2026-08-11T12:00:00Z')); // 3 days after kickoff
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        header: {
          competitions: [{
            date: '2026-08-08T15:00:00Z',
            status: { type: { state: 'post' } },
            competitors: [
              { homeAway: 'home', team: { id: '331', displayName: 'Brighton & Hove Albion' }, score: '1' },
              { homeAway: 'away', team: { id: '360', displayName: 'Manchester United' }, score: '2' },
            ],
          }],
        },
        rosters: [],
      }),
    }));

    const { container } = render(<MatchDetailClient />);
    await act(async () => { await Promise.resolve(); });

    expect(container.querySelector('canvas')).toBeNull();
  });
});
