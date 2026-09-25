import type { Tournament } from "./types";
import { demoTournaments, validateTournament } from "./domain";

const KEY = "matchday.tournaments.v1";
export function loadTournaments(): {
  tournaments: Tournament[];
  warning: string;
} {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return { tournaments: demoTournaments(), warning: "" };
    const parsed: unknown = JSON.parse(raw);
    if (
      !Array.isArray(parsed) ||
      parsed.length > 100 ||
      !parsed.every(validateTournament) ||
      new Set(parsed.map((t) => t.id)).size !== parsed.length
    )
      throw new Error("Invalid data");
    return { tournaments: parsed, warning: "" };
  } catch {
    return {
      tournaments: demoTournaments(),
      warning:
        "Saved tournaments could not be loaded. Sample tournaments are shown. Your previous data has not been overwritten.",
    };
  }
}
export function saveTournaments(tournaments: Tournament[]): string {
  try {
    localStorage.setItem(KEY, JSON.stringify(tournaments));
    return "";
  } catch {
    return "Your browser could not save this change. Keep this tab open and export your tournament to keep a copy.";
  }
}
export function shareUrl(tournament: Tournament): string {
  const bytes = new TextEncoder().encode(JSON.stringify(tournament));
  const encoded = btoa(
    Array.from(bytes, (b) => String.fromCharCode(b)).join(""),
  );
  return `${window.location.origin}${window.location.pathname}#view=${encodeURIComponent(encoded)}`;
}
export function readSharedTournament(): {
  tournament: Tournament | null;
  error: string;
} {
  if (!window.location.hash.startsWith("#view="))
    return { tournament: null, error: "" };
  try {
    const hash = window.location.hash.slice(6);
    if (hash.length > 100000) throw new Error("Too large");
    const decoded = atob(decodeURIComponent(hash));
    const parsed: unknown = JSON.parse(
      new TextDecoder().decode(
        Uint8Array.from(decoded, (c) => c.charCodeAt(0)),
      ),
    );
    if (!validateTournament(parsed)) throw new Error("Invalid tournament");
    return { tournament: parsed, error: "" };
  } catch {
    return {
      tournament: null,
      error:
        "This shared tournament link is invalid or incomplete. Ask the organizer for a new link.",
    };
  }
}
export function exportTournament(tournament: Tournament) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(tournament, null, 2)], {
      type: "application/json",
    }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${
    tournament.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 60) || "tournament"
  }.json`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
