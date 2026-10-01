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
`NEXT_PUBLIC_API_URL` must include the `/api` suffix. Local development defaults
to `http://localhost:4000/api`. Production builds require an explicit value;
Next.js embeds this public value at build time.

## Verification

```sh
npm run lint
npm run typecheck
npm test
NEXT_PUBLIC_API_URL=https://api.example.com/api npm run build
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

Set `NEXT_PUBLIC_API_URL` before building. Configure backend `CORS_ORIGIN` to the
exact frontend origin, a strong `JWT_SECRET`, and the database URLs. Production
uses HTTPS with an HttpOnly, Secure, SameSite=None JWT cookie; requests include
credentials. Test the actual deployed origins and browser cookie policy before
opening registration. No JWT or database secrets belong in frontend variables.

See [MVP sign-off](MVP_SIGN_OFF.md) for the final verification results and scope.
