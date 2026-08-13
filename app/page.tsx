'use client';
import { useEffect, useRef, useState } from 'react';
import type { CompetitionId, MatchesResponse } from '@/lib/types';
import { visibleCompetitions } from '@/lib/competitions';
import { groupMatchesByMonth, isPastMonth } from '@/lib/schedule';
import { MatchList } from '@/components/MatchList';
import { PageHeading } from '@/components/PageHeading';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { usePolling } from '@/hooks/usePolling';
import { LIVE_TTL_MS } from '@/lib/cache';
import styles from './page.module.css';

type FilterValue = CompetitionId | 'ALL';

async function fetchMatches(force = false): Promise<MatchesResponse> {
  const res = await fetch(`/api/matches${force ? '?force=1' : ''}`);
  if (!res.ok) throw new Error('Failed to load matches');
  return res.json();
}

// [React] This filter used to live in a Context shared with the nav (Task 22 of the
// original plan) so the same selection could be read from both the layout header and
// this page. That need went away once the nav pills were dropped from Today and
// Standings (both show at most one match / their own local tabs) — Schedule is now the
// only place this filter is meaningful, so it's back to plain local `useState`, the
// same "lift state up no higher than needed" idea Task 18 first introduced.
export default function SchedulePage() {
  const [selected, setSelected] = useState<FilterValue>('ALL');
  const { data, loading, refetch, lastSyncedAt, error } = usePolling(fetchMatches, null, { key: 'matches', ttlMs: LIVE_TTL_MS });
  // [React] Rather than seeding this from an effect once `data` arrives (which would
  // need a "have we initialized yet" guard to avoid clobbering the user's own clicks on
  // a later re-render), `toggled` only ever tracks which groups the user has manually
  // flipped away from their computed default. A group's actual collapsed state is
  // `isPastMonth(...) XOR toggled.has(key)` — pure per-render, no seeding needed.
  const [toggled, setToggled] = useState<Set<string>>(new Set());

  function toggleGroup(key: string) {
    setToggled(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // Scrolls to today's fixture (if any) once, the first time it appears in the DOM —
  // guarded by a ref rather than state so later polls (which keep refreshing `data`)
  // don't yank the page back down every 30s while the user is reading something else.
  const scrolledToTodayRef = useRef(false);
  useEffect(() => {
    if (scrolledToTodayRef.current || !data) return;
    const todayKey = new Date().toISOString().slice(0, 10);
    const todayMatch = data.matches.find(m => m.utcDate.slice(0, 10) === todayKey);
    if (!todayMatch) return;
    const el = document.getElementById(`match-${todayMatch.id}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    scrolledToTodayRef.current = true;
  }, [data]);

  if (error && !data) return <p role="alert">{error.message}</p>;
  if (!data) return <LoadingSpinner />;
  const filtered: typeof data.matches = selected === 'ALL'
    ? data.matches
    : data.matches.filter(m => m.competition === (selected as CompetitionId));
  const groups = groupMatchesByMonth(filtered);
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayMatchId = data.matches.find(m => m.utcDate.slice(0, 10) === todayKey)?.id;

  return (
    <main className={styles.main}>
      <PageHeading title="Match" onRefresh={refetch} refreshing={loading} lastSyncedAt={lastSyncedAt} error={error} />
      <div role="tablist" className={styles.tabs}>
        <button role="tab" aria-selected={selected === 'ALL'} onClick={() => setSelected('ALL')} className={styles.tab}>ALL</button>
        {visibleCompetitions(data.matches).map(c => (
          <button key={c.id} role="tab" aria-selected={selected === c.id} onClick={() => setSelected(c.id)} className={styles.tab}>
            {c.navShortLabel}
          </button>
        ))}
      </div>
      {groups.length === 0 ? (
        <p>No matches for this competition</p>
      ) : (
        groups.map(group => {
          const isCollapsed = isPastMonth(group.key) !== toggled.has(group.key);
          return (
            <section key={group.key} className={styles.monthGroup}>
              <h2 className={styles.monthLabel}>
                <button
                  type="button"
                  className={styles.monthToggle}
                  aria-expanded={!isCollapsed}
                  onClick={() => toggleGroup(group.key)}
                >
                  <span className={styles.monthChevron} aria-hidden="true">{isCollapsed ? '▸' : '▾'}</span>
                  {group.label}
                </button>
              </h2>
              {!isCollapsed && <MatchList matches={group.matches} highlightId={todayMatchId} />}
            </section>
          );
        })
      )}
    </main>
  );
}
