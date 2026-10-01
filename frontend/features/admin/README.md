# Admin: Steps 7I–7M

The overview remains at `/admin`, with player, season, round and performance
management pages. Performance entry supports saved corrections, recalculation
and confirmed completion. Scoring remains in the backend.

## Authentication and navigation

The existing AppShell uses the backend `/api/auth/me` role and JWT cookie:
unauthenticated users go to `/login`, authenticated USER accounts go to `/403`,
and ADMIN accounts may render the admin shell. The shell also checks ADMIN
before mounting its children. `/403` is authenticated but does not require ADMIN.
The existing backend requireAuth + requireRole(ADMIN) middleware is unchanged.

Desktop uses a 12rem sidebar. Mobile uses an always-visible compact link grid.
Both have nested active-route matching and Back to Fantasy App links. Management
pages use consistent headers. Lists are semantic tables on large screens and
stacked labelled cards on smaller screens.

## Backend contracts inspected and used

All routes are relative to `/api`.

| Domain | Read endpoints | Write endpoints |
| --- | --- | --- |
| Players | GET `/players` (search, position, active) | POST `/admin/players`, PUT `/admin/players/:id` |
| Seasons | GET `/seasons`, GET `/seasons/current` | POST `/admin/seasons`, PUT `/admin/seasons/:id` |
| Rounds | GET `/rounds?seasonId=...` | POST `/admin/rounds`, PUT `/admin/rounds/:id` |
| Overview only | GET `/leaderboard?seasonId=...`, GET `/admin/rounds/:roundId/performances` | None |

Individual player/round GET endpoints also exist; list responses already supply
the fields needed by these editors. Responses use `{ player }`, `{ players }`,
`{ season }`, `{ seasons }`, `{ round }`, or `{ rounds }` envelopes. Updates are
partial. Field validation follows the actual backend Zod schemas. Safe 400
validation messages map to fields, round-number conflicts return 409, and
unexpected failures display a generic retry message without internal details.

Backend season activation deactivates all other active seasons in its transaction.
The UI explains and confirms this consequence before creating/activating a
season. Deactivation also explains the absence of an active competition.
Historical records are retained.

Round numbers are unique within a season. The UI checks loaded rounds for
conflicts, and handles the backend 409 for conflicts outside the loaded data.
Locked rounds cannot be reopened for team changes. Rounds with fantasy data
cannot change season or round number. Completed performance corrections remain
supported. The Complete action on locked rounds submits only
`{ status: "COMPLETED" }` after confirmation. Status changes through the editor
also require confirmation. No mutation automatically recalculates scores.

Performance operations: PUT
`/admin/rounds/:roundId/performances`, PUT
`/admin/rounds/:roundId/performances/:playerId`, POST
`/admin/rounds/:roundId/recalculate`.

## Forms and validation

- Player search uses the existing backend name filter with a 300ms debounce.
  All positions and active/inactive players are available in admin filters.
  The public directory continues to request active players only.
- Player creation/editing covers names, position, price and active state.
  Deactivation requires confirmation; reactivation uses the same Active control.
- Prices are entered as whole ZAR digits, with a live shared million-format
  preview. No multiplication or rounding is used to construct the payload.
  Prices and round numbers respect the database's positive PostgreSQL Int range.
- Season dates use calendar date inputs, serialize as midnight UTC, and display
  as UTC calendar dates. Equal start/end dates are allowed by the backend.
- Deadline controls use the browser timezone, explicitly named in the form and
  list, consistent with the existing shared deadline formatter. Conversion to
  ISO UTC is centralised in `lib/date-time.ts`; South African offsets are not
  hardcoded. Invalid dates and skipped DST times are rejected.
- Unchanged timestamps are preserved. Only changed fields are submitted on edits,
  avoiding accidental activation/status overwrites from unrelated field edits.
- Stored round status and backend canEdit/isLocked are displayed separately.
  An overdue UPCOMING round is labelled editing-locked. The list refetches at the
  next deadline rather than rewriting its status using the browser clock.
- Deadline changes, season moves and status changes show their consequences in
  confirmation screens. Completed rounds carry a correction notice.
- Successful mutations show a toast and wait for authoritative query refreshes.
  Submit controls disable while saving; a synchronous guard blocks duplicates.
  Errors keep the entered values. Dialogs scroll within the viewport, trap focus,
  and restore focus to the opener (or page heading if the row disappeared).

## Shared components and query invalidation

`AdminFormDialog` wraps existing Radix dialog primitives, shared buttons and form
fields, validation, confirmation, save state, safe errors and focus restoration.
`AdminDataList` supplies semantic desktop tables and labelled mobile cards.
`AdminListLoading` uses the existing skeleton component. The overview continues
to use `AdminSection` and shared headers, cards, badges and error states.

Reads reuse public player functions and season-round hooks/keys. The new season
list uses `["seasons", "all"]`; admin performances retain
`["admin", "performances", roundId]`.

Successful writes invalidate affected domain prefixes without clearing auth:

- Players: player lists/details, dashboard, embedded lineup/team player data,
  round performances and admin summaries.
- Seasons: season/round selectors, current season, dashboard, team/lineup state,
  leaderboards, admin summaries and season-dependent player totals.
- Rounds: season/round queries, dashboard, team editability/lineups/history,
  leaderboards and admin summaries.

No optimistic changes are made for activation, deactivation or completion.

## Overview data assumptions

The operational round selector defaults to the earliest unfinished locked round,
then the next editable round, then latest history. `/rounds/current` only returns
an editable future round and is unsuitable for reviewing locked results.

The full player list supplies active/inactive counts; the unpaginated season
leaderboard supplies team count. Performance count means saved records, not
completeness: there is no expected round roster or persisted scoring-run status.
No completeness/scoring readiness is inferred. Empty, loading and independent
summary failure states retain management navigation.

## Step 7J file inventory

New:

- `app/403/page.tsx`
- `features/admin/types.ts`, `validation.ts`, `errors.ts`, `validation.test.ts`
- `features/admin/components/admin-form-dialog.tsx`, `admin-data-list.tsx`
- `features/admin/components/player-editor.tsx`, `players-management.tsx`
- `features/admin/components/season-editor.tsx`, `seasons-management.tsx`
- `features/admin/components/round-editor.tsx`, `rounds-management.tsx`
- `lib/date-time.ts`
- `e2e/admin-management.spec.ts`, `playwright.config.ts`

Updated:

- `app/admin/players/page.tsx`, `seasons/page.tsx`, `rounds/page.tsx`
- `components/layout/app-shell.tsx`, `lib/routes.ts`, `lib/query-keys.ts`
- `features/admin/api.ts`, `hooks.ts`, `access.test.ts`, this README
- `features/admin/components/admin-overview.tsx` (management-area copy)
- `package.json`, `package-lock.json`, `tsconfig.json`, `.gitignore`
- Existing Step 7I admin files received consistent formatting.

## Verification

From `frontend`:

```sh
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e:admin
```

Alternatively, with Google Chrome already installed:

```sh
PLAYWRIGHT_CHANNEL=chrome npm run test:e2e:admin -- --workers=2
```

The browser suite uses a temporary frontend server at port 3100 and mocked API
contracts; it never writes to a database. It covers USER/guest access on all three
routes, desktop and mobile creation/editing, filters, exact prices, confirmations,
season activation, date validation, duplicate handling, timezone conversion,
completion, cache refresh and safe mutation errors. Live backend/database
integration is outside these frontend checks.

Step 7J results: lint, TypeScript, production build and all 19 unit tests passed.
All 20 browser cases passed across desktop and mobile, with corrected failing
cases rerun; the cached public-directory refresh cases were then verified again.

## Step 7K — performance entry and scoring operations

The performance page now implements the backend workflow. All calls use the
existing authenticated API client; backend ADMIN middleware remains authoritative.
USER and guest browser tests verify `/403` and `/login` respectively.

| Endpoint | Use |
| --- | --- |
| `GET /api/seasons` | Active and historical seasons |
| `GET /api/rounds?seasonId=…` | Season-scoped round selector |
| `GET /api/rounds/:id` | Resolve direct round links and current metadata |
| `GET /api/players` | Complete directory, including inactive players |
| `GET /api/admin/rounds/:id/performances` | Saved raw statistics and backend points |
| `PUT /api/admin/rounds/:id/performances` | Bulk upsert changed rows and automatic recalculation |
| `POST /api/admin/rounds/:id/recalculate` | Repeatable explicit recalculation |
| `PUT /api/admin/rounds/:id` | Mark reviewed LOCKED round COMPLETED |

`seasonId` and `roundId` query parameters preserve selection and support direct
links from round management and overview. Defaults reuse the overview's unfinished
round selection. A round-only link resolves its season; invalid IDs show a safe
error or selection message rather than silently editing another round.

The workspace owns one draft per player. Desktop uses a labelled table with a
sticky header and bounded scrolling. Below `xl`, cards group batting, bowling and
fielding with two-column numeric inputs. Both render the same draft model and
mutation handlers. Batted is explicit; a zero-run duck is different from not batting.
Saved fantasy points are read-only, supplied by the backend, and labelled as saved
results while edits are pending.

Missing records show zero-valued inputs but remain **not entered** until edited or
explicitly marked as a zero performance. Bulk save sends only modified rows and
never sends `fantasyPoints`. Client validation rejects negative, fractional, blank,
exponent and out-of-database-range values; backend row errors map back to players.
Failed requests preserve draft values. Restoring a saved value clears that row's
modified state. Operation guards prevent duplicate submissions.

Successful save already recalculates on the backend. Explicit recalculation has a
confirmation and shows the returned performance/lineup/team counts. COMPLETED
rounds initially show read-only inputs; Edit Completed Results enables deliberate
correction, followed by the same save/recalculation workflow. Completion uses the
existing status endpoint and a review checklist; it does not itself recalculate.

Both scoring operations invalidate `admin`, `players`, `player`, `round`, `seasons`,
`dashboard`, `leaderboard`, `fantasy-team` and `lineups`. Round completion uses the
existing shared round invalidation. Refresh failures hide stale saved points and
disable writes until refreshed. No score calculation or optimistic score update is
introduced in the frontend.

The backend provides neither an expected participant roster nor persisted scoring
readiness. Progress therefore measures saved records against the directory,
including inactive historical players, and explicitly explains that this does not
mean everyone played. Completion does not invent a completeness prerequisite.

Admin links, logout, season/round selectors and discard actions confirm before
abandoning a dirty workspace. Refresh/close uses the browser's beforeunload warning.
Round drafts survive client-side browser back/forward **within the admin layout**.
Browser history navigation out of that layout is not universally cancellable;
drafts are in memory, not durable across reloads or leaving that layout.

New files: `performances/api.ts`, `hooks.ts`, `model.ts`, `errors.ts`,
`navigation-guard.tsx`, `performance-page.tsx`, `performance-workspace.tsx`,
`performance-grid.tsx`, `performances.test.ts`, `../../e2e/admin-performances.spec.ts` and the shared
`../../e2e/fixtures/fantasy-api.ts` fixture. Updated integration files:
`app/admin/layout.tsx`, `app/admin/performances/page.tsx`, admin `hooks.ts`,
`components/admin-shell.tsx`, `admin-overview.tsx`, `rounds-management.tsx`,
`round-editor.tsx`, and the frontend package scripts.

Browser checks use API mocks: they validate payloads, errors, refreshes and UI
behaviour, not the correctness of the live database scoring algorithm. Step 7L's
responsive report records the combined final frontend verification.

Final Step 7K/7L checks: lint, TypeScript, production build and all 24 unit tests
passed. All 12 performance browser cases passed across desktop/mobile, including
cached dashboard/leaderboard refresh after correction. The combined responsive
and admin suite contains 61 passing distinct browser cases; see
`../../RESPONSIVE_REVIEW.md` for the viewport matrix and test limits.
