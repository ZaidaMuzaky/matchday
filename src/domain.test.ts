import { describe, expect, it } from "vitest";
import {
  createTournament,
  generateBracket,
  getTournamentProgress,
  recordScore,
  validateTournament,
} from "./domain";

function tournament(teamCount: number) {
  return createTournament({
    name: "Cup",
    sport: "Football",
    date: "2026-09-26",
    location: "Park",
    description: "",
    teamNames: Array.from(
      { length: teamCount },
      (_, index) => `Team ${index + 1}`,
    ),
  });
}

describe("tournament bracket", () => {
  it.each([2, 3, 5, 8, 16])(
    "builds and completes a %i-team bracket",
    (teamCount) => {
      let current = generateBracket(tournament(teamCount));
      while (current.status !== "completed") {
        const match = current.matches.find((item) => item.status === "ready");
        expect(match).toBeDefined();
        current = recordScore(current, match!.id, 2, 1);
      }
      expect(current.matches.at(-1)?.status).toBe("completed");
      expect(getTournamentProgress(current)).toEqual({
        completed: teamCount - 1,
        total: teamCount - 1,
      });
    },
  );

  it("uses conventional stable seed positions", () => {
    const bracket = generateBracket(tournament(8));
    expect(
      bracket.matches
        .filter((match) => match.round === 0)
        .map((match) => [match.teamA, match.teamB]),
    ).toEqual([
      [bracket.teams[0].id, bracket.teams[7].id],
      [bracket.teams[3].id, bracket.teams[4].id],
      [bracket.teams[1].id, bracket.teams[6].id],
      [bracket.teams[2].id, bracket.teams[5].id],
    ]);
  });

  it("clears dependent results only when a prior winner changes", () => {
    let current = generateBracket(tournament(4));
    const first = current.matches.find(
      (match) => match.round === 0 && match.index === 0,
    )!;
    const second = current.matches.find(
      (match) => match.round === 0 && match.index === 1,
    )!;
    current = recordScore(current, first.id, 2, 0);
    current = recordScore(current, second.id, 2, 0);
    const final = current.matches.find((match) => match.round === 1)!;
    current = recordScore(current, final.id, 3, 1);
    current = recordScore(current, first.id, 4, 1);
    expect(current.matches.find((match) => match.round === 1)!).toMatchObject({
      status: "completed",
      scoreA: 3,
      scoreB: 1,
    });
    current = recordScore(current, first.id, 0, 2);
    const changedFinal = current.matches.find((match) => match.round === 1)!;
    expect(changedFinal).toMatchObject({
      status: "ready",
      scoreA: null,
      scoreB: null,
      winnerId: null,
      teamA: first.teamB,
    });
  });

  it("rejects tied and out-of-bounds scores", () => {
    const bracket = generateBracket(tournament(2));
    const match = bracket.matches[0];
    expect(() => recordScore(bracket, match.id, 1, 1)).toThrow(
      /cannot be tied/i,
    );
    expect(() => recordScore(bracket, match.id, -1, 0)).toThrow(/0 to 999/i);
    expect(() => recordScore(bracket, match.id, 1.5, 0)).toThrow(
      /whole numbers/i,
    );
    expect(() => recordScore(bracket, match.id, 1000, 0)).toThrow(/0 to 999/i);
  });

  it("rejects malformed snapshots and accepts a generated bracket", () => {
    const bracket = generateBracket(tournament(5));
    expect(validateTournament(bracket)).toBe(true);
    expect(
      validateTournament({
        ...bracket,
        matches: [{ ...bracket.matches[0], winnerId: bracket.teams[0].id }],
      }),
    ).toBe(false);
    expect(
      validateTournament({
        ...bracket,
        matches: [{ ...bracket.matches[0], round: "0" }],
      }),
    ).toBe(false);
    expect(validateTournament({ ...bracket, date: "2026-02-30" })).toBe(false);
  });

  it("allows an empty location but bounds display text and dates", () => {
    expect(
      createTournament({
        name: "Cup",
        sport: "Football",
        date: "2026-09-26",
        location: "",
        description: "",
        teamNames: ["A", "B"],
      }).location,
    ).toBe("");
    expect(() =>
      createTournament({
        name: "x".repeat(61),
        sport: "Football",
        date: "2026-09-26",
        location: "",
        description: "",
        teamNames: ["A", "B"],
      }),
    ).toThrow(/60 characters/i);
    expect(() =>
      createTournament({
        name: "Cup",
        sport: "Football",
        date: "2026-02-30",
        location: "",
        description: "",
        teamNames: ["A", "B"],
      }),
    ).toThrow(/real date/i);
  });
});
