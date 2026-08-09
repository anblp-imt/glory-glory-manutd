# Win Celebration Fireworks — Design

**Goal:** When Manchester United win a match — by full-time score or by penalty shootout — show a brief, canvas-based fireworks animation on the match detail page, similar in spirit to Google's search-result celebration effect.

## 1. Trigger Logic

**New file:** `lib/celebration.ts` — two small pure functions, kept separate from the visual component so the trigger conditions are fully unit-testable.

### `manUtdWon(detail: EspnDetail): boolean`

Same team-id-matching convention already used by `extractScorers` / `extractSubstitutions` / `extractShootout` in `lib/merge.ts`, but keyed off `isManUtd(displayName)` (from `lib/normalize.ts`) instead of an ESPN id, since it only needs to know which side is MU, not merge per-team data.

```
if match state !== 'post' → false
if neither competitor is MU → false
if home score !== away score → MU side has the higher regulation score?
else (scores level or missing) → fall back to shootoutScore on each competitor:
  if both present and different → MU side has the higher shootout score?
  else → false (draw with no shootout, e.g. a league match)
```

### `isWithinCelebrationWindow(kickoffIso: string, now: Date): boolean`

ESPN's `header.competitions[0].date` is the kickoff time (not a finish time — ESPN doesn't expose one), which is good enough at day-level granularity since the caller already gates on `state === 'post'`.

```
windowEnd = midnight, local time, two calendar days after kickoff's local calendar date
return now < windowEnd
```

This gives "from full time through the end of the following day," in the viewer's own timezone, matching the requested "ngay sau khi kết thúc trận cho tới hết ngày sau đó."

**Type change:** add `date?: string` to `EspnDetail['header']['competitions'][number]` in `lib/types.ts` — ESPN already returns this field (confirmed against a live response), it's just not declared yet.

## 2. Visual Effect

**New files:** `components/WinFireworks.tsx` + `WinFireworks.module.css`.

Canvas-based "rocket" style approved from the demo: 3 rockets launch sequentially (staggered ~700ms apart) from random x-positions along the bottom, rise, then burst into ~45 particles each in the app's existing palette (`--mu-gold-bright`, `--mu-red`, `--mu-white`, `--mu-green`, `--mu-gold`). Total runtime ~3.2s, then the canvas clears itself and the component's effect stops drawing (the component stays mounted — no need to force an unmount — it just goes idle).

- No new dependency — hand-rolled `requestAnimationFrame` loop, matching the codebase's existing no-animation-library convention.
- `<canvas>` is a full-viewport overlay: `position: fixed; inset: 0; pointer-events: none; z-index: 50` — matching the existing `LoadingSpinner` overlay's z-index, the highest currently used in the codebase.
- `prefers-reduced-motion: reduce` → component renders **nothing** (returns `null`), checked once via `window.matchMedia('(prefers-reduced-motion: reduce)').matches` before ever creating the canvas. No frozen/static fallback — a fireworks burst frozen mid-frame would read as broken, not as a celebration.
- Animation starts once on mount (`useEffect` with `[]` deps) and cleans up its `requestAnimationFrame` on unmount.

## 3. Integration

**File changed:** `app/match/[id]/MatchDetailClient.tsx`.

```
celebrate = matchState === 'post'
  && manUtdWon(data)
  && isWithinCelebrationWindow(headerComp?.date, new Date())

{celebrate && <WinFireworks />}
```

No persistence (no `localStorage`/session flag) — per the approved design, the effect replays on every page load/refresh as long as the match is still within its celebration window. This matches how the rest of the match detail page already works (re-fetches happen on mount, no client-side "seen it" state anywhere else).

## 4. Testing

- **`lib/celebration.test.ts`** (new): full branch coverage —
  - MU home win by score / MU away win by score
  - MU loss by score
  - draw with no shootout data (false)
  - draw in regulation, MU wins on penalties (home MU and away MU cases)
  - draw in regulation, MU loses on penalties
  - match not yet `post` (false regardless of score)
  - `isWithinCelebrationWindow`: same day as kickoff (true), late on the day after (true), two days after (false)
- **`components/WinFireworks.test.tsx`** (new): mount/unmount-level behavior only —
  - renders a `<canvas>` element under normal conditions
  - renders nothing when `window.matchMedia` reports `prefers-reduced-motion: reduce`
  - cleans up (`cancelAnimationFrame` called) on unmount

  The particle simulation itself (trajectories, colors, timing) is not unit-testable through jsdom — no real canvas rasterization or rAF timing — same category of exception as `suppressHydrationWarning` earlier in this project: verified visually (dev server + Playwright screenshot) rather than through an assertion.
- **`MatchDetailClient.test.tsx`** (extend): integration-level — `<WinFireworks>` (or its canvas) appears for a finished, MU-won match within the window; absent for a loss, a scoreless draw, and (using a fixed/mocked `now`) once the window has passed.

## 5. Error Handling

No new failure modes — both trigger functions are pure and total (no throws), operating on data the page has already fetched successfully. If `header.competitions[0].date` is ever missing, `isWithinCelebrationWindow` receives `undefined`; `new Date(undefined)` produces an Invalid Date, which any comparison against `now` will correctly evaluate to `false` — celebration is skipped rather than erroring.
