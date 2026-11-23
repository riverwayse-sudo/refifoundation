export type MatchStatus =
  | "LIVE"
  | "HT"
  | "FT"
  | "NS"
  | "PST"
  | "CANC"
  | "INT"
  | "UNKNOWN";

export type MatchTeam = {
  id: number | null;
  name: string;
  logo: string | null;
};

export type LiveMatch = {
  fixtureId: number;
  competition: string;
  country: string | null;
  kickoff: string;
  elapsedMinutes: number | null;
  status: MatchStatus;
  statusLabel: string;
  home: MatchTeam;
  away: MatchTeam;
  homeScore: number | null;
  awayScore: number | null;
  updatedAt: string;
};
