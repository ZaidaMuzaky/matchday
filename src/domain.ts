import type { Match, Team, Tournament } from "./types";

const MIN_TEAMS = 2;
const MAX_TEAMS = 16;
const TEAM_COLORS = [
  "#355C7D",
  "#6C5B7B",
  "#C06C84",
  "#4F7C6A",
  "#8C6D46",
  "#5B6C8F",
  "#A05A5A",
  "#4C7A8A",
  "#7D6B9A",
  "#9A7653",
  "#4E806A",
  "#8A5B76",
  "#54708C",
  "#92704D",
  "#607B67",
  "#7D627E",
];

type TournamentInput = Pick<
  Tournament,
  "name" | "sport" | "date" | "location" | "description"
> & {
  teamNames: string[];
};

const newId = () => crypto.randomUUID();

function requiredText(
  value: unknown,
  label: string,
  maxLength: number,
): string {
  if (typeof value !== "string") throw new Error(`${label} must be text.`);
  const text = value.trim();
  if (!text) throw new Error(`${label} is required.`);
  if (text.length > maxLength)
    throw new Error(`${label} must be ${maxLength} characters or fewer.`);
  return text;
}

function optionalText(
  value: unknown,
  label: string,
  maxLength: number,
): string {
  if (typeof value !== "string") throw new Error(`${label} must be text.`);
  const text = value.trim();
  if (text.length > maxLength)
    throw new Error(`${label} must be ${maxLength} characters or fewer.`);
  return text;
}

function isCalendarDate(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!parts) return false;
  const year = Number(parts[1]);
  const month = Number(parts[2]);
  const day = Number(parts[3]);
  if (year < 2000 || year > 2100) return false;
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

function requiredDate(value: unknown): string {
  if (!isCalendarDate(value))
    throw new Error(
      "Date must be a real date from 2000 through 2100 in YYYY-MM-DD format.",
    );
  return value;
}

function bracketSize(teamCount: number): number {
  let size = MIN_TEAMS;
  while (size < teamCount) size *= 2;
  return size;
}

/** Seed positions for a conventional single-elimination bracket, left to right. */
function seedPositions(size: number): number[] {
  let positions = [1, 2];
  while (positions.length < size) {
    const nextSize = positions.length * 2;
    positions = positions.flatMap((seed) => [seed, nextSize + 1 - seed]);
  }
  return positions;
}

function roundCountFor(teamCount: number): number {
  return Math.log2(bracketSize(teamCount));
}

function scoreIsValid(scoreA: unknown, scoreB: unknown): boolean {
  return (
    Number.isInteger(scoreA) &&
    Number.isInteger(scoreB) &&
    (scoreA as number) >= 0 &&
    (scoreB as number) >= 0 &&
    (scoreA as number) <= 999 &&
    (scoreB as number) <= 999 &&
    scoreA !== scoreB
  );
}

function cloneMatch(match: Match): Match {
  return { ...match };
}

function normalizeMatches(teams: Team[], matches: Match[]): Match[] {
  const rounds = roundCountFor(teams.length);
  const size = bracketSize(teams.length);
  const byRound = Array.from({ length: rounds }, (_, round) =>
    matches
      .filter((match) => match.round === round)
      .sort((a, b) => a.index - b.index),
  );
  const firstRoundSeeds = seedPositions(size).map(
    (seed) => teams.find((team) => team.seed === seed)?.id ?? null,
  );

  for (let round = 0; round < rounds; round += 1) {
    const currentRound = byRound[round];
    for (const match of currentRound) {
      const teamA =
        round === 0
          ? (firstRoundSeeds[match.index * 2] ?? null)
          : (byRound[round - 1][match.index * 2]?.winnerId ?? null);
      const teamB =
        round === 0
          ? (firstRoundSeeds[match.index * 2 + 1] ?? null)
          : (byRound[round - 1][match.index * 2 + 1]?.winnerId ?? null);
      match.teamA = teamA;
      match.teamB = teamB;

      const automaticBye = round === 0 && (teamA === null || teamB === null);
      if (automaticBye) {
        match.scoreA = null;
        match.scoreB = null;
        match.winnerId = teamA ?? teamB;
        match.status = "bye";
      } else if (teamA !== null && teamB !== null) {
        if (scoreIsValid(match.scoreA, match.scoreB)) {
          match.winnerId =
            (match.scoreA as number) > (match.scoreB as number) ? teamA : teamB;
          match.status = "completed";
        } else {
          match.scoreA = null;
          match.scoreB = null;
          match.winnerId = null;
          match.status = "ready";
        }
      } else {
        match.scoreA = null;
        match.scoreB = null;
        match.winnerId = null;
        match.status = "waiting";
      }
    }
  }
  return byRound.flat();
}

function expectedMatchShape(teams: Team[]): Match[] {
  const rounds = roundCountFor(teams.length);
  const matches: Match[] = [];
  for (let round = 0; round < rounds; round += 1) {
    const count = bracketSize(teams.length) / 2 ** (round + 1);
    for (let index = 0; index < count; index += 1) {
      matches.push({
        id: "",
        round,
        index,
        teamA: null,
        teamB: null,
        scoreA: null,
        scoreB: null,
        winnerId: null,
        status: "waiting",
      });
    }
  }
  return matches;
}

export function createTournament(input: TournamentInput): Tournament {
  if (!Array.isArray(input.teamNames))
    throw new Error("Please provide a list of team names.");
  const names = input.teamNames.map((name) =>
    requiredText(name, "Team name", 40),
  );
  if (names.length < MIN_TEAMS || names.length > MAX_TEAMS) {
    throw new Error(
      `A tournament needs between ${MIN_TEAMS} and ${MAX_TEAMS} teams.`,
    );
  }
  if (
    new Set(names.map((name) => name.toLocaleLowerCase())).size !== names.length
  ) {
    throw new Error("Team names must be unique.");
  }

  return {
    id: newId(),
    name: requiredText(input.name, "Tournament name", 60),
    sport: requiredText(input.sport, "Sport", 40),
    date: requiredDate(input.date),
    location: optionalText(input.location, "Location", 100),
    description: optionalText(input.description, "Description", 500),
    status: "draft",
    teams: names.map((name, index) => ({
      id: newId(),
      name,
      seed: index + 1,
      color: TEAM_COLORS[index],
    })),
    matches: [],
    createdAt: new Date().toISOString(),
  };
}

export function generateBracket(tournament: Tournament): Tournament {
  if (!validateTournament(tournament))
    throw new Error("This tournament data is invalid.");
  if (tournament.status !== "draft")
    throw new Error("A bracket can only be generated for a draft tournament.");

  const matches = expectedMatchShape(tournament.teams).map((match) => ({
    ...match,
    id: newId(),
  }));
  const normalized = normalizeMatches(tournament.teams, matches);
  return { ...tournament, status: "active", matches: normalized };
}

function clearDescendantResults(matches: Match[], match: Match): void {
  let round = match.round + 1;
  let index = Math.floor(match.index / 2);
  while (round <= Math.max(...matches.map((item) => item.round))) {
    const descendant = matches.find(
      (item) => item.round === round && item.index === index,
    );
    if (!descendant) break;
    descendant.scoreA = null;
    descendant.scoreB = null;
    descendant.winnerId = null;
    round += 1;
    index = Math.floor(index / 2);
  }
}

export function recordScore(
  tournament: Tournament,
  matchId: string,
  scoreA: number,
  scoreB: number,
): Tournament {
  if (!validateTournament(tournament))
    throw new Error("This tournament data is invalid.");
  if (tournament.status === "draft")
    throw new Error("Generate the bracket before recording a score.");
  if (!scoreIsValid(scoreA, scoreB))
    throw new Error(
      "Scores must be whole numbers from 0 to 999, and cannot be tied.",
    );

  const matches = tournament.matches.map(cloneMatch);
  const match = matches.find((item) => item.id === matchId);
  if (!match) throw new Error("Match not found.");
  if (match.status === "waiting")
    throw new Error("This match is waiting for its teams.");
  if (match.status === "bye") throw new Error("A bye match cannot be scored.");
  if (match.status !== "ready" && match.status !== "completed")
    throw new Error("This match cannot be scored yet.");

  const nextWinnerId = scoreA > scoreB ? match.teamA : match.teamB;
  if (match.winnerId !== nextWinnerId) clearDescendantResults(matches, match);
  match.scoreA = scoreA;
  match.scoreB = scoreB;
  match.winnerId = null;
  const normalized = normalizeMatches(tournament.teams, matches);
  const finalMatch = normalized.find(
    (item) =>
      item.round === roundCountFor(tournament.teams.length) - 1 &&
      item.index === 0,
  );
  return {
    ...tournament,
    status: finalMatch?.status === "completed" ? "completed" : "active",
    matches: normalized,
  };
}

export function getRoundName(round: number, totalRounds: number): string {
  if (round === totalRounds - 1) return "Final";
  if (round === totalRounds - 2) return "Semifinals";
  if (round === totalRounds - 3) return "Quarterfinals";
  return `Round ${round + 1}`;
}

export function getTournamentProgress(tournament: Tournament): {
  completed: number;
  total: number;
} {
  const playable = tournament.matches.filter((match) => match.status !== "bye");
  return {
    completed: playable.filter((match) => match.status === "completed").length,
    total: playable.length,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isText(
  value: unknown,
  maxLength = Number.POSITIVE_INFINITY,
): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= maxLength
  );
}

function validateTournamentInternal(value: unknown): value is Tournament {
  if (
    !isRecord(value) ||
    !isText(value.id, 100) ||
    !isText(value.name, 60) ||
    !isText(value.sport, 40) ||
    !isCalendarDate(value.date) ||
    typeof value.location !== "string" ||
    value.location.length > 100 ||
    typeof value.description !== "string" ||
    value.description.length > 500 ||
    !isText(value.createdAt) ||
    Number.isNaN(Date.parse(value.createdAt)) ||
    (value.status !== "draft" &&
      value.status !== "active" &&
      value.status !== "completed") ||
    !Array.isArray(value.teams) ||
    !Array.isArray(value.matches) ||
    (value.isDemo !== undefined && typeof value.isDemo !== "boolean")
  )
    return false;

  const teams = value.teams;
  if (
    teams.length < MIN_TEAMS ||
    teams.length > MAX_TEAMS ||
    !teams.every(isRecord)
  )
    return false;
  if (
    !teams.every(
      (team, index) =>
        isText(team.id, 100) &&
        isText(team.name, 40) &&
        team.seed === index + 1 &&
        typeof team.color === "string" &&
        /^#[0-9a-fA-F]{6}$/.test(team.color),
    )
  )
    return false;
  if (
    new Set(teams.map((team) => team.id)).size !== teams.length ||
    new Set(teams.map((team) => (team.name as string).toLocaleLowerCase()))
      .size !== teams.length
  )
    return false;

  if (value.status === "draft") return value.matches.length === 0;
  const validTeams = teams as unknown as Team[];
  const expected = expectedMatchShape(validTeams);
  const matches = value.matches;
  if (
    matches.length !== expected.length ||
    !matches.every(isRecord) ||
    new Set(matches.map((match) => match.id)).size !== matches.length ||
    !matches.every((match) => isText(match.id, 100))
  )
    return false;

  const candidates = matches.map((match) => ({
    ...match,
  })) as unknown as Match[];
  if (
    !candidates.every(
      (match, index) =>
        Number.isInteger(match.round) &&
        Number.isInteger(match.index) &&
        match.round === expected[index].round &&
        match.index === expected[index].index,
    )
  )
    return false;
  const normalized = normalizeMatches(validTeams, candidates.map(cloneMatch));
  if (
    !normalized.every((match) => {
      const actual = matches.find(
        (item) => item.id === match.id,
      ) as unknown as Match;
      return (
        actual.round === match.round &&
        actual.index === match.index &&
        actual.teamA === match.teamA &&
        actual.teamB === match.teamB &&
        actual.scoreA === match.scoreA &&
        actual.scoreB === match.scoreB &&
        actual.winnerId === match.winnerId &&
        actual.status === match.status
      );
    })
  )
    return false;
  const finalMatch = normalized.find(
    (match) =>
      match.round === roundCountFor(teams.length) - 1 && match.index === 0,
  );
  return (
    value.status ===
    (finalMatch?.status === "completed" ? "completed" : "active")
  );
}

/** Safely checks locally stored or shared tournament snapshots without trusting their shape. */
export function validateTournament(value: unknown): value is Tournament {
  try {
    return validateTournamentInternal(value);
  } catch {
    return false;
  }
}

export function demoTournaments(): Tournament[] {
  const northside = generateBracket(
    createTournament({
      name: "Northside Cup",
      sport: "Football",
      date: "2026-09-26",
      location: "Riverside Sports Ground",
      description: "A community knockout tournament.",
      teamNames: [
        "Northside FC",
        "East End United",
        "Athletic Club",
        "Westside Rovers",
        "Riverside FC",
        "Southbank City",
        "Summit FC",
        "Parkside Athletic",
      ],
    }),
  );
  let active = northside;
  for (const [index, scoreA, scoreB] of [
    [0, 3, 1],
    [1, 2, 0],
    [2, 1, 0],
    [3, 2, 1],
  ] as const) {
    const match = active.matches.find(
      (item) => item.round === 0 && item.index === index,
    )!;
    active = recordScore(active, match.id, scoreA, scoreB);
  }

  const badminton = createTournament({
    name: "Weekend Badminton",
    sport: "Badminton",
    date: "2026-10-03",
    location: "Cedar Hall",
    description: "Bring your own racket.",
    teamNames: ["Ace Smashers", "Birdie Crew", "Court Kings", "Drop Shot"],
  });
  let completed = generateBracket(
    createTournament({
      name: "Harbour Volleyball Finals",
      sport: "Volleyball",
      date: "2026-09-12",
      location: "Harbour Arena",
      description: "The season finale.",
      teamNames: ["Tidebreakers", "Mariners", "Breakers", "Seagulls"],
    }),
  );
  for (const [round, index, scoreA, scoreB] of [
    [0, 0, 2, 0],
    [0, 1, 1, 2],
    [1, 0, 3, 1],
  ] as const) {
    const match = completed.matches.find(
      (item) => item.round === round && item.index === index,
    )!;
    completed = recordScore(completed, match.id, scoreA, scoreB);
  }
  return [
    { ...active, isDemo: true },
    { ...badminton, isDemo: true },
    { ...completed, isDemo: true },
  ];
}
