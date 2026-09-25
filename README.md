# Matchday

A responsive tournament workspace built as a portfolio project. Create a competition, seed the teams, record results, and follow the bracket through to a champion.

## Run locally

Requires Node.js 22.12 or newer and npm.

```sh
npm install
npm run dev
```

Open the local address printed by Vite. Three fictional sample tournaments let visitors explore without creating an account.

## Features

- Create and edit draft tournaments with 2–16 uniquely named teams or players.
- Reorder seeds before generating a standard single-elimination bracket.
- Automatically allocate byes and advance winners.
- Record whole-number scores, reject draws, and correct earlier results. Changing a winner clears dependent results; changing only the score preserves them.
- Switch between a visual bracket, match list, participants, and event details.
- Filter/search tournaments and filter matches by status.
- Keep progress in browser storage, with visible recovery if storage is invalid or unavailable.
- Export JSON backups and import them as separate tournament copies.
- Share read-only snapshots encoded in the URL. Snapshot links contain tournament details and results at the moment of sharing.
- Use keyboard-accessible score dialogs and responsive layouts, including a mobile match list.

## Checks

```sh
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

The domain tests exercise multiple bracket sizes, seeding, score validation, winner corrections, and imported data validation. Browser tests cover tournament creation through completion, persistence, export/import, shared snapshots, mobile navigation, keyboard dialog behavior, and malformed-data recovery. Browser tests start a local development server when needed.

## Structure

- `src/domain.ts` — immutable tournament rules and validation.
- `src/types.ts` — shared tournament, team, and match contracts.
- `src/storage.ts` — persistence, backup export, and snapshot encoding.
- `src/App.tsx` — organizer and spectator interfaces.
- `src/styles.css` — responsive design and interaction states.
- `src/domain.test.ts` and `tests/workflows.spec.ts` — domain and browser checks.

React and TypeScript provide the interface; Vite builds static assets. DM Sans is self-hosted and Lucide supplies consistent icons. No external API keys or runtime services are required.

## Demo scope and deployment

This is a local-first portfolio application. There are no accounts, server storage, live spectator updates, payments, or double-elimination/round-robin formats. Workspace data stays in the current browser; clearing it removes saved tournaments, so export backups. A shared snapshot is read-only in the app, but it is not a signed or authenticated record.

`npm run build` produces the deployable `dist/` folder. It can be hosted at the root of any static hosting service. `npm run preview` previews that build locally. Deploy it to a public HTTPS address before sharing links with other people; links created at `localhost` or `127.0.0.1` only point to the same computer. Public deployment is not included in this workspace build.
