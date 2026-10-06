# Frontend Step 7M — MVP sign-off

Review date: 1 October 2026. Existing Step 7I–7L working-tree changes were preserved.

## 1. Overall status

**MVP frontend ready.** The live lifecycle, database integration, complete browser regression suite and production build have passed. No known critical blockers remain in the tested application; deployment-specific verification is described below.

## 2. Files modified in this pass

Paths are relative to the repository root. This list excludes pre-existing changes that this pass did not edit.

```text
backend/scripts/verify-mvp.mjs                              added
backend/src/services/backend.integration.test.ts
backend/src/services/chip.service.ts
backend/src/services/lineup.service.ts
backend/src/services/round.service.ts
backend/src/services/scoring.service.test.ts
backend/src/services/squadValidation.service.test.ts
frontend/README.md
frontend/MVP_SIGN_OFF.md                                   added
frontend/app/login/page.tsx
frontend/app/profile/page.tsx
frontend/app/register/page.tsx
frontend/components/common/placeholder-page.tsx            removed
frontend/components/layout/app-shell.tsx
frontend/components/providers/query-provider.tsx
frontend/components/ui/input.tsx
frontend/e2e/fixtures/fantasy-api.ts
frontend/e2e/live/mvp-lifecycle.spec.ts                      added
frontend/e2e/mvp-integration.spec.ts                        added
frontend/features/admin/README.md
frontend/features/admin/access.test.ts
frontend/features/admin/errors.ts
frontend/features/fantasy-team/components/chip-controls.tsx
frontend/features/fantasy-team/components/historical-lineup-page.tsx
frontend/features/fantasy-team/components/other-fantasy-team-page.tsx
frontend/features/fantasy-team/components/team-builder-page.tsx
frontend/features/fantasy-team/components/team-builder.tsx
frontend/features/fantasy-team/components/team-creation.tsx
frontend/features/fantasy-team/hooks.ts
frontend/features/fantasy-team/utils.test.ts
frontend/features/leaderboard/components/leaderboard-page.tsx
frontend/features/players/hooks.ts
frontend/hooks/use-auth.ts
frontend/lib/env.ts
frontend/lib/form-errors.ts
frontend/lib/format.ts
frontend/lib/routes.ts
frontend/playwright.config.ts
frontend/playwright.live.config.ts                          added
```

## 3. Integration scenarios tested

The live browser test uses real Next.js, Express, JWT cookies and PostgreSQL. Competition setup and later-round setup use authenticated HTTP requests; registration, initial team creation, all eleven selections, captain selection, first-round performance entry, recalculation, completion and historical correction use the browser UI. The ordinary browser suite uses intercepted API fixtures for detailed interactions and failure cases.

| Scenario | Verified result |
| --- | --- |
| New user | Real registration authenticates, dashboard offers creation, team creation opens builder without reload. |
| Initial squad | Eleven players and captain saved through desktop UI; zero transfers and zero penalty. |
| Transfers | Prior squad carried forward; five replacements persist five transfers and an eight-point penalty. |
| Wildcard | Five transfers recorded with zero penalty; removal before deadline and once-per-season restriction tested. |
| Triple Captain | A 70-point captain contributes 210, not 420; chip removal and reuse restrictions tested. |
| Deadline locking | Saved squad stays visible, editing controls disappear, backend rejects locked saves and chip changes. |
| Admin scoring | Raw stats save, backend points display, confirmed recalculation works. |
| Score correction | Completed-round correction from 50 to 100 runs changes the captain's normal contribution from 140 to 280. |
| Round completion | UI completion persists COMPLETED and shows final historical results. |
| Historical lineups | Original players, captain and transfer records survive later-round changes and recalculation. |
| Privacy | Other viewers receive no players/captain before deadline and receive the lineup afterward. |
| Overall leaderboard | Persisted total and backend rank verified; live team total is 808. |
| Round leaderboard | Second-round result is 178 (186 gross minus 8); browser and API agree. |
| ADMIN-as-player | Admin owns and saves a fantasy lineup, visits ordinary team/dashboard, enters admin and returns. |

Admin management browser coverage also exercises player creation, edits, exact prices, deactivation/reactivation, season activation/date validation, round changes, confirmations, retained drafts and safe failures.

## 4. Auth verification

This section records the earlier MVP sign-off. Current proxy and cookie
configuration is documented in `README.md` (same-origin `/api`, SameSite=Lax).

- JWT transport: HttpOnly cookie (`fantasy_cricket_session` by default); no browser token storage. Production adds Secure and SameSite=None. The central API client sends `credentials: "include"`.
- Verification: backend `requireAuth` calls `verifyAuthToken`, including signature and expiry validation. `/api/auth/me` supplies the authoritative account. Passwords use bcrypt.
- Expiry: protected 401 errors clear the observed identity and private query caches and redirect to login. A regression exposed and fixed an observer/cache-removal loop. Auth outages instead show a retry state.
- Login/registration perform one authoritative identity refresh and preserve safe return URLs, including round query parameters. External/backslash/control-character return destinations are rejected.
- Logout clears the backend cookie and frontend account caches. The live test verifies `/auth/me` subsequently returns 401.
- No express-session, Redis session store, server session ID, or local fake session was introduced or found.
- USER navigation to `/admin/*` goes to `/403`; direct unauthorized admin API requests return 403. ADMIN retains ordinary player access.

## 5. Fantasy rules

Backend configuration remains authoritative and unchanged: 11 players comprising 1 wicketkeeper, 4 batters, 2 all-rounders and 4 bowlers; R110,000,000 budget; 3 free transfers, then 4 points each. Both frontend and backend accept R109,999,999 and R110,000,000 and reject R110,000,001.

Transfer boundaries 0–6 produce deductions 0, 0, 0, 0, 4, 8, 12. Wildcard and Triple Captain are each once per season, with one chip per round. Conflicting activation now returns 409 instead of silently replacing a chip. Concurrent same-chip requests for different rounds are serialized per fantasy team and cannot consume the chip twice. Normal captain multiplier is 2; Triple Captain is 3.

The browser fixture's old 1/3/3/4 composition was corrected to 1/4/2/4. No production fantasy rules were changed.

## 6. Scoring boundaries

All raw-stat formulas remain in the backend scoring service. The frontend displays backend player and lineup results; historical contribution labels use backend-supplied multipliers.

| Input, with other stats zero | Expected and tested points |
| --- | --- |
| 49 / 50 / 99 / 100 runs, batted | 49 / 70 / 119 / 140 |
| 2 / 3 / 4 / 5 wickets | 40 / 80 / 100 / 140 |
| Zero runs, didBat=true / false | -20 / 0 |
| 50 conceded, no wicket | 0 |
| 51 conceded, no wicket | -20 |
| 51 conceded, one wicket | 20; no expensive-bowling penalty |
| Two catches / two drops | +20 / -20 |
| One stumping / one run-out | +15 / +15 |
| 70-point captain, normal / Triple Captain | 140 / 210 |
| Missing selected-player performance | 0 |

Milestone bonuses do not stack. Admin browser tests distinguish missing records from saved zero records and preserve `didBat` in payloads and loaded forms.

## 7. Historical integrity

Database tests compare original selections with later-round and repeated-recalculation results. Captain and transfers remain unchanged. Inactive historical players remain visible. Locked rounds cannot be reopened for team editing, and a round containing fantasy data cannot change season or round number. Completed performance corrections remain supported.

## 8. Privacy verification

Privacy is enforced in backend response construction. Hidden responses omit players and captain IDs. An early administrative LOCKED status no longer exposes selections before the deadline. After the deadline, the same API and profile route expose the permitted snapshot without a rebuild. Frontend caches are cleared when identity changes.

## 9. Recalculation verification

Repeated recalculation preserves points, penalties, selections and team totals. Corrections update persisted player scores, lineups, totals and leaderboards; browser tests also cover invalidation of previously cached dashboard and standings views. Team mutations now invalidate cached history/team profiles and standings.

The live four-round manual cross-check is **280 + 178 + 140 + 210 = 808**. The separate database integration fixture verifies **380 + 232 + 240 + 310 = 1,162**. These are test assertions, not new frontend scoring implementations.

## 10. UX and responsive verification

Viewport matrix: **320×812, 375×812, 390×844, 430×932, 768×1024, 820×1180, 1024×768, 1280×900, 1440×900, 667×375 and 844×390**. Screenshots of the mobile builder and tablet performance form were also visually inspected.

Fixed desktop Add/Change opening an invisible mobile modal and blocking the visible player market. Desktop now focuses its visible search field; the mobile drawer remains visible if the viewport grows, and closes when backend state becomes read-only. Removed stale player-filter results, distinguished season-loading errors from valid no-season states, exposed retry for missing team-detail requests, and prevented failed performance loads from displaying fabricated zero contributions.

Expected routes are present: `/login`, `/register`, `/403`, `/`, `/players`, `/players/[id]`, `/team`, `/team/history`, `/team/history/[roundId]`, `/team/[id]`, `/leaderboard`, `/admin`, `/admin/players`, `/admin/seasons`, `/admin/rounds`, `/admin/performances`. Existing `/profile` now shows real account details. No extra feature routes were added.

## 11. Accessibility

Checked semantic links/buttons, heading structure, labelled inputs, table headers, readable validation, named icon controls, visible focus, dialog focus trapping, Escape dismissal and focus restoration. Keyboard browser coverage includes login and player filtering; existing interaction coverage includes picker/dialog focus and admin forms. Required-field stars are hidden from assistive technology while native required semantics remain. The desktop hidden-modal fix also restores keyboard access to the market.

## 12. Cleanup and environment audit

Removed the unused placeholder component and unfinished profile copy; replaced the demo team-name prompt; updated scaffold/stale documentation. No production mock account/team/score data or debugging console.log statements were found. Compact currency uses `R8.5m`; full values use `R110,000,000`; points use grouped numbers. Negative captain bonuses no longer display a misleading `+-` prefix. Controlled round selectors avoid the uncontrolled-to-controlled console warning found during the live run.

All application API requests use the central client. `NEXT_PUBLIC_API_URL` is required for production builds and normalized for trailing slashes; the localhost fallback is development-only. No frontend JWT/database/service-role secrets were found. Deployment origins, HTTPS and cookie policy still require a smoke test in the actual target environment; no deployment was performed here.

## 13. Automated checks

- Frontend lint: passed.
- Frontend TypeScript: passed.
- Frontend unit tests: 26 passed, 0 failed/skipped.
- Backend TypeScript and build: passed.
- Backend suite in a temporary PostgreSQL schema: 21 passed, 0 failed/skipped, including the expanded database integration test.
- Scoring boundary suite after adding the explicit 51-conceded/one-wicket assertion: 8 passed.
- Real API/database/browser lifecycle: 1 passed (about 2 minutes), including real cookies and four scored rounds.
- Final mocked browser suite: 81 passed, 0 failed/skipped (2.2 minutes), using installed Chrome with two workers. This clean full run includes the corrected mobile session-expiry regression.
- Frontend production build: passed (`NEXT_PUBLIC_API_URL=https://api.example.com/api npm run build`); all listed application routes compiled. The example URL validates production configuration and is not a deployed backend.
- Final whitespace/error-marker check: `git diff --check` passed.

Commands and safe QA setup are documented in `README.md`. The QA runner applies migrations only inside a unique temporary schema and removes it on completion. An initial database run exceeded the provider's connection limit; the runner now caps its pool at three connections. Browser suites run sequentially because Next.js allows one development server per working directory.

## 14. Remaining non-blocking issues and test limits

Prisma 6 emits a deprecation notice for its existing package.json seed configuration. The test environment also emits a NO_COLOR/FORCE_COLOR conflict warning. Neither is a browser application error.

Browser automation ran in Chrome, using desktop and mobile viewport emulation; it is not a physical-device Safari certification. Production-domain cookie/CORS behaviour has not been exercised because no deployment environment was supplied.

## 15. Final MVP verdict

**MVP frontend ready** to connect to the intended deployment environment and proceed toward MVP release. All required automated checks passed. Complete an HTTPS/cookie/CORS smoke test against the actual deployed frontend and backend origins before release; local live integration has passed, but no deployment was performed. No post-MVP feature work is included.
