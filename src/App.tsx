import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Download,
  Flag,
  GitBranch,
  List,
  MapPin,
  Menu,
  Plus,
  Search,
  Share2,
  Shield,
  Trophy,
  Users,
  X,
} from "lucide-react";
import type { Match, Team, Tournament } from "./types";
import {
  createTournament,
  generateBracket,
  getRoundName,
  getTournamentProgress,
  recordScore,
  validateTournament,
} from "./domain";
import {
  exportTournament,
  loadTournaments,
  readSharedTournament,
  saveTournaments,
  shareUrl,
} from "./storage";

type Page = "tournament" | "all" | "create" | "edit" | "guide";
type Tab = "bracket" | "matches" | "participants" | "details";
const dateLabel = (date: string) =>
  new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00`));
const statusLabel = (t: Tournament) =>
  t.status === "active"
    ? "In progress"
    : t.status === "draft"
      ? "Draft"
      : "Completed";
const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

function TeamAvatar({ team, small = false }: { team?: Team; small?: boolean }) {
  return (
    <span
      className={`team-avatar ${small ? "small" : ""}`}
      style={
        team ? { color: team.color, backgroundColor: `${team.color}12` } : {}
      }
    >
      {team ? initials(team.name) : <Shield size={14} />}
    </span>
  );
}
function Status({ tournament }: { tournament: Tournament }) {
  return (
    <span className={`status ${tournament.status}`}>
      <span />
      {statusLabel(tournament)}
    </span>
  );
}
function Button({
  children,
  onClick,
  kind = "secondary",
  disabled,
  type = "button",
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  kind?: string;
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
}) {
  return (
    <button
      className={`button ${kind} ${className}`}
      type={type}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

function Modal({
  title,
  children,
  close,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = ref.current;
    dialog?.showModal();
    dialog?.querySelector<HTMLInputElement>("input")?.focus();
    return () => {
      dialog?.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby="dialog-title"
      onCancel={close}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="dialog-content">
        <header>
          <h2 id="dialog-title">{title}</h2>
          <button
            className="icon-button"
            aria-label="Close dialog"
            onClick={close}
          >
            <X size={20} />
          </button>
        </header>
        {children}
      </div>
    </dialog>
  );
}

export default function App() {
  const [initial] = useState(loadTournaments);
  const [shared] = useState(readSharedTournament);
  const [tournaments, setTournaments] = useState(initial.tournaments);
  const [warning, setWarning] = useState(initial.warning);
  const [selectedId, setSelectedId] = useState(
    initial.tournaments[0]?.id ?? "",
  );
  const [page, setPage] = useState<Page>("tournament");
  const [tab, setTab] = useState<Tab>("bracket");
  const [mobileNav, setMobileNav] = useState(false);
  const [scoreMatch, setScoreMatch] = useState<Match | null>(null);
  const [sharing, setSharing] = useState(false);
  const [toast, setToast] = useState("");
  const [startConfirm, setStartConfirm] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const readOnly = !!shared.tournament;
  const tournament =
    shared.tournament ??
    tournaments.find((t) => t.id === selectedId) ??
    tournaments[0];
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    document.title = `${page === "tournament" && tournament ? tournament.name : "Your tournaments"} · Matchday`;
  }, [page, tournament]);
  function update(next: Tournament) {
    const values = tournaments.some((t) => t.id === next.id)
      ? tournaments.map((t) => (t.id === next.id ? next : t))
      : [...tournaments, next];
    setTournaments(values);
    setWarning(saveTournaments(values));
  }
  function openTournament(id: string) {
    setSelectedId(id);
    setPage("tournament");
    setTab("bracket");
    setMobileNav(false);
  }
  function navigate(next: Page) {
    setPage(next);
    setMobileNav(false);
  }
  function start() {
    if (!tournament) return;
    try {
      update(generateBracket(tournament));
      setStartConfirm(false);
      setTab("bracket");
      setToast("Bracket is ready. Let the games begin.");
    } catch (error) {
      setToast((error as Error).message);
    }
  }
  async function importFile(file?: File) {
    if (!file) return;
    try {
      if (file.size > 100000)
        throw new Error("Choose a Matchday JSON file smaller than 100 KB.");
      const value: unknown = JSON.parse(await file.text());
      if (!validateTournament(value))
        throw new Error(
          "This file is not a valid Matchday tournament. Choose a file exported from Matchday.",
        );
      const copy = {
        ...value,
        id: crypto.randomUUID(),
        name: `${value.name.slice(0, 53)} (copy)`,
        isDemo: false,
      };
      update(copy);
      openTournament(copy.id);
      setToast("Tournament imported as a new copy.");
    } catch (error) {
      setToast(
        error instanceof SyntaxError
          ? "This file could not be read. Choose a valid Matchday JSON export."
          : (error as Error).message,
      );
    }
    if (fileRef.current) fileRef.current.value = "";
  }
  if (shared.error)
    return (
      <main className="fatal">
        <div className="brand">
          <Brand />
          Matchday
        </div>
        <h1>This link couldn’t be opened</h1>
        <p>{shared.error}</p>
        <a className="button primary" href={window.location.pathname}>
          Open your workspace
        </a>
      </main>
    );

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <aside
        className={`sidebar ${mobileNav ? "open" : ""}`}
        aria-label="Main navigation"
      >
        <a
          href={window.location.pathname}
          className="brand"
          aria-label="Matchday home"
        >
          <Brand />
          <span>
            matchday<span className="brand-dot">.</span>
          </span>
        </a>
        <div className="workspace-tag">
          <span className="workspace-avatar">M</span>
          <div>
            My workspace<small>Personal workspace</small>
          </div>
          <span className="workspace-plan">Free</span>
        </div>
        <nav>
          <button
            className={`nav-item ${page === "all" || page === "tournament" || page === "edit" ? "selected" : ""}`}
            onClick={() => navigate(readOnly ? "tournament" : "all")}
          >
            <Trophy size={19} />
            Tournaments
            {!readOnly && (
              <span className="nav-count">{tournaments.length}</span>
            )}
          </button>
          {!readOnly && (
            <button
              className={`nav-item ${page === "create" ? "selected" : ""}`}
              onClick={() => navigate("create")}
            >
              <Plus size={19} />
              Create tournament
            </button>
          )}
        </nav>
        {!readOnly && (
          <div className="sidebar-events">
            <p>Your tournaments</p>
            {tournaments.slice(0, 6).map((t) => (
              <button
                key={t.id}
                className={`event-link ${page === "tournament" && tournament?.id === t.id ? "current" : ""}`}
                onClick={() => openTournament(t.id)}
              >
                <span className={`event-dot ${t.status}`} />
                <span>{t.name}</span>
              </button>
            ))}
          </div>
        )}
        <div className="sidebar-bottom">
          <button
            className={`nav-item ${page === "guide" ? "selected" : ""}`}
            onClick={() => navigate("guide")}
          >
            <CircleHelp size={19} />
            Quick guide
            <ArrowRight size={15} />
          </button>
          <div className="local-note">
            <span className="local-dot" />
            <div>
              {readOnly ? "Shared snapshot" : "Saved on this device"}
              <small>
                {readOnly
                  ? "Read-only tournament view"
                  : "Your workspace, no sign-in needed"}
              </small>
            </div>
          </div>
        </div>
      </aside>
      {mobileNav && (
        <button
          className="nav-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobileNav(false)}
        />
      )}
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumbs">
            <button
              className="icon-button mobile-toggle"
              aria-label="Toggle navigation"
              aria-expanded={mobileNav}
              onClick={() => setMobileNav(!mobileNav)}
            >
              <Menu size={21} />
            </button>
            <button onClick={() => navigate(readOnly ? "tournament" : "all")}>
              Workspace
            </button>
            <ChevronRight size={14} />
            <span>
              {page === "create"
                ? "Create tournament"
                : page === "guide"
                  ? "Quick guide"
                  : "Tournaments"}
            </span>
          </div>
          <span className="workspace-label">
            <span />
            {readOnly ? "Spectator view" : "Organizer workspace"}
          </span>
        </header>
        <main id="main-content" tabIndex={-1}>
          {warning && !readOnly && (
            <div className="warning" role="alert">
              {warning}
            </div>
          )}
          {readOnly && (
            <div className="shared-banner">
              <Share2 size={17} />
              <span>
                You’re viewing a read-only snapshot. Results reflect when this
                link was created.
              </span>
              <a href={window.location.pathname}>
                Your workspace <ArrowRight size={14} />
              </a>
            </div>
          )}
          {page === "all" && !readOnly ? (
            <TournamentList
              tournaments={tournaments}
              open={openTournament}
              create={() => navigate("create")}
              importFile={() => fileRef.current?.click()}
            />
          ) : (page === "create" || page === "edit") && !readOnly ? (
            <TournamentForm
              key={page === "edit" ? tournament?.id : "new"}
              existing={page === "edit" ? tournament : undefined}
              cancel={() => navigate(tournament ? "tournament" : "all")}
              save={(t) => {
                update(t);
                openTournament(t.id);
                setToast(
                  "Tournament saved. Review your seeds, then generate the bracket.",
                );
              }}
            />
          ) : page === "guide" ? (
            <Guide
              create={() => navigate(readOnly ? "tournament" : "create")}
              readOnly={readOnly}
            />
          ) : tournament ? (
            <>
              <div className="page-back">
                <button onClick={() => navigate(readOnly ? "guide" : "all")}>
                  <ArrowLeft size={15} />
                  {readOnly ? "Quick guide" : "All tournaments"}
                </button>
                {tournament.isDemo && (
                  <span className="demo-label">
                    Sample tournament · try it out
                  </span>
                )}
              </div>
              <section className="tournament-header">
                <div className="tournament-identity">
                  <div className="tournament-mark">
                    <Trophy size={27} strokeWidth={1.6} />
                  </div>
                  <div>
                    <div className="title-line">
                      <h1>{tournament.name}</h1>
                      <Status tournament={tournament} />
                    </div>
                    <div className="event-meta">
                      <span>{tournament.sport}</span>
                      <span className="meta-dot">·</span>
                      <span>Single elimination</span>
                      <span className="meta-dot">·</span>
                      <span>
                        <Users size={14} />
                        {tournament.teams.length} teams
                      </span>
                    </div>
                  </div>
                </div>
                <div className="header-actions">
                  <Button
                    onClick={() => {
                      exportTournament(tournament);
                      setToast(
                        "Tournament exported. Keep the file as a backup.",
                      );
                    }}
                  >
                    <Download size={16} />
                    <span>Export</span>
                  </Button>
                  <Button kind="primary" onClick={() => setSharing(true)}>
                    <Share2 size={16} />
                    Share tournament
                  </Button>
                </div>
              </section>
              <div className="event-strip">
                <span>
                  <CalendarDays size={16} />
                  {dateLabel(tournament.date)}
                </span>
                <span>
                  <MapPin size={16} />
                  {tournament.location || "Location to be confirmed"}
                </span>
                <span className="event-strip-end">
                  {readOnly
                    ? "Read-only snapshot"
                    : warning
                      ? "Saving needs attention"
                      : "Changes saved automatically"}
                </span>
              </div>
              <nav className="tabs" aria-label="Tournament sections">
                {(
                  [
                    { key: "bracket", label: "Bracket", icon: GitBranch },
                    { key: "matches", label: "Matches", icon: List },
                    { key: "participants", label: "Participants", icon: Users },
                    { key: "details", label: "Details", icon: Flag },
                  ] as const
                ).map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    aria-current={tab === key ? "page" : undefined}
                    className={tab === key ? "active" : ""}
                    onClick={() => setTab(key)}
                  >
                    <Icon size={17} />
                    {label}
                    {key === "participants" && (
                      <span className="tab-count">
                        {tournament.teams.length}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
              {tab === "bracket" && (
                <Bracket
                  tournament={tournament}
                  readOnly={readOnly}
                  score={setScoreMatch}
                  start={() => setStartConfirm(true)}
                  list={() => setTab("matches")}
                />
              )}
              {tab === "matches" && (
                <Matches
                  tournament={tournament}
                  score={setScoreMatch}
                  readOnly={readOnly}
                  start={() => setStartConfirm(true)}
                />
              )}
              {tab === "participants" && (
                <Participants
                  tournament={tournament}
                  update={update}
                  readOnly={readOnly}
                  edit={() => navigate("edit")}
                />
              )}
              {tab === "details" && (
                <Details
                  tournament={tournament}
                  readOnly={readOnly}
                  edit={() => navigate("edit")}
                />
              )}
              <footer className="page-footer">
                <span>Good games. Less admin.</span>
                <button onClick={() => navigate("guide")}>
                  Need a hand?
                  <CircleHelp size={14} />
                </button>
              </footer>
            </>
          ) : (
            <TournamentList
              tournaments={tournaments}
              open={openTournament}
              create={() => navigate("create")}
              importFile={() => fileRef.current?.click()}
            />
          )}
        </main>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json"
        className="visually-hidden"
        aria-label="Import tournament file"
        onChange={(e) => void importFile(e.target.files?.[0])}
      />
      {scoreMatch && tournament && !readOnly && (
        <ScoreDialog
          key={scoreMatch.id}
          tournament={tournament}
          match={scoreMatch}
          close={() => setScoreMatch(null)}
          save={(a, b) => {
            const next = recordScore(tournament, scoreMatch.id, a, b);
            update(next);
            setScoreMatch(null);
            setToast(
              next.status === "completed"
                ? "Final score saved. Your champion is crowned!"
                : "Score saved. The winner advances automatically.",
            );
          }}
        />
      )}
      {sharing && tournament && (
        <ShareDialog tournament={tournament} close={() => setSharing(false)} />
      )}
      {startConfirm && tournament && (
        <Modal title="Ready to start?" close={() => setStartConfirm(false)}>
          <p>
            Generate a seeded bracket for {tournament.teams.length} teams. Team
            names and seeds will be locked once the tournament starts.
          </p>
          <p className="muted">
            {2 ** Math.ceil(Math.log2(tournament.teams.length)) -
              tournament.teams.length >
            0
              ? "Top seeds receive a bye where needed. "
              : ""}
            You can record or correct match results at any time.
          </p>
          <div className="dialog-actions">
            <Button onClick={() => setStartConfirm(false)}>Keep editing</Button>
            <Button kind="primary" onClick={start}>
              Lock seeds & start
              <ArrowRight size={16} />
            </Button>
          </div>
        </Modal>
      )}
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={18} />
          <span>{toast}</span>
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

function Brand() {
  return (
    <svg
      className="brand-symbol"
      width="31"
      height="31"
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
    >
      <rect width="40" height="40" rx="10" fill="currentColor" />
      <path
        d="M10 12v16m0-8h7v-8h7v16m0-8h6v-8"
        stroke="white"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Bracket({
  tournament: t,
  readOnly,
  score,
  start,
  list,
}: {
  tournament: Tournament;
  readOnly: boolean;
  score: (m: Match) => void;
  start: () => void;
  list: () => void;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canScroll, setCanScroll] = useState(false);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const measure = () =>
      setCanScroll(canvas.scrollWidth > canvas.clientWidth + 1);
    const observer = new ResizeObserver(measure);
    observer.observe(canvas);
    measure();
    return () => observer.disconnect();
  }, [t.id, t.status, t.teams.length]);
  if (t.status === "draft")
    return <EmptyBracket tournament={t} readOnly={readOnly} start={start} />;
  const rounds = Math.max(...t.matches.map((m) => m.round)) + 1;
  const progress = getTournamentProgress(t);
  const next = t.matches.find((m) => m.status === "ready");
  const final = t.matches.find((m) => m.round === rounds - 1);
  const champion = t.teams.find((team) => team.id === final?.winnerId);
  return (
    <section className="bracket-section">
      <div className="section-heading">
        <div>
          <h2>Tournament bracket</h2>
          <p>
            {t.status === "completed"
              ? "Every match played. One well-earned title."
              : readOnly
                ? "The road to the final. Every match, all in one place."
                : "Select a ready match to record a score. Winners advance automatically."}
          </p>
        </div>
        <div className="bracket-controls">
          <span className="progress-label">
            <span className="progress-dots">
              {Array.from({ length: Math.min(progress.total, 15) }, (_, i) => (
                <i key={i} className={i < progress.completed ? "filled" : ""} />
              ))}
            </span>
            {progress.completed} of {progress.total} played
          </span>
          <div className="view-switch" aria-label="Match view">
            <button
              className="selected"
              aria-label="Bracket view"
              aria-pressed="true"
            >
              <GitBranch size={17} />
            </button>
            <button
              onClick={list}
              aria-label="Switch to match list"
              aria-pressed="false"
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </div>
      <div className="bracket-scroll-hint" hidden={!canScroll}>
        <ArrowRight size={14} />
        Scroll sideways to see every round, or switch to the match list.
      </div>
      <div
        ref={canvasRef}
        className="bracket-canvas"
        role="region"
        aria-label="Tournament bracket, scroll horizontally to see all rounds"
        tabIndex={0}
      >
        <div
          className="bracket-rounds"
          style={{ minWidth: rounds * 276 + 145 }}
        >
          {Array.from({ length: rounds }, (_, round) => (
            <div className="bracket-round" key={round}>
              <header className="round-title">
                <span>{getRoundName(round, rounds)}</span>
                <span>
                  {t.matches.filter((m) => m.round === round).length}{" "}
                  {t.matches.filter((m) => m.round === round).length === 1
                    ? "match"
                    : "matches"}
                </span>
              </header>
              <div className="round-matches">
                {t.matches
                  .filter((m) => m.round === round)
                  .map((m) => (
                    <div
                      className={`match-slot ${round < rounds - 1 ? "has-next" : ""} ${round > 0 ? "has-previous" : ""}`}
                      key={m.id}
                    >
                      <MatchCard
                        match={m}
                        tournament={t}
                        readOnly={readOnly}
                        score={() => score(m)}
                      />
                    </div>
                  ))}
              </div>
            </div>
          ))}
          <div className="champion-column">
            <header className="round-title">Champion</header>
            <div className={`champion ${champion ? "decided" : ""}`}>
              <div className="champion-trophy">
                <Trophy size={31} strokeWidth={1.5} />
              </div>
              {champion ? (
                <>
                  <strong>{champion.name}</strong>
                  <span>{t.name} winners</span>
                </>
              ) : (
                <>
                  <strong>The title awaits</strong>
                  <span>One team. One trophy.</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="bracket-legend">
        <span>
          <i className="legend-dot completed" />
          Completed
        </span>
        <span>
          <i className="legend-dot ready" />
          Ready to play
        </span>
        <span>
          <i className="legend-dot waiting" />
          Upcoming
        </span>
        <span className="legend-hint">
          {readOnly
            ? "Shared results snapshot"
            : "Select a match to record or edit a score"}
        </span>
      </div>
      {next && (
        <div className="next-match">
          <div className="next-icon">
            <Flag size={21} />
          </div>
          <div className="next-copy">
            <strong>Next up: {getRoundName(next.round, rounds)}</strong>
            <span>
              {t.teams.find((team) => team.id === next.teamA)?.name}{" "}
              <span className="versus">vs</span>{" "}
              {t.teams.find((team) => team.id === next.teamB)?.name}
            </span>
          </div>
          {!readOnly && (
            <Button onClick={() => score(next)}>
              Record score
              <ArrowRight size={16} />
            </Button>
          )}
          <span className="next-count">
            {t.matches.filter((m) => m.status === "ready").length} matches ready
          </span>
        </div>
      )}
      {champion && (
        <div className="winner-banner">
          <Trophy size={25} />
          <div>
            <strong>Congratulations, {champion.name}.</strong>
            <p>
              The tournament is complete. Share the bracket to celebrate the
              result.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

function MatchCard({
  match: m,
  tournament: t,
  readOnly,
  score,
}: {
  match: Match;
  tournament: Tournament;
  readOnly: boolean;
  score: () => void;
}) {
  const enabled =
    !readOnly && (m.status === "ready" || m.status === "completed");
  const teams = [
    t.teams.find((team) => team.id === m.teamA),
    t.teams.find((team) => team.id === m.teamB),
  ];
  const totalRounds = Math.max(...t.matches.map((match) => match.round)) + 1;
  const label =
    m.status === "completed"
      ? "Completed"
      : m.status === "ready"
        ? "Ready to play"
        : m.status === "bye"
          ? "Bye · auto-advanced"
          : "Upcoming";
  return (
    <div className={`match-card ${m.status}`}>
      <div className="match-meta">
        <span>
          Match {t.matches.findIndex((match) => match.id === m.id) + 1}
        </span>
        <span className="match-state">
          {m.status === "completed" && <Check size={11} />}
          {m.status === "ready" && <i />}
          {label}
        </span>
      </div>
      <button
        className="match-body"
        disabled={!enabled}
        onClick={score}
        aria-label={`${m.status === "completed" ? "Edit score" : "Record score"}: ${teams[0]?.name ?? "To be decided"} versus ${teams[1]?.name ?? "To be decided"}`}
      >
        {teams.map((team, i) => (
          <span
            className={`team-row ${team?.id === m.winnerId ? "winner" : ""} ${!team ? "unresolved" : ""}`}
            key={i}
          >
            <span className="seed">{team?.seed ?? "—"}</span>
            <TeamAvatar team={team} small />
            <span className="team-name">
              {team?.name ??
                (m.status === "bye"
                  ? "Bye"
                  : m.round > 0
                    ? `Winner of ${getRoundName(m.round - 1, totalRounds).toLowerCase()} ${m.index * 2 + i + 1}`
                    : "To be decided")}
            </span>
            <span className="score">
              {(i === 0 ? m.scoreA : m.scoreB) ?? "—"}
            </span>
            {team?.id === m.winnerId && (
              <ChevronRight size={13} className="winner-arrow" />
            )}
          </span>
        ))}
      </button>
    </div>
  );
}

function EmptyBracket({
  tournament,
  readOnly,
  start,
}: {
  tournament: Tournament;
  readOnly: boolean;
  start: () => void;
}) {
  return (
    <section className="empty-state">
      <div className="empty-icon">
        <GitBranch size={36} strokeWidth={1.4} />
      </div>
      <h2>Your teams are in. Let’s set the stage.</h2>
      <p>
        {tournament.teams.length} teams are ready. Review their seeds in
        Participants, then generate your single-elimination bracket.
      </p>
      {!readOnly && (
        <Button kind="primary" onClick={start}>
          Generate bracket
          <ArrowRight size={17} />
        </Button>
      )}
    </section>
  );
}

function Matches({
  tournament: t,
  score,
  readOnly,
  start,
}: {
  tournament: Tournament;
  score: (m: Match) => void;
  readOnly: boolean;
  start: () => void;
}) {
  const [filter, setFilter] = useState("all");
  if (t.status === "draft")
    return <EmptyBracket tournament={t} readOnly={readOnly} start={start} />;
  const rounds = Math.max(...t.matches.map((m) => m.round)) + 1;
  const filtered = t.matches.filter(
    (m) => filter === "all" || m.status === filter,
  );
  return (
    <section className="content-section">
      <div className="section-heading">
        <div>
          <h2>Match center</h2>
          <p>Record results and keep the tournament moving.</p>
        </div>
        <label className="filter-label">
          <span className="visually-hidden">Filter matches</span>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All matches</option>
            <option value="ready">Ready to play</option>
            <option value="completed">Completed</option>
            <option value="waiting">Upcoming</option>
          </select>
        </label>
      </div>
      <div className="match-list">
        {filtered.map((m) => (
          <div className="match-list-row" key={m.id}>
            <div className="match-list-round">
              {getRoundName(m.round, rounds)}
              <small>Match {t.matches.indexOf(m) + 1}</small>
            </div>
            <MatchCard
              match={m}
              tournament={t}
              score={() => score(m)}
              readOnly={readOnly}
            />
            {!readOnly && (m.status === "ready" || m.status === "completed") ? (
              <Button onClick={() => score(m)}>
                {m.status === "completed" ? "Edit score" : "Record score"}
                <ArrowRight size={15} />
              </Button>
            ) : (
              <span className="muted">
                {m.status === "waiting"
                  ? "Waiting for results"
                  : m.status === "bye"
                    ? "Automatically advanced"
                    : "Result recorded"}
              </span>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="empty-inline">
            <h3>No matches here yet</h3>
            <p>Choose another filter to see the rest of the bracket.</p>
            <Button onClick={() => setFilter("all")}>Show all matches</Button>
          </div>
        )}
      </div>
    </section>
  );
}

function Participants({
  tournament: t,
  update,
  readOnly,
  edit,
}: {
  tournament: Tournament;
  update: (t: Tournament) => void;
  readOnly: boolean;
  edit: () => void;
}) {
  const editable = t.status === "draft" && !readOnly;
  function move(index: number, offset: number) {
    const teams = [...t.teams];
    [teams[index], teams[index + offset]] = [
      teams[index + offset],
      teams[index],
    ];
    update({ ...t, teams: teams.map((team, i) => ({ ...team, seed: i + 1 })) });
  }
  return (
    <section className="content-section">
      <div className="section-heading">
        <div>
          <h2>
            Participants <span className="heading-count">{t.teams.length}</span>
          </h2>
          <p>
            {editable
              ? "Order teams by seed. The top seed gets the strongest starting position."
              : "Seeds are locked once the tournament starts."}
          </p>
        </div>
        {editable && (
          <Button onClick={edit}>
            Edit teams
            <Users size={16} />
          </Button>
        )}
      </div>
      <div className="participants-table">
        <div className="participant-table-head">
          <span>Seed</span>
          <span>Team</span>
          <span>{editable ? "Reorder" : "Tournament status"}</span>
        </div>
        {t.teams.map((team, i) => {
          const lost = t.matches.some(
            (m) =>
              m.status === "completed" &&
              (m.teamA === team.id || m.teamB === team.id) &&
              m.winnerId !== team.id,
          );
          const won =
            t.status === "completed" &&
            t.matches[t.matches.length - 1]?.winnerId === team.id;
          return (
            <div className="participant-row" key={team.id}>
              <span className="seed-number">
                {String(team.seed).padStart(2, "0")}
              </span>
              <span className="participant-name">
                <TeamAvatar team={team} />
                <strong>{team.name}</strong>
              </span>
              <span>
                {editable ? (
                  <span className="reorder">
                    <button
                      className="icon-button"
                      aria-label={`Move ${team.name} up`}
                      disabled={i === 0}
                      onClick={() => move(i, -1)}
                    >
                      <ArrowUp size={16} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label={`Move ${team.name} down`}
                      disabled={i === t.teams.length - 1}
                      onClick={() => move(i, 1)}
                    >
                      <ArrowDown size={16} />
                    </button>
                  </span>
                ) : (
                  <span className={`participant-status ${won ? "won" : ""}`}>
                    {won ? (
                      <>
                        <Trophy size={14} />
                        Champion
                      </>
                    ) : lost ? (
                      "Eliminated"
                    ) : t.status === "draft" ? (
                      "Registered"
                    ) : (
                      "In contention"
                    )}
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Details({
  tournament: t,
  readOnly,
  edit,
}: {
  tournament: Tournament;
  readOnly: boolean;
  edit: () => void;
}) {
  return (
    <section className="content-section">
      <div className="section-heading">
        <div>
          <h2>Tournament details</h2>
          <p>Everything your teams need to know.</p>
        </div>
        {!readOnly && t.status === "draft" && (
          <Button onClick={edit}>Edit details</Button>
        )}
      </div>
      <div className="details-layout">
        <dl className="details-list">
          <div>
            <dt>Sport or game</dt>
            <dd>{t.sport}</dd>
          </div>
          <div>
            <dt>Format</dt>
            <dd>Single elimination</dd>
          </div>
          <div>
            <dt>Date</dt>
            <dd>{dateLabel(t.date)}</dd>
          </div>
          <div>
            <dt>Location</dt>
            <dd>{t.location || "To be confirmed"}</dd>
          </div>
          <div>
            <dt>Participants</dt>
            <dd>{t.teams.length} teams</dd>
          </div>
        </dl>
        <div className="detail-description">
          <h3>About this tournament</h3>
          <p>{t.description || "No additional details yet."}</p>
          <h3>How the format works</h3>
          <p>
            Win to advance. A loss ends a team’s run. Higher seeds receive byes
            when needed. Matches must have a winner; include any tie-break
            points in the final score.
          </p>
        </div>
      </div>
    </section>
  );
}

function TournamentList({
  tournaments,
  open,
  create,
  importFile,
}: {
  tournaments: Tournament[];
  open: (id: string) => void;
  create: () => void;
  importFile: () => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const visible = tournaments.filter(
    (t) =>
      (filter === "all" || t.status === filter) &&
      `${t.name} ${t.sport}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <section className="all-tournaments">
      <div className="section-heading page-heading">
        <div>
          <h1>Your tournaments</h1>
          <p>From the first fixture to the final whistle.</p>
        </div>
        <Button kind="primary" onClick={create}>
          <Plus size={17} />
          Create tournament
        </Button>
      </div>
      <div className="list-toolbar">
        <div className="search-input">
          <Search size={18} />
          <input
            aria-label="Search tournaments"
            placeholder="Search tournaments…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select
          aria-label="Filter tournaments"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All statuses</option>
          <option value="active">In progress</option>
          <option value="draft">Draft</option>
          <option value="completed">Completed</option>
        </select>
        <Button onClick={importFile}>
          <Download size={15} />
          Import backup
        </Button>
      </div>
      <div className="tournament-list">
        {visible.map((t) => (
          <button
            className="tournament-list-item"
            key={t.id}
            onClick={() => open(t.id)}
          >
            <span className="list-trophy">
              <Trophy size={24} strokeWidth={1.5} />
            </span>
            <span className="tournament-list-title">
              <strong>{t.name}</strong>
              <span>
                {t.sport}
                <i>·</i>
                {t.teams.length} teams{t.isDemo && <small>Sample</small>}
              </span>
            </span>
            <span className="list-date">{dateLabel(t.date)}</span>
            <Status tournament={t} />
            <ChevronRight size={18} />
          </button>
        ))}
      </div>
      {visible.length === 0 && (
        <div className="empty-state">
          <Search size={29} />
          <h2>
            {tournaments.length
              ? "No tournaments found"
              : "Your first tournament starts here"}
          </h2>
          <p>
            {tournaments.length
              ? "Try a different name or clear your filters."
              : "Add your teams and let Matchday take care of the bracket."}
          </p>
          <Button
            onClick={() => {
              if (!tournaments.length) create();
              else {
                setQuery("");
                setFilter("all");
              }
            }}
          >
            {tournaments.length ? "Clear filters" : "Create tournament"}
          </Button>
        </div>
      )}
      <div className="list-footnote">
        <Shield size={16} />
        Your tournaments stay in this browser. Export a backup to take them with
        you.
      </div>
    </section>
  );
}

function TournamentForm({
  existing,
  cancel,
  save,
}: {
  existing?: Tournament;
  cancel: () => void;
  save: (t: Tournament) => void;
}) {
  const [name, setName] = useState(existing?.name ?? "");
  const [sport, setSport] = useState(existing?.sport ?? "Football");
  const [date, setDate] = useState(
    existing?.date ?? new Date().toLocaleDateString("en-CA"),
  );
  const [location, setLocation] = useState(existing?.location ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [teamNames, setTeamNames] = useState(
    existing?.teams.map((t) => t.name).join("\n") ?? "",
  );
  const [error, setError] = useState("");
  const names = teamNames
    .split("\n")
    .map((n) => n.trim())
    .filter(Boolean);
  function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const t = createTournament({
        name,
        sport,
        date,
        location,
        description,
        teamNames: names,
      });
      save(
        existing
          ? {
              ...t,
              id: existing.id,
              createdAt: existing.createdAt,
              isDemo: existing.isDemo,
              teams: t.teams.map((team) => ({
                ...team,
                id:
                  existing.teams.find(
                    (old) => old.name.toLowerCase() === team.name.toLowerCase(),
                  )?.id ?? team.id,
              })),
            }
          : t,
      );
    } catch (err) {
      setError((err as Error).message);
    }
  }
  return (
    <section className="create-page">
      <button className="text-button back-button" onClick={cancel}>
        <ArrowLeft size={16} />
        Back to workspace
      </button>
      <h1>{existing ? "Edit tournament" : "Make it a tournament."}</h1>
      <p className="page-description">
        A few details, your teams, and you’re ready to play.
      </p>
      <form onSubmit={submit}>
        <div className="form-layout">
          <div className="form-main">
            <h2>The essentials</h2>
            <label>
              Tournament name
              <input
                required
                autoFocus
                maxLength={60}
                placeholder="e.g. Riverside Summer Cup"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <div className="form-pair">
              <label>
                Sport or game
                <select
                  value={sport}
                  onChange={(e) => setSport(e.target.value)}
                >
                  {[
                    "Football",
                    "Basketball",
                    "Badminton",
                    "Tennis",
                    "Volleyball",
                    "Table tennis",
                    "Esports",
                    "Chess",
                    "Other",
                  ].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label>
                Tournament date
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  min="2000-01-01"
                  max="2100-12-31"
                />
              </label>
            </div>
            <label>
              Location <span className="optional">optional</span>
              <input
                maxLength={100}
                placeholder="Venue, city, or online"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </label>
            <label>
              Description <span className="optional">optional</span>
              <textarea
                rows={3}
                maxLength={500}
                placeholder="Anything teams should know before game day."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
            <div className="format-note">
              <GitBranch size={22} />
              <div>
                <strong>Single elimination</strong>
                <p>Win and advance. One champion at the end.</p>
              </div>
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="form-teams">
            <div className="section-heading">
              <h2>Add your teams</h2>
              <span className="heading-count">{names.length} / 16</span>
            </div>
            <label htmlFor="team-names">Team names</label>
            <p id="team-help">
              One team per line, highest seed first. Add 2–16 teams. You can
              change the order later.
            </p>
            <textarea
              id="team-names"
              required
              rows={10}
              maxLength={1000}
              placeholder={
                "Northside FC\nEast End United\nAthletic Club\nWestside Rovers"
              }
              value={teamNames}
              onChange={(e) => setTeamNames(e.target.value)}
              aria-describedby="team-help"
            />
            <small>Playing solo? Use player names instead.</small>
          </div>
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <span>Your bracket starts when you’re ready.</span>
          <Button onClick={cancel}>Cancel</Button>
          <Button kind="primary" type="submit">
            {existing ? "Save changes" : "Create tournament"}
            <ArrowRight size={17} />
          </Button>
        </div>
      </form>
    </section>
  );
}

function ScoreDialog({
  tournament: t,
  match: m,
  close,
  save,
}: {
  tournament: Tournament;
  match: Match;
  close: () => void;
  save: (a: number, b: number) => void;
}) {
  const [a, setA] = useState(m.scoreA === null ? "" : String(m.scoreA));
  const [b, setB] = useState(m.scoreB === null ? "" : String(m.scoreB));
  const [error, setError] = useState("");
  const teams = [
    t.teams.find((team) => team.id === m.teamA)!,
    t.teams.find((team) => team.id === m.teamB)!,
  ];
  function submit(e: FormEvent) {
    e.preventDefault();
    try {
      if (!a.trim() || !b.trim())
        throw new Error("Enter a score for both teams.");
      save(Number(a), Number(b));
    } catch (err) {
      setError((err as Error).message);
    }
  }
  return (
    <Modal
      title={
        m.status === "completed" ? "Edit match result" : "Record match result"
      }
      close={close}
    >
      <p>Enter the final score. The winner advances automatically.</p>
      <form onSubmit={submit}>
        <div className="score-form">
          {teams.map((team, i) => (
            <label key={team.id}>
              <span>
                <TeamAvatar team={team} />
                <strong>{team.name}</strong>
              </span>
              <input
                type="number"
                inputMode="numeric"
                aria-label={`${team.name} score`}
                min={0}
                max={999}
                step={1}
                required
                value={i === 0 ? a : b}
                onChange={(e) =>
                  i === 0 ? setA(e.target.value) : setB(e.target.value)
                }
                autoFocus={i === 0}
                placeholder="0"
              />
            </label>
          ))}
        </div>
        {m.status === "completed" && (
          <p className="warning">
            Changing the winner clears results from their later matches. Those
            matches will need to be played again.
          </p>
        )}
        <p className="score-help">
          No draws in a knockout. Include tie-break points in the final score.
        </p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <Button onClick={close}>Cancel</Button>
          <Button kind="primary" type="submit">
            Save result
            <Check size={17} />
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ShareDialog({
  tournament,
  close,
}: {
  tournament: Tournament;
  close: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const url = shareUrl(tournament);
  return (
    <Modal title="Share the tournament" close={close}>
      <p>Give spectators a read-only snapshot of the bracket and results.</p>
      <label className="share-label">
        Snapshot link
        <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} />
      </label>
      <p className="score-help">
        This link captures the current results. Create a new link after scores
        change. Anyone with the link can view the included tournament details.{" "}
        {["localhost", "127.0.0.1"].includes(window.location.hostname) &&
          "This local preview link only opens on this computer; deploy the app to share it with others."}
      </p>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <div className="dialog-actions">
        <a
          className="button secondary"
          href={url}
          target="_blank"
          rel="noreferrer"
        >
          Preview snapshot
        </a>
        <Button
          kind="primary"
          onClick={() => {
            navigator.clipboard
              .writeText(url)
              .then(() => {
                setCopied(true);
                setError("");
              })
              .catch(() =>
                setError(
                  "Copy was blocked. Select the link above and copy it manually.",
                ),
              );
          }}
        >
          {copied ? (
            <>
              <Check size={16} />
              Copied
            </>
          ) : (
            <>
              <Share2 size={16} />
              Copy link
            </>
          )}
        </Button>
      </div>
    </Modal>
  );
}

function Guide({
  create,
  readOnly,
}: {
  create: () => void;
  readOnly: boolean;
}) {
  return (
    <section className="guide">
      <div className="guide-title">
        <CircleHelp size={30} strokeWidth={1.5} />
        <h1>A good tournament starts here.</h1>
        <p>Less organizing. More playing. Here’s your Matchday playbook.</p>
      </div>
      <div className="guide-steps">
        {[
          {
            title: "Bring your teams together",
            text: "Create a tournament with a name, date, and 2–16 team or player names. Each new tournament starts as a draft, so you have time to get things right.",
            icon: Users,
          },
          {
            title: "Set the seeds. Build the bracket.",
            text: "Put your strongest teams first using the arrows in Participants. Generate the bracket when you’re ready. Teams and seeds lock at this point; top seeds get byes where needed.",
            icon: GitBranch,
          },
          {
            title: "Play, record, advance.",
            text: "Select any ready match to enter its final score. Ties are not allowed: include tie-break points. Winners move into their next match automatically.",
            icon: Flag,
          },
          {
            title: "Share the finish.",
            text: "Once the final is played, your champion appears in the bracket. Share a read-only snapshot or export a JSON backup. Import that backup from Your tournaments to restore a copy.",
            icon: Trophy,
          },
        ].map(({ title, text, icon: Icon }, i) => (
          <article key={title}>
            <span className="guide-step-number">{i + 1}</span>
            <div>
              <h2>{title}</h2>
              <p>{text}</p>
            </div>
            <Icon size={23} />
          </article>
        ))}
      </div>
      <div className="guide-note">
        <h3>A few things to know</h3>
        <p>
          Your workspace is saved in this browser, with no account required.
          Clearing browser data removes saved tournaments, so keep an exported
          backup. Shared links are snapshots, not live updates. Correcting a
          winner resets dependent match results.
        </p>
        <p>Sample tournaments are fictional and ready to explore.</p>
      </div>
      <Button kind="primary" onClick={create}>
        {readOnly ? "Back to tournament" : "Create your tournament"}
        <ArrowRight size={16} />
      </Button>
    </section>
  );
}
