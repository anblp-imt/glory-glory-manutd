'use client';
import { Fragment, useMemo } from 'react';
import { buildFormationRows } from '@/lib/formation';
import { displayTeamAbbr, isManUtd } from '@/lib/normalize';
import type { EspnRoster, EspnRosterPlayer } from '@/lib/types';
import type { GoalContribution } from '@/lib/merge';
import styles from './FormationPitch.module.css';

// Prefer ESPN's own short form (surname only, e.g. "B. Fernandes"); fall back to the
// last word of the full name so an unexpected shape still renders something short.
function playerLabel(p: EspnRosterPlayer): string {
  if (p.athlete?.shortName) return p.athlete.shortName;
  const parts = (p.athlete?.displayName || '').split(' ');
  return parts.length > 1 ? parts.slice(1).join(' ') : parts[0] || '';
}

// Dark-mode kit renders white lines on a transparent background, which suits the green
// pitch backdrop better than the default light-mode jersey image.
function jerseyKitUrl(p: EspnRosterPlayer): string | undefined {
  const images = p.athlete?.jerseyImages || [];
  return images.find(img => img.rel?.includes('dark'))?.href || images[0]?.href;
}

// A team's crest reads reliably against the dark pitch regardless of the club's own brand
// color (e.g. PSG's navy blue name text was unreadable) — same dark-variant preference as
// the jersey kit render above.
function teamCrestUrl(team?: EspnRoster['team']): string | undefined {
  const logos = team?.logos || [];
  return logos.find(l => l.rel?.includes('dark'))?.href || logos[0]?.href;
}

// ESPN only exposes each club's default kit render, not the specific strip actually worn
// that match — two clubs whose default colors happen to be similar (e.g. Man Utd and
// Wrexham, both red) then render as visually identical shirts. Rather than trust that
// coincidence, the away side always gets a fixed gold ring instead of its real team
// color, so the two sides stay tellable apart regardless of how close their colors are.
function PlayerNode({
  player, isMu, side, teamColor, contribution,
}: { player: EspnRosterPlayer; isMu: boolean; side: 'home' | 'away'; teamColor?: string; contribution?: GoalContribution }) {
  const kitUrl = jerseyKitUrl(player);
  const isGk = player.position?.abbreviation === 'G';
  const ringColor = isMu && isGk ? 'var(--mu-green)' : side === 'away' ? 'var(--mu-gold-bright)' : teamColor;
  return (
    <span className={styles.node}>
      {kitUrl ? (
        <span className={styles.kitCircle} style={{ borderColor: ringColor }}>
          <img className={styles.kitImage} src={kitUrl} alt={player.jersey || ''} loading="lazy" />
        </span>
      ) : (
        <span className={`${styles.circle} ${isMu ? (isGk ? styles.gkCircle : styles.muCircle) : ''}`}>{player.jersey || player.formationPlace}</span>
      )}
      {contribution && (contribution.goals > 0 || contribution.assists > 0) && (
        <span className={styles.contribBadge}>
          {contribution.goals > 0 && `⚽${contribution.goals > 1 ? contribution.goals : ''}`}
          {contribution.assists > 0 && `🅰️${contribution.assists > 1 ? contribution.assists : ''}`}
        </span>
      )}
      <span className={styles.name}>{playerLabel(player)}</span>
    </span>
  );
}

export function FormationPitch({
  homeRoster, awayRoster, contributions,
}: { homeRoster?: EspnRoster; awayRoster?: EspnRoster; contributions?: Record<string, GoalContribution> }) {
  // [React] buildFormationRows re-sorts and re-groups every starter on every call. It's
  // cheap for 11 players, but this page re-renders every 30s from usePolling while a
  // match is live — useMemo means it only re-runs when the roster/formation actually
  // change, not on every unrelated re-render (e.g. the live minute ticking elsewhere).
  // Home sits below the midline defending the bottom goal, so its rows (and each row's
  // own left-right order) must mirror the away half — GK nearest the bottom edge,
  // attackers nearest the midline — otherwise the keeper renders as if it were a striker.
  const homeRows = useMemo(
    () => buildFormationRows(homeRoster?.roster, homeRoster?.formation)
      .map(row => [...row].reverse())
      .reverse(),
    [homeRoster],
  );
  const awayRows = useMemo(
    () => buildFormationRows(awayRoster?.roster, awayRoster?.formation),
    [awayRoster],
  );

  if (!homeRoster && !awayRoster) {
    return <p>Lineup not available for this match.</p>;
  }

  const homeIsMu = isManUtd(homeRoster?.team?.displayName || '');
  const awayIsMu = isManUtd(awayRoster?.team?.displayName || '');
  const homeColor = homeRoster?.team?.color ? `#${homeRoster.team.color}` : undefined;
  const awayColor = awayRoster?.team?.color ? `#${awayRoster.team.color}` : undefined;
  const homeSubs = homeRoster?.roster?.filter(p => !p.starter) || [];
  const awaySubs = awayRoster?.roster?.filter(p => !p.starter) || [];
  const homeCrest = teamCrestUrl(homeRoster?.team);
  const awayCrest = teamCrestUrl(awayRoster?.team);

  return (
    <div data-testid="formation-pitch" className={styles.pitch}>
      <div className={styles.pitchLines} />
      <div className={styles.teamLabel}>{displayTeamAbbr(awayRoster?.team?.displayName || '', awayRoster?.team?.abbreviation)}</div>
      <div className={styles.teamHalf}>
        {awayRoster?.formation && <span className={styles.formationBadge}>{awayRoster.formation}</span>}
        <div data-testid="away-rows">
          {awayRows.map((row, i) => (
            <div key={i} className={styles.row}>
              {row.map((p, j) => (
                <PlayerNode key={j} player={p} isMu={awayIsMu} side="away" teamColor={awayColor} contribution={p.athlete?.id ? contributions?.[p.athlete.id] : undefined} />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className={styles.midline}>
        <div className={styles.centerCircle} />
      </div>
      <div className={styles.teamHalf}>
        {homeRoster?.formation && <span className={styles.formationBadge}>{homeRoster.formation}</span>}
        <div data-testid="home-rows">
          {homeRows.map((row, i) => (
            <div key={i} className={styles.row}>
              {row.map((p, j) => (
                <PlayerNode key={j} player={p} isMu={homeIsMu} side="home" teamColor={homeColor} contribution={p.athlete?.id ? contributions?.[p.athlete.id] : undefined} />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className={styles.teamLabel}>{displayTeamAbbr(homeRoster?.team?.displayName || '', homeRoster?.team?.abbreviation)}</div>

      {(homeSubs.length > 0 || awaySubs.length > 0) && (
        <>
          <div className={styles.subsHead}>
            <span className={styles.subsTitle}>Subs</span>
          </div>
          <div className={styles.subsCols}>
            <div className={styles.subsCol}>
              {awayCrest ? (
                <img className={styles.subsCrest} src={awayCrest} alt={awayRoster?.team?.displayName || ''} />
              ) : (
                <span className={styles.subsColLabel}>{displayTeamAbbr(awayRoster?.team?.displayName || '', awayRoster?.team?.abbreviation)}</span>
              )}
              {awaySubs.map((p, i) => (
                <Fragment key={i}>
                  {i > 0 && <div className={styles.subDivider} />}
                  <div className={styles.sub}>
                    <span className={styles.subNum}>{p.jersey}</span>
                    <span className={styles.subName}>{playerLabel(p)}</span>
                  </div>
                </Fragment>
              ))}
            </div>
            <div className={`${styles.subsCol} ${styles.subsColMirror}`}>
              {homeCrest ? (
                <img className={styles.subsCrest} src={homeCrest} alt={homeRoster?.team?.displayName || ''} />
              ) : (
                <span className={styles.subsColLabel}>{displayTeamAbbr(homeRoster?.team?.displayName || '', homeRoster?.team?.abbreviation)}</span>
              )}
              {homeSubs.map((p, i) => (
                <Fragment key={i}>
                  {i > 0 && <div className={styles.subDivider} />}
                  <div className={styles.sub}>
                    <span className={styles.subNum}>{p.jersey}</span>
                    <span className={styles.subName}>{playerLabel(p)}</span>
                  </div>
                </Fragment>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
