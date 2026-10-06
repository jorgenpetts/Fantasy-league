# ECC Fantasy League frontend

Next.js, React, TypeScript, Tailwind and TanStack Query. The Express API owns
authentication, authorization, fantasy rules, scoring and lineup privacy.

## Local development

```sh
cp .env.example .env.local
npm install
npm run dev
```

Start the backend separately as described in the repository README.
Local development sends browser requests to `/api`; Next.js rewrites them to
`BACKEND_ORIGIN` (default `http://localhost:4000`). If needed locally,
`NEXT_PUBLIC_API_URL` can point directly to an API URL ending in `/api`.
Production browser requests always use `/api`.

## Verification

```sh
npm run lint
npm run typecheck
npm test
BACKEND_ORIGIN=http://localhost:4000 npm run build
npm run test:e2e -- --workers=2
```

Browser tests use Playwright Chromium, or an installed Chrome with
`PLAYWRIGHT_CHANNEL=chrome`. Install Playwright browsers when needed using
`npx playwright install chromium`. The ordinary E2E suite intercepts API
responses to verify UI interactions, failures and responsive layouts.

For the connected Express/PostgreSQL/browser lifecycle, from `backend/`:

```sh
PLAYWRIGHT_CHANNEL=chrome node scripts/verify-mvp.mjs --browser
```

The runner creates a unique `qa_mvp_*` schema on the configured database, applies
the existing migrations there, runs backend tests, creates a QA administrator,
starts Express on port 4100 and Next.js on port 3101, and removes the temporary
schema afterward. It never seeds or migrates the configured application schema.
Run browser suites sequentially: Next.js permits one development server per
working directory. `--browser-only` skips the backend test suite but still builds
the backend. Interrupted processes may require cleanup of their printed QA schema.

## Deployment configuration

Set server-only `BACKEND_ORIGIN` to the Render backend origin in Vercel. The
`/api/:path*` rewrite forwards requests there while browsers stay on the
frontend origin. `NEXT_PUBLIC_API_URL` is only a local development override;
do not set it to Render in Vercel. Production uses an HttpOnly, Secure,
SameSite=Lax host-only JWT cookie, and requests include credentials. Configure
backend `CORS_ORIGIN` to the eventual frontend origin when deploying. No JWT
or database secrets belong in frontend variables.

See [MVP sign-off](MVP_SIGN_OFF.md) for the final verification results and scope.
