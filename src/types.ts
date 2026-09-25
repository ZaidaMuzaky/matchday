export type TournamentStatus = "draft" | "active" | "completed";
export interface Team {
  id: string;
  name: string;
  seed: number;
  color: string;
}
export interface Match {
  id: string;
  round: number;
  index: number;
  teamA: string | null;
  teamB: string | null;
  scoreA: number | null;
  scoreB: number | null;
  winnerId: string | null;
  status: "waiting" | "ready" | "completed" | "bye";
}
export interface Tournament {
  id: string;
  name: string;
  sport: string;
  date: string;
  location: string;
  description: string;
  status: TournamentStatus;
  teams: Team[];
  matches: Match[];
  createdAt: string;
  isDemo?: boolean;
}
