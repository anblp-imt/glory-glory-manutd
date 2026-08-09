# Win Celebration Fireworks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When Manchester United win a match — by full-time score or by penalty shootout — show a brief, canvas-based fireworks animation on the match detail page.

**Architecture:** Two pure, fully-unit-tested trigger functions (`manUtdWon`, `isWithinCelebrationWindow`) in a new `lib/celebration.ts` decide *whether* to celebrate; a self-contained `WinFireworks` client component owns the canvas animation and decides nothing else. `MatchDetailClient` wires the two together with one boolean and one conditional render.

**Tech Stack:** React 19 / Next.js client component, hand-rolled Canvas 2D `requestAnimationFrame` loop — no new npm dependency. Vitest + Testing Library, jsdom environment.

## Global Constraints

- No new npm dependency — animation is hand-rolled Canvas API, matching the codebase's existing no-animation-library convention.
- Respect `prefers-reduced-motion: reduce` — when set, `WinFireworks` renders nothing at all (no static fallback).
- No persistence (no localStorage/session flag) — the effect replays on every page load within its window, per the approved spec.
- Spec reference: `docs/superpowers/specs/2026-08-09-win-celebration-fireworks-design.md`

---

## Task 1: `manUtdWon` trigger function

**Files:**
- Create: `lib/celebration.ts`
- Test: `lib/celebration.test.ts`

**Interfaces:**
- Consumes: `isManUtd(name: string): boolean` from `lib/normalize.ts` (already exists); `EspnDetail` type from `lib/types.ts` (already exists, has `header.competitions[0].competitors[].score` and `.shootoutScore`, both `string | undefined`).
- Produces: `export function manUtdWon(detail: EspnDetail): boolean` — used by Task 4.

- [ ] **Step 1: Write the failing tests**

Create `lib/celebration.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { manUtdWon } from './celebration';
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/celebration.test.ts`
Expected: FAIL — `Cannot find module './celebration'` (or similar "module not found").

- [ ] **Step 3: Write minimal implementation**

Create `lib/celebration.ts`:

```typescript
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/celebration.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/celebration.ts lib/celebration.test.ts
git commit -m "feat: add manUtdWon trigger logic for win-celebration effect"
```

---

## Task 2: `isWithinCelebrationWindow` trigger function

**Files:**
- Modify: `lib/celebration.ts` (append)
- Modify: `lib/celebration.test.ts` (append)

**Interfaces:**
- Produces: `export function isWithinCelebrationWindow(kickoffIso: string | undefined, now: Date): boolean` — used by Task 4.

- [ ] **Step 1: Write the failing tests**

Append to `lib/celebration.test.ts` (add the import and the new `describe` block):

```typescript
import { manUtdWon, isWithinCelebrationWindow } from './celebration';
```

(replace the existing `import { manUtdWon } from './celebration';` line with the one above)

```typescript
describe('isWithinCelebrationWindow', () => {
  const kickoff = '2026-08-08T15:00:00Z';

  it('returns true on the same calendar day as kickoff', () => {
    expect(isWithinCelebrationWindow(kickoff, new Date('2026-08-08T17:00:00Z'))).toBe(true);
  });

  it('returns true late on the day after kickoff', () => {
    expect(isWithinCelebrationWindow(kickoff, new Date('2026-08-09T23:30:00Z'))).toBe(true);
  });

  it('returns false two days after kickoff', () => {
    expect(isWithinCelebrationWindow(kickoff, new Date('2026-08-10T00:30:00Z'))).toBe(false);
  });

  it('returns false when kickoffIso is missing', () => {
    expect(isWithinCelebrationWindow(undefined, new Date('2026-08-08T17:00:00Z'))).toBe(false);
  });
});
```

> Note: this test uses UTC ISO strings for both `kickoff` and `now`, and `isWithinCelebrationWindow` compares using the *local* calendar day (`Date.getFullYear/getMonth/getDate`, which resolve in the test runner's local timezone). Vitest's default test environment runs in UTC (Node's default unless `TZ` is set), so these UTC-labelled dates and local-day comparisons agree in CI. If this ever runs somewhere with a non-UTC default timezone, adjust the fixture times accordingly — the important boundary is "day after kickoff's local calendar day."

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/celebration.test.ts`
Expected: FAIL — `isWithinCelebrationWindow is not a function` (the 4 new tests fail; the 9 `manUtdWon` tests still pass).

- [ ] **Step 3: Write minimal implementation**

Append to `lib/celebration.ts`:

```typescript
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/celebration.test.ts`
Expected: PASS (13 tests total).

- [ ] **Step 5: Commit**

```bash
git add lib/celebration.ts lib/celebration.test.ts
git commit -m "feat: add isWithinCelebrationWindow trigger logic for win-celebration effect"
```

---

## Task 3: `WinFireworks` canvas component

**Files:**
- Create: `components/WinFireworks.tsx`
- Create: `components/WinFireworks.module.css`
- Test: `components/WinFireworks.test.tsx`
- Modify: `vitest.setup.ts`

**Interfaces:**
- Produces: `export function WinFireworks(): JSX.Element | null` — used by Task 4. Takes no props; it's mounted/unmounted by the parent based on the parent's own trigger check.

**Why `vitest.setup.ts` needs a change first:** jsdom does not implement `window.matchMedia` (it's `undefined`, calling it throws `TypeError: ... is not a function`) or `HTMLCanvasElement.prototype.getContext('2d')` (it returns `null` and logs "Not implemented"). `WinFireworks` calls both. Without a shim, *every* test that renders `WinFireworks` — including the integration tests in Task 4 — fails or spams warnings. This follows the same pattern already in the file (`Element.prototype.scrollIntoView` is shimmed there for the same "jsdom doesn't implement X" reason).

- [ ] **Step 1: Add jsdom shims to `vitest.setup.ts`**

Read the current file first:

```bash
cat vitest.setup.ts
```

It currently reads:

```typescript
import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// jsdom doesn't implement scrollIntoView; Schedule's auto-scroll-to-today effect calls
// it unconditionally, which would otherwise throw "not implemented" in every test.
Element.prototype.scrollIntoView = vi.fn();
```

Replace its contents with:

```typescript
import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// jsdom doesn't implement scrollIntoView; Schedule's auto-scroll-to-today effect calls
// it unconditionally, which would otherwise throw "not implemented" in every test.
Element.prototype.scrollIntoView = vi.fn();

// jsdom doesn't implement matchMedia at all (it's undefined, not a stub) — default to
// "no preference" so any component checking prefers-reduced-motion doesn't throw.
// Tests that need to simulate the opposite use vi.spyOn(window, 'matchMedia').
window.matchMedia = window.matchMedia || (((query: string) => ({
  matches: false,
  media: query,
  addEventListener: () => {},
  removeEventListener: () => {},
})) as unknown as typeof window.matchMedia);

// jsdom doesn't implement canvas 2D rendering — getContext('2d') returns null and logs
// "Not implemented" otherwise. Components that draw on a canvas (e.g. WinFireworks) only
// need getContext to return a truthy, method-shaped object in tests; the actual drawing
// is never asserted on (see WinFireworks.test.tsx for why).
HTMLCanvasElement.prototype.getContext = ((() => ({
  clearRect: () => {},
  beginPath: () => {},
  arc: () => {},
  fill: () => {},
  setTransform: () => {},
  fillStyle: '',
  globalAlpha: 1,
})) as unknown) as typeof HTMLCanvasElement.prototype.getContext;
```

- [ ] **Step 2: Write the failing tests**

Create `components/WinFireworks.test.tsx`:

```typescript
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { WinFireworks } from './WinFireworks';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('WinFireworks', () => {
  it('renders a canvas overlay when motion is not reduced', () => {
    const { container } = render(<WinFireworks />);
    expect(container.querySelector('canvas')).not.toBeNull();
  });

  it('renders nothing when the viewer prefers reduced motion', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList);
    const { container } = render(<WinFireworks />);
    expect(container.querySelector('canvas')).toBeNull();
  });

  it('cancels its pending animation frame on unmount', () => {
    const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame');
    const { unmount } = render(<WinFireworks />);
    unmount();
    expect(cancelSpy).toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run components/WinFireworks.test.tsx`
Expected: FAIL — `Cannot find module './WinFireworks'` (or similar "module not found").

- [ ] **Step 4: Write minimal implementation**

Create `components/WinFireworks.module.css`:

```css
.overlay {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 50;
}
```

Create `components/WinFireworks.tsx`:

```typescript
'use client';
import { useEffect, useRef } from 'react';
import styles from './WinFireworks.module.css';

const COLORS = ['#FFD700', '#DA291C', '#EDE6D6', '#3fae5c', '#C9A227'];
const DURATION_MS = 3200;
const LAUNCH_DELAYS_MS = [0, 700, 1400];

function rand(a: number, b: number): number {
  return a + Math.random() * (b - a);
}

function pick<T>(arr: T[]): T {
  return arr[(Math.random() * arr.length) | 0];
}

interface Particle { x: number; y: number; vx: number; vy: number; life: number; color: string }
interface Rocket { delay: number; x: number; targetY: number; state: 'wait' | 'rising' | 'burst'; rocketY: number; particles: Particle[] }

export function WinFireworks() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const launches: Rocket[] = LAUNCH_DELAYS_MS.map(delay => ({
      delay, x: rand(w * 0.2, w * 0.8), targetY: rand(h * 0.25, h * 0.5), state: 'wait', rocketY: h, particles: [],
    }));

    function burst(l: Rocket) {
      for (let i = 0; i < 45; i++) {
        const angle = rand(0, Math.PI * 2);
        const speed = rand(1, 3.5);
        l.particles.push({ x: l.x, y: l.targetY, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 1, color: pick(COLORS) });
      }
    }

    const start = performance.now();
    let frameId: number;

    function tick(t: number) {
      const elapsed = t - start;
      ctx!.clearRect(0, 0, w, h);
      launches.forEach(l => {
        const local = elapsed - l.delay;
        if (local < 0) return;
        if (l.state === 'wait') l.state = 'rising';
        if (l.state === 'rising') {
          l.rocketY -= 5.5;
          ctx!.fillStyle = '#FFD700';
          ctx!.beginPath();
          ctx!.arc(l.x, l.rocketY, 2, 0, Math.PI * 2);
          ctx!.fill();
          if (l.rocketY <= l.targetY) { l.state = 'burst'; burst(l); }
        } else if (l.state === 'burst') {
          l.particles.forEach(p => {
            p.x += p.vx; p.y += p.vy; p.vy += 0.025; p.life -= 0.014;
            if (p.life <= 0) return;
            ctx!.globalAlpha = Math.max(p.life, 0);
            ctx!.fillStyle = p.color;
            ctx!.beginPath();
            ctx!.arc(p.x, p.y, 1.8, 0, Math.PI * 2);
            ctx!.fill();
          });
          ctx!.globalAlpha = 1;
        }
      });
      if (elapsed < DURATION_MS) {
        frameId = requestAnimationFrame(tick);
      } else {
        ctx!.clearRect(0, 0, w, h);
      }
    }
    frameId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frameId);
  }, []);

  return <canvas ref={canvasRef} className={styles.overlay} aria-hidden="true" />;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run components/WinFireworks.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 6: Run the full test suite to confirm the `vitest.setup.ts` shims don't break anything else**

Run: `npx vitest run --exclude '**/.claude/worktrees/**'`
Expected: same pass count as before this task, plus the 3 new `WinFireworks` tests. (The pre-existing 3 failing `lib/news*.test.ts` files, caused by a missing `fast-xml-parser` install unrelated to this work, are expected to still fail — do not try to fix them here.)

- [ ] **Step 7: Commit**

```bash
git add vitest.setup.ts components/WinFireworks.tsx components/WinFireworks.module.css components/WinFireworks.test.tsx
git commit -m "feat: add WinFireworks canvas celebration component"
```

---

## Task 4: Integrate into the match detail page

**Files:**
- Modify: `lib/types.ts:206-207` (add `date` field to `EspnDetail`)
- Modify: `app/match/[id]/MatchDetailClient.tsx:6-11` (imports), `:92` (add `celebrate`), `:96` (render `WinFireworks`)
- Modify: `app/match/[id]/MatchDetailClient.test.tsx` (append 4 tests)

**Interfaces:**
- Consumes: `manUtdWon(detail: EspnDetail): boolean` and `isWithinCelebrationWindow(kickoffIso: string | undefined, now: Date): boolean` from Task 1/2; `WinFireworks` from Task 3.

- [ ] **Step 1: Add the `date` field to `EspnDetail`**

In `lib/types.ts`, find this block (around line 204-216):

```typescript
export interface EspnDetail {
  header: {
    competitions: Array<{
      status: { type: { state: 'pre' | 'in' | 'post'; name?: string }; displayClock?: string };
      details?: EspnScoringDetail[];
```

Change the `competitions: Array<{` line's contents by adding `date?: string;` as the first field:

```typescript
export interface EspnDetail {
  header: {
    competitions: Array<{
      date?: string;
      status: { type: { state: 'pre' | 'in' | 'post'; name?: string }; displayClock?: string };
      details?: EspnScoringDetail[];
```

(The rest of the block — `competitors`, `score`, `shootoutScore`, the closing `}>;` and `};` — is unchanged.)

- [ ] **Step 2: Write the failing integration tests**

In `app/match/[id]/MatchDetailClient.test.tsx`, add this test near the end of the `describe('MatchDetailClient', ...)` block (after the last existing `it(...)`, before the closing `});` of the describe):

```typescript
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
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run app/match/\[id\]/MatchDetailClient.test.tsx`
Expected: FAIL — the first new test ("shows fireworks...") fails because no `<canvas>` is ever rendered yet (`celebrate` doesn't exist). The other 3 new tests pass trivially (there's genuinely no canvas yet), which isn't proof they work — that's fine, Step 5 (after implementing) re-runs everything to confirm the whole set is meaningful together.

- [ ] **Step 4: Wire it up in `MatchDetailClient.tsx`**

Change the import block at the top of `app/match/[id]/MatchDetailClient.tsx` (currently lines 1-11):

```typescript
'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { usePolling } from '@/hooks/usePolling';
import { FormationPitch } from '@/components/FormationPitch';
import { extractScorers, extractStats, extractSubstitutions, extractShootout, extractGoalContributions } from '@/lib/merge';
import { displayTeamName } from '@/lib/normalize';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { LIVE_TTL_MS, STATIC_TTL_MS } from '@/lib/cache';
import type { EspnDetail } from '@/lib/types';
import styles from './page.module.css';
```

to:

```typescript
'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { usePolling } from '@/hooks/usePolling';
import { FormationPitch } from '@/components/FormationPitch';
import { WinFireworks } from '@/components/WinFireworks';
import { extractScorers, extractStats, extractSubstitutions, extractShootout, extractGoalContributions } from '@/lib/merge';
import { displayTeamName } from '@/lib/normalize';
import { manUtdWon, isWithinCelebrationWindow } from '@/lib/celebration';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { LIVE_TTL_MS, STATIC_TTL_MS } from '@/lib/cache';
import type { EspnDetail } from '@/lib/types';
import styles from './page.module.css';
```

Find this line (currently line 92):

```typescript
  const matchState = headerComp?.status?.type?.state;
```

Add a new line directly after it:

```typescript
  const matchState = headerComp?.status?.type?.state;
  const celebrate = matchState === 'post' && manUtdWon(data) && isWithinCelebrationWindow(headerComp?.date, new Date());
```

Find the start of the returned JSX (currently lines 95-97):

```typescript
  return (
    <main className={styles.main}>
      <div className={styles.titleRow}>
```

Add the conditional render as the first child of `<main>`:

```typescript
  return (
    <main className={styles.main}>
      {celebrate && <WinFireworks />}
      <div className={styles.titleRow}>
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run app/match/\[id\]/MatchDetailClient.test.tsx`
Expected: PASS (all tests in the file, including the 4 new ones).

- [ ] **Step 6: Run the full test suite and typecheck**

Run: `npx vitest run --exclude '**/.claude/worktrees/**'`
Expected: same failing-file count as the project's known baseline (only the pre-existing, unrelated `lib/news*.test.ts` failures from missing `fast-xml-parser`), all other tests passing.

Run: `npx tsc --noEmit`
Expected: no new errors (the pre-existing `fast-xml-parser` type errors in `lib/newsBbc.ts` / `lib/newsGuardian.ts` are expected and unrelated).

- [ ] **Step 7: Commit**

```bash
git add lib/types.ts app/match/\[id\]/MatchDetailClient.tsx app/match/\[id\]/MatchDetailClient.test.tsx
git commit -m "feat: show win-celebration fireworks on the match detail page"
```

---

## Task 5: Visual verification

No new code in this task — this confirms the feature actually renders correctly in a real browser, since the canvas animation itself isn't observable through the jsdom-based unit tests (Task 3 explains why).

**Files:** none (uses a scratch script, not committed).

- [ ] **Step 1: Start the dev server**

```bash
npm run dev &
```

Wait for it to be ready:

```bash
for i in $(seq 1 30); do
  if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null | grep -q 200; then echo READY; break; fi
  sleep 1
done
```

- [ ] **Step 2: Write a scratch Playwright script that mocks a finished, MU-won match**

Save as a scratch file (not committed — outside the repo, e.g. your scratchpad directory):

```javascript
import { chromium } from 'playwright';

const mockDetail = {
  header: {
    competitions: [{
      date: new Date().toISOString(), // "now" so it's inside the celebration window
      status: { type: { state: 'post' } },
      competitors: [
        { homeAway: 'home', team: { id: '331', displayName: 'Brighton & Hove Albion' }, score: '1' },
        { homeAway: 'away', team: { id: '360', displayName: 'Manchester United' }, score: '2' },
      ],
    }],
  },
  rosters: [],
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
await page.route('**/api/match/**', route => {
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockDetail) });
});
await page.goto('http://localhost:3000/match/2026-08-08_parissaintgermain', { waitUntil: 'networkidle' });
await page.waitForTimeout(800); // let the rockets launch and burst
await page.screenshot({ path: 'fireworks-live-check.png' });
await browser.close();
console.log('done');
```

Run it with Node (requires `playwright` installed — if not already available in the project's scratch tooling, `npm install playwright && npx playwright install chromium --with-deps` first, same as used earlier in this project's development).

- [ ] **Step 3: Look at the screenshot**

Open `fireworks-live-check.png`. Confirm:
- Rocket trails and/or burst particles are visible over the page (gold, red, off-white, green, or muted gold dots), not a blank canvas.
- The rest of the page (score header, lineup, etc.) still renders normally underneath — the overlay isn't blocking anything visually broken.

- [ ] **Step 4: Check the browser console for errors**

Add before `page.screenshot(...)`:

```javascript
const errors = [];
page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
page.on('pageerror', err => errors.push(err.message));
```

and after the screenshot:

```javascript
console.log('console errors:', JSON.stringify(errors, null, 2));
```

Expected: `[]` (empty array).

- [ ] **Step 5: Stop the dev server**

```bash
lsof -ti:3000 -sTCP:LISTEN | xargs -r kill
```

No commit for this task — it's verification only, confirming Tasks 1-4's committed code actually works end-to-end in a real browser.
