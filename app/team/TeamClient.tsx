'use client';
import type { TeamGroup } from '@/lib/team';
import { PageHeading } from '@/components/PageHeading';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { JerseyIcon } from '@/components/JerseyIcon';
import { usePolling } from '@/hooks/usePolling';
import { STATIC_TTL_MS } from '@/lib/cache';
import styles from './page.module.css';

async function fetchTeam(force = false): Promise<{ groups: TeamGroup[] }> {
  const res = await fetch(`/api/team${force ? '?force=1' : ''}`);
  if (!res.ok) throw new Error('Failed to load team');
  return res.json();
}

export default function TeamClient() {
  const { data, loading, refetch, lastSyncedAt, error } = usePolling(fetchTeam, null, { key: 'team', ttlMs: STATIC_TTL_MS });
  const groups = data?.groups ?? [];

  if (error && !data) return <p role="alert">{error.message}</p>;

  return (
    <main className={styles.main}>
      <PageHeading
        title="Team"
        onRefresh={refetch}
        refreshing={loading}
        lastSyncedAt={lastSyncedAt}
        error={error}
      />
      <p className={styles.subtitle}>Current first-team squad, by position</p>

      {groups.length === 0 ? (
        <LoadingSpinner />
      ) : (
        groups.map(group => (
          <div key={group.label} className={styles.group}>
            <div className={styles.groupLabel} data-testid={`group-${group.label}`}>
              {group.label} <span className={styles.groupCount}>{group.players.length}</span>
            </div>
            <div className={styles.grid}>
              {group.players.map(player => {
                const [given, ...rest] = player.name.split(' ');
                const surname = rest.join(' ') || given;
                return (
                  <div key={player.name} className={styles.player}>
                    <JerseyIcon jersey={player.jersey} isGoalkeeper={group.label === 'Goalkeepers'} />
                    <span className={styles.name}>
                      <span className={styles.given}>{given}</span>
                      <span className={styles.surname}>{surname}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </main>
  );
}
