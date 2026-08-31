// lib/types.ts

export type CompetitionId = 'PL' | 'CL' | 'EL' | 'ECL' | 'FA' | 'EFL' | 'FRIENDLY';

export type MatchStatus = 'SCHEDULED' | 'TIMED' | 'IN_PLAY' | 'PAUSED' | 'FINISHED' | 'POSTPONED';

export interface Team {
  name: string;
  crest?: string;
}

export interface Score {
  home: number | null;
  away: number | null;
}

export interface MatchScore {
  fullTime: Score;
  display: Score;
}

export interface Match {
  id: string;
  utcDate: string;
  status: MatchStatus;
  competition: CompetitionId;
  home: Team;
  away: Team;
  venue: 'H' | 'A';
  score: MatchScore;
  minute?: string;
  sources: { fd?: number; espn?: string };
}

export interface StandingRow {
  position: number;
  team: Team;
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export interface MatchesResponse {
  season: string;
  matches: Match[];
  meta: { sources: { fd: boolean; espn: boolean } };
}

export interface Scorers {
  home: Array<{ name: string; mins: string[] }>;
  away: Array<{ name: string; mins: string[] }>;
  redCards: {
    home: Array<{ name: string; min: string }>;
    away: Array<{ name: string; min: string }>;
  };
}

export interface Substitution {
  min: string;
  playerIn: string;
  playerOut: string;
}

export interface MatchStatRow {
  label: string;
  home: { display: string; value: number };
  away: { display: string; value: number };
}

export interface ShootoutSummary {
  homeTeam: string;
  awayTeam: string;
  homeScore: string;
  awayScore: string;
  rounds: Array<{
    home?: { player: string; scored: boolean };
    away?: { player: string; scored: boolean };
  }>;
}

export interface PlayerTally {
  name: string;
  count: number;
}

export interface SeasonLeaders {
  topScorers: PlayerTally[];
  topAssists: PlayerTally[];
  topYellowCards: PlayerTally[];
}

// --- football-data.org v4 wire types (subset actually used; verified live 2026-07-16) ---

export interface FdMatch {
  id: number;
  utcDate: string;
  status: string;
  competition: { code: string };
  homeTeam: { name: string };
  awayTeam: { name: string };
  score: {
    duration: string;
    fullTime: { home: number | null; away: number | null };
    regularTime?: { home: number | null; away: number | null };
    extraTime?: { home: number | null; away: number | null };
  };
}

export interface FdStandingRow {
  position: number;
  team: { name: string; crest?: string };
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export interface FdSquadPlayer {
  name: string;
  position: string;
  dateOfBirth: string;
  nationality: string;
}

// --- ESPN site-api wire types (subset actually used; verified live 2026-07-16) ---

export interface EspnScheduleEvent {
  id: string;
  date: string;
  competitions: Array<{
    competitors: Array<{
      homeAway: 'home' | 'away';
      team: { id: string; displayName: string };
      score?: string;
    }>;
    status: { type: { state: 'pre' | 'in' | 'post'; name?: string }; displayClock?: string };
  }>;
}

export interface EspnScoringDetail {
  scoringPlay?: boolean;
  ownGoal?: boolean;
  penaltyKick?: boolean;
  shootout?: boolean;
  type?: { text?: string; abbreviation?: string };
  clock?: { displayValue?: string };
  team?: { id?: string };
  participants?: Array<{ athlete?: { id?: string; displayName?: string } }>;
}

export interface EspnRosterPlayer {
  starter: boolean;
  formationPlace?: string;
  position?: { abbreviation?: string };
  jersey?: string;
  athlete?: {
    id?: string;
    displayName?: string;
    shortName?: string;
    jerseyImages?: Array<{ href: string; rel?: string[] }>;
  };
}

export interface EspnRoster {
  homeAway: 'home' | 'away';
  team?: { displayName?: string; color?: string; abbreviation?: string; logos?: Array<{ href: string; rel?: string[] }> };
  formation?: string;
  // ESPN omits this for fixtures that haven't kicked off yet — lineups aren't published
  // until close to kickoff.
  roster?: EspnRosterPlayer[];
}

export interface EspnTeamAthlete {
  displayName: string;
  jersey?: string;
  position?: { displayName?: string };
}

export interface EspnTeamRoster {
  athletes: EspnTeamAthlete[];
}

export interface EspnKeyEvent {
  type?: { type?: string };
  clock?: { displayValue?: string; value?: number };
  team?: { id?: string };
  participants?: Array<{ athlete?: { displayName?: string } }>;
}

export interface EspnBoxscoreTeam {
  homeAway: 'home' | 'away';
  statistics?: Array<{ name?: string; displayValue?: string; label?: string }>;
}

export interface EspnShootoutTeam {
  id?: string;
  team?: string;
  shots?: Array<{ player: string; didScore: boolean }>;
}

export interface EspnDetail {
  header: {
    competitions: Array<{
      date?: string;
      status: { type: { state: 'pre' | 'in' | 'post'; name?: string }; displayClock?: string };
      details?: EspnScoringDetail[];
      competitors?: Array<{
        homeAway: 'home' | 'away';
        team?: { id?: string; displayName?: string; color?: string; logos?: Array<{ href: string; rel?: string[] }> };
        score?: string;
        shootoutScore?: string;
      }>;
    }>;
  };
  rosters?: EspnRoster[];
  keyEvents?: EspnKeyEvent[];
  boxscore?: { teams?: EspnBoxscoreTeam[] };
  shootout?: EspnShootoutTeam[];
}

export interface NewsArticle {
  id: string;
  source: 'BBC' | 'Guardian' | 'ESPN';
  sourceUrl: string;
  title: string;
  summary: string;
  imageUrl?: string;
  publishedAt: string;
}
