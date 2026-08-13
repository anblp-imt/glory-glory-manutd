'use client';
import { useState } from 'react';
import type { CompetitionId, MatchesResponse, SeasonLeaders } from '@/lib/types';
import { COMPETITIONS, visibleCompetitions } from '@/lib/competitions';
import { computeSeasonStats } from '@/lib/seasonStats';
import { usePolling } from '@/hooks/usePolling';
import { LIVE_TTL_MS, LEADERS_TTL_MS } from '@/lib/cache';
import { PageHeading } from '@/components/PageHeading';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import styles from './page.module.css';

type FilterValue = CompetitionId | 'ALL';

async function fetchMatches(force = false): Promise<MatchesResponse> {
  const res = await fetch(`/api/matches${force ? '?force=1' : ''}`);
  if (!res.ok) throw new Error('Failed to load matches');
  return res.json();
}

async function fetchLeaders(force = false): Promise<SeasonLeaders> {
  const res = await fetch(`/api/leaders${force ? '?force=1' : ''}`);
  if (!res.ok) throw new Error('Failed to load leaders');
  return res.json();
}

export default function StatsClient() {
  const [selected, setSelected] = useState<FilterValue>('ALL');
  // Same 'matches' cache key as Today/Schedule/Standings — same endpoint, same data, so
  // arriving here after visiting any of those three renders instantly instead of
  // re-fetching (see hooks/usePolling.ts's client-cache doc comment for why).
  const {
    data, loading: matchesLoading, refetch: refetchMatches,
    lastSyncedAt: matchesSyncedAt, error: matchesError,
  } = usePolling(fetchMatches, null, { key: 'matches', ttlMs: LIVE_TTL_MS });
  const {
    data: leaders, loading: leadersLoading, refetch: refetchLeaders,
    lastSyncedAt: leadersSyncedAt, error: leadersError,
  } = usePolling(fetchLeaders, null, { key: 'leaders', ttlMs: LEADERS_TTL_MS });

  const refreshAll = () => {
    refetchMatches();
    refetchLeaders();
  };

  if (matchesError && !data) return <p role="alert">{matchesError.message}</p>;
  if (!data) return <LoadingSpinner />;

  // Season stats are a competitive-record view — pre-season/mid-season friendlies don't
  // count toward it, so they're filtered out here rather than in computeSeasonStats
  // (which stays generic; this exclusion is specific to what this page chooses to show).
  const competitiveMatches = data.matches.filter(m => m.competition !== 'FRIENDLY');
  const competitiveCompetitions = visibleCompetitions(
    competitiveMatches,
    COMPETITIONS.filter(c => c.id !== 'FRIENDLY'),
  );
  const stats = computeSeasonStats(competitiveMatches, selected);

  return (
    <main className={styles.main} data-testid="stats-page">
      <PageHeading
        title="Stats"
        onRefresh={refreshAll}
        refreshing={matchesLoading || leadersLoading}
        lastSyncedAt={Math.max(matchesSyncedAt ?? 0, leadersSyncedAt ?? 0) || null}
        error={matchesError || leadersError}
      />
      <div role="tablist" className={styles.tabs}>
        <button role="tab" aria-selected={selected === 'ALL'} onClick={() => setSelected('ALL')} className={styles.tab}>ALL</button>
        {competitiveCompetitions.map(c => (
          <button key={c.id} role="tab" aria-selected={selected === c.id} onClick={() => setSelected(c.id)} className={styles.tab}>
            {c.navShortLabel}
          </button>
        ))}
      </div>
      {stats.played === 0 ? (
        <p>No finished matches yet for this competition</p>
      ) : (
        <div className={styles.grid}>
          <div className={styles.tile}>
            <span className={styles.tileValue} data-testid="stat-played">{stats.played}</span>
            <span className={styles.tileLabel}>Played</span>
          </div>
          <div className={`${styles.tile} ${styles.won}`}>
            <span className={styles.tileValue} data-testid="stat-won">{stats.won}</span>
            <span className={styles.tileLabel}>Won</span>
          </div>
          <div className={`${styles.tile} ${styles.drawn}`}>
            <span className={styles.tileValue} data-testid="stat-drawn">{stats.drawn}</span>
            <span className={styles.tileLabel}>Drawn</span>
          </div>
          <div className={`${styles.tile} ${styles.lost}`}>
            <span className={styles.tileValue} data-testid="stat-lost">{stats.lost}</span>
            <span className={styles.tileLabel}>Lost</span>
          </div>
          <div className={styles.tile}>
            <span className={styles.tileValue} data-testid="stat-goalsFor">{stats.goalsFor}</span>
            <span className={styles.tileLabel}>Goals For</span>
          </div>
          <div className={styles.tile}>
            <span className={styles.tileValue} data-testid="stat-goalsAgainst">{stats.goalsAgainst}</span>
            <span className={styles.tileLabel}>Goals Against</span>
          </div>
          <div className={styles.tile}>
            <span className={styles.tileValue} data-testid="stat-goalDifference">{stats.goalDifference}</span>
            <span className={styles.tileLabel}>Goal Difference</span>
          </div>
        </div>
      )}
      <section className={styles.leaders}>
        <h2>Season Leaders</h2>
        <div className={styles.leadersGrid}>
          <div className={styles.leaderBoard}>
            <p className={styles.leaderBoardTitle}>Top Scorers</p>
            {leaders?.topScorers && leaders.topScorers.length > 0 ? (
              leaders.topScorers.map(p => (
                <div className={styles.leaderRow} key={p.name}>
                  <span>{p.name}</span>
                  <span className={styles.leaderCount}>{p.count}</span>
                </div>
              ))
            ) : (
              <p className={styles.leaderEmpty}>No data yet</p>
            )}
          </div>
          <div className={styles.leaderBoard}>
            <p className={styles.leaderBoardTitle}>Top Assists</p>
            {leaders?.topAssists && leaders.topAssists.length > 0 ? (
              leaders.topAssists.map(p => (
                <div className={styles.leaderRow} key={p.name}>
                  <span>{p.name}</span>
                  <span className={styles.leaderCount}>{p.count}</span>
                </div>
              ))
            ) : (
              <p className={styles.leaderEmpty}>No data yet</p>
            )}
          </div>
          <div className={styles.leaderBoard}>
            <p className={styles.leaderBoardTitle}>Top Yellow Cards</p>
            {leaders?.topYellowCards && leaders.topYellowCards.length > 0 ? (
              leaders.topYellowCards.map(p => (
                <div className={styles.leaderRow} key={p.name}>
                  <span>{p.name}</span>
                  <span className={styles.leaderCount}>{p.count}</span>
                </div>
              ))
            ) : (
              <p className={styles.leaderEmpty}>No data yet</p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
