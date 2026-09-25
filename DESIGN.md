# Matchday design direction

Matchday is a clean tournament operations workspace for organizers of small single-elimination events. The interface keeps the next useful action visible: create or select a tournament, review the bracket, record the next score, and share a read-only result. The visual language is quiet and editorial, with paper-white surfaces on a pale cool-gray canvas and blue reserved for selection and primary actions.

## Visual system

- DM Sans Variable is used throughout. The base size is 14px; body copy uses a relaxed 1.65 line height, section headings are 19px, and page titles are 30px (27px on narrow screens).
- Core tokens are ink `#202734`, muted text `#626c7c`, blue `#2857d9`, border `#e3e7ee`, and surface `#f7f8fa`.
- The fixed desktop rail is 228px wide, narrowing to 205px below 1250px. Controls use compact 7–8px radii; match cards use 9px and larger panels use 10–12px. Borders carry most of the hierarchy; shadows are reserved for overlays.
- Team initials are used as restrained colored avatars. Scores use tabular numerals. Focus-visible controls receive a clear blue outline. Motion is limited to feedback and selection, with reduced-motion rules disabling transitions and scroll behavior.

## Information architecture

The desktop shell has a persistent navigation rail, a compact top bar, and a centered workspace. The tournament header groups identity, status, date, location, participant count, and actions before the Bracket, Matches, Participants, and Details tabs. The bracket view shows round progress, connected match cards, a Champion column, a legend, and a “Next up” action strip.

The bracket is intentionally wider than its container when needed. Its canvas scrolls horizontally, and the app exposes a small “Scroll sideways to see every round, or switch to the match list” cue only when overflow is detected. The match-list view is the narrow-screen fallback and provides filters for all, ready, upcoming, and completed matches when the connected diagram is less practical.

New tournaments start as drafts. The creation and edit form uses visible labels, grouped essentials, a single-elimination format note, a multiline team-entry field, a live `n / 16` count, and inline validation. Participants can be reordered during the draft; once the bracket is generated, seeds and participants are locked. The workflow explains that higher seeds receive byes and that generating the bracket begins play.

Score entry uses a focused native modal with one numeric field per team, explicit cancellation, and a clear no-draw instruction. Editing a completed result warns that the winner’s downstream matches will be cleared and replayed. Winners advance automatically, while the next-match strip keeps the organizer oriented.

## Responsive behavior

At 800px and below, the rail becomes an off-canvas menu opened from the top bar, the workspace fills the viewport, and content padding reduces to 22px. Header facts and actions wrap naturally. At 560px and below, form columns stack, controls become easier to tap, and bracket/list controls adapt to the narrower layout. The bracket remains a contained horizontal-scroll region with the visible cue and match-list fallback; it does not force the whole page to scroll sideways.

## Persistence and sharing

Tournament records are stored in the current browser. The UI labels this clearly as “Saved on this device” and reminds organizers that clearing browser data removes saved tournaments; JSON export/import provides a portable backup. Shared URLs contain read-only snapshots of the current tournament state, with a visible snapshot notice and no editing controls. The share dialog explains that a new link is needed after results change and warns that local preview links only work on the current computer.

Sample tournaments are fictional and visibly marked as samples. The product makes no account, server, live-collaboration, or paid-service claims.
