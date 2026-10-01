# Step 7L responsive review

This pass retains the existing design and backend contracts. Step 7K's performance
workflow was completed and verified before reviewing all Step 7A–7K routes.
Step 7M has not been started.

## Browser coverage

Chrome through Playwright, with API fixtures and Africa/Johannesburg timezone:

- 320 × 812, 375 × 812, 390 × 844, 430 × 932
- 768 × 1024, 820 × 1180, 1024 × 768
- 1280 × 900, 1440 × 900
- Landscape: 667 × 375 and 844 × 390

All 16 routes run at every size: `/login`, `/register`, `/`, `/players`,
`/players/p1`, `/team`, `/team/history`, `/team/history/r0`, `/team/t2`,
`/leaderboard`, `/403`, `/admin`, `/admin/players`, `/admin/seasons`,
`/admin/rounds`, `/admin/performances`. Full-page screenshots at 375, 390, 768
and 1440 support visual review. Additional screenshots cover forms, landscape
pickers, and empty/loading/error/privacy/used-chip states at 320.

Fixtures exercise unbroken long manager/player names, long team names, ranks
123/124, six-digit points, round 10+, transfer deductions, saved zero performances,
missing performances and unavailable chips. Font enlargement and long select
options also receive narrow-screen checks.

## Changes and screen review

| Area | Findings and resulting behaviour |
| --- | --- |
| Global layout | Long unbroken names expanded headings and grid children. Natural emergency word wrapping, shrinkable cards/containers and wrapping header actions now contain them. No page-level overflow hiding was added. Existing maximum widths and spacing remain. |
| Normal navigation | Desktop links begin at `xl` so tablet headers do not collide. Bottom navigation persists below that breakpoint. Admin shortcut and Logout remain reachable. Account names truncate within a bounded area; role and logo retain their width. Bottom padding includes device safe areas. |
| Admin navigation | Sidebar starts at `lg`. Tablets retain the existing compact navigation grid, giving forms and cards adequate width. All five areas and Back to Fantasy App stay reachable. |
| Dashboard | Long greeting/team/player names wrap; squad groups shrink correctly; captain badges stay attached. League preview names have space above points instead of being squeezed between rank and score. Existing summary-card breakpoints remain. |
| Players | Search, sort and horizontally scrollable position pills remain available. Pills have larger tap targets; player names wrap. A pending search is cancelled when following a link so a quick player tap cannot be redirected back to the directory. |
| Player profile | Shared header/text fixes contain long names. Existing mobile performance cards and desktop table were retained; price, summary stats and history stay readable. |
| Team Builder | Squad grid children shrink, names wrap and badges retain their width. Browse Players sits in the squad header instead of floating over Save Team. Save becomes sticky only while there are unsaved changes and clears the mobile navigation/safe area. |
| Player picker | A bounded dynamic-viewport dialog and full-height flex layout make the list scroll. The filter/header section can scroll in short landscapes, leaving results reachable. Slot context, selected state, price and points remain visible. Desktop market has an explicit bounded height. |
| History and other teams | Shared name wrapping and historical squad grid fixes remove overflow. Existing round selectors, older/newer links, score summaries, transfers, chips and privacy panel remain usable. |
| Leaderboard | Mobile/tablet cards put points beneath identity, allowing team names to wrap. Rank supports three digits; manager metadata intentionally truncates. Tables start at `lg`, use fixed layout and a dedicated rank width. |
| Admin overview | Shared cards, inputs and buttons now fit narrow widths; tablet navigation preserves content width. Current round, deadline, counts and quick actions remain visible. |
| Admin Players | Existing mobile cards retain name, position, price, status and Edit. Long names wrap and create/edit dialogs scroll. |
| Admin Seasons | Date ranges and status remain visible; activation confirmation and editing retain their existing behaviour in bounded dialogs. |
| Admin Rounds | Round number, deadline/timezone, status and editing state remain visible. Edit, Performances and Complete controls wrap with comfortable targets. |
| Admin Performances | Mobile/tablet grouped statistic cards avoid the desktop table. Numeric fields use a numeric keyboard and explicit labels. Dirty-save controls alone become sticky, with safe-area clearance. Selectors, correction/recalculation/completion dialogs and errors fit. |
| Forms/dialogs | Shared inputs use 44px height and mobile 16px text. Buttons use minimum heights, allow labels to wrap and have 44px icon targets. Dialogs have dynamic-viewport maximum height, internal scroll, larger Close targets, focus trapping and focus restoration. Select popovers are bounded by viewport and available height. |
| Loading/empty/error/toasts | Existing responsive skeletons and state cards remain; shared wrapping and buttons contain retry/creation actions. Existing top-right Sonner placement fits mobile width and avoids bottom navigation/save bars. No toast-library change was needed. |

## Explicit table decisions

| Table | Responsive decision |
| --- | --- |
| Player performance history | Keep existing cards below `md`; semantic table at `md` and above. |
| Leaderboard | Cards below `lg`; fixed-layout table above. |
| Admin player/season/round lists | Existing cards below `lg`; fixed-layout tables above. |
| Admin performance entry | Grouped cards below `xl`; bounded horizontal/vertical table scroll above, where the raw-stat columns require it. |

The players directory uses responsive grid links rather than an HTML table.
Position-filter pill strips intentionally scroll within their own container.

## Interaction and accessibility checks

Browser tests exercise login, registration, logout, player search/filter/profile
navigation, creating a team, filling a slot, replacing a player, captain selection,
saving, activating/removing a chip, history/round navigation, other-team navigation,
leaderboard mode changes, admin CRUD and performance save/recalculate/completion.

Dialog tests cover 320px and both landscapes, reachable Cancel actions, Tab,
Shift+Tab, Enter, Space, Escape, focus trapping and restoration. Existing backend checks
and USER/ADMIN redirects are unchanged. Status is communicated through text as
well as colour. Performance fields retain individual labels/error associations;
table headers remain semantic. No essential actions depend on hover.

## Files

Created for this review:

- `RESPONSIVE_REVIEW.md`
- `e2e/responsive.spec.ts`
- `e2e/mobile-interactions.spec.ts`

Modified shared presentation:

- `app/globals.css`
- `components/layout/app-shell.tsx`, `page.tsx`
- `components/ui/badge.tsx`, `button.tsx`, `card.tsx`, `dialog.tsx`, `input.tsx`, `select.tsx`

Modified feature presentation:

- `features/dashboard/components/leaderboard-preview.tsx`, `squad-preview.tsx`
- `features/players/components/players-directory-page.tsx`
- `features/fantasy-team/components/historical-squad.tsx`, `player-market.tsx`, `squad-board.tsx`, `team-builder.tsx`
- `features/leaderboard/components/leaderboard-page.tsx`
- `features/admin/components/admin-shell.tsx`
- `features/admin/performances/performance-workspace.tsx`

Supporting updates: `playwright.config.ts`, `package.json`, shared browser fixtures,
and Step 7K tests/documentation. The Step 7K file/endpoint inventory is in
`features/admin/README.md`. Earlier uncommitted Step 7I/7J work is preserved.

## Verification and limits

Run from `frontend`:

```sh
npm run lint
npm run typecheck
npm test
npm run build
PLAYWRIGHT_CHANNEL=chrome npm run test:e2e -- --workers=2
```

The browser suite uses a temporary server on port 3100 and mocked API contracts;
it does not write to the database. Screenshot/trace artifacts are generated under
ignored `test-results/`. Desktop and mobile admin suites run separately; the
explicit viewport matrix runs once, and mobile interaction cases run once.

Real-device
Safari/Android keyboard and browser-toolbar behaviour remains outside desktop
Chrome viewport testing. Full live backend/database integration and MVP sign-off
remain Step 7M work. Performance draft navigation limits are documented in the
admin README.

Final results:

- Lint: passed, no errors or warnings.
- TypeScript: passed.
- Unit tests: 24 passed.
- Production build: passed; all 17 static pages generated and dynamic routes compiled.
- Browser tests: 61 distinct cases passed (59-case full run, then the added transfer/Triple Captain and empty-state cases; the three dialog cases were also rerun with Space-key coverage).
- Route matrix: 176 route/viewport combinations passed with no horizontal page overflow or uncaught page errors.
- Shared dialogs: phone and landscape fit, scrolling, keyboard controls and focus restoration passed.
- `git diff --check`: passed.

No outstanding layout defect was found in the reviewed Chrome viewport matrix.
The real-device and live-integration limits above still apply.
