# Local Production Docker Test

This stack runs the production builds of the Next.js frontend and Express API
against a real PostgreSQL database. Source directories are not mounted and no
development server or hot reload process is used.

## Architecture

```text
Browser http://localhost:3000
  -> Next.js production container (port 3000)
  -> browser API requests to http://localhost:4000/api
  -> Express production container (port 4000)
  -> PostgreSQL container (port 5432 inside Docker, 5433 on the host)
```

The browser uses `localhost:4000` because Docker's `backend` hostname is only
resolvable between containers. `NEXT_PUBLIC_API_URL` is embedded in the browser
bundle during `docker compose build`; rebuild the frontend image after changing
it.

PostgreSQL data is stored in the `fantasy_postgres_data` named volume.

## Configure

Create the ignored local Compose environment file:

```bash
cp .env.production.example .env
```

Replace the example database password and JWT secret. Keep
`COOKIE_SECURE=false` for this HTTP localhost simulation. Real HTTPS production
deployments should set it to `true`.

The repository may contain an ignored `.env` created for local testing. It must
never contain real cloud or production credentials.

## Clean build

```bash
docker compose -f compose.production.yml build --no-cache
```

## Create a fresh database

Start PostgreSQL and wait for its health check:

```bash
docker compose -f compose.production.yml up -d postgres
docker compose -f compose.production.yml ps
```

Apply committed migrations from the backend image:

```bash
docker compose -f compose.production.yml run --rm backend npx prisma migrate deploy
```

Do not use `prisma migrate dev` or `prisma db push` in this environment.

## Optional local seed data

Seed only when demo data is useful:

```bash
docker compose -f compose.production.yml run --rm backend npx prisma db seed
```

Seeding is manual and is never part of container startup.

## Start the production stack

```bash
docker compose -f compose.production.yml up -d
docker compose -f compose.production.yml ps
```

Local URLs:

- Frontend: <http://localhost:3000>
- Backend API: <http://localhost:4000/api>
- Backend health: <http://localhost:4000/health>
- Existing API health alias: <http://localhost:4000/api/health>
- PostgreSQL debugging port: `localhost:5433`

## Logs and health

```bash
docker compose -f compose.production.yml logs postgres
docker compose -f compose.production.yml logs backend
docker compose -f compose.production.yml logs frontend
docker compose -f compose.production.yml logs -f
curl --fail http://localhost:4000/health
```

PostgreSQL becomes healthy through `pg_isready`. The backend checks `/health`,
and the frontend checks `/login`. Compose starts each dependent service only
after the previous service is healthy.

## Production runtime smoke test

Use the seeded accounts and verify these routes through the browser:

```text
/login
/register
/
/players
/team
/leaderboard
/admin
/admin/players
/admin/seasons
/admin/rounds
/admin/performances
```

Verify the following behavior:

1. Log in, refresh, and confirm the authenticated user remains logged in.
2. Log out, refresh, and confirm the user remains logged out.
3. Confirm a USER visiting `/admin` is sent to `/403`.
4. Confirm an ADMIN can load and mutate all admin pages.
5. Edit a current lineup, choose a captain, save, and reload it.
6. Enter a performance as an admin, save it, recalculate, and confirm the
   dashboard and leaderboard update.
7. Load one historical lineup.

The JWT remains stateless and is stored in an HTTP-only cookie. Local Docker
uses an explicit non-secure, same-site cookie because the test runs over HTTP on
`localhost`. CORS allows only `FRONTEND_URL` and includes credentials.

## Restart persistence

```bash
docker compose -f compose.production.yml restart
docker compose -f compose.production.yml ps
```

After all services are healthy again, verify that seeded data, saved lineups,
and performance changes remain available.

## Stop or reset

Stop containers while retaining database data:

```bash
docker compose -f compose.production.yml down
```

Destroy containers and the local database volume:

```bash
docker compose -f compose.production.yml down -v
```

The complete fresh-state proof is:

```bash
docker compose -f compose.production.yml down -v
docker compose -f compose.production.yml build --no-cache
docker compose -f compose.production.yml up -d postgres
docker compose -f compose.production.yml run --rm backend npx prisma migrate deploy
docker compose -f compose.production.yml run --rm backend npx prisma db seed
docker compose -f compose.production.yml up -d
docker compose -f compose.production.yml ps
```

## Environment variables

| Variable | Purpose |
| --- | --- |
| `POSTGRES_DB` | Local database name |
| `POSTGRES_USER` | Local database user |
| `POSTGRES_PASSWORD` | Local database password |
| `POSTGRES_PORT` | Optional host debugging port |
| `DATABASE_URL` | Prisma pooled/runtime URL, assembled by Compose |
| `DIRECT_URL` | Prisma migration URL, assembled by Compose |
| `JWT_SECRET` | JWT signing secret, at least 32 characters |
| `JWT_EXPIRES_IN` | JWT lifetime |
| `AUTH_COOKIE_NAME` | HTTP-only authentication cookie name |
| `COOKIE_SECURE` | Enables HTTPS-only cookies in real production |
| `CORS_ORIGIN` | Allowed browser origin, set from `FRONTEND_URL` |
| `FRONTEND_URL` | Local frontend origin |
| `NEXT_PUBLIC_API_URL` | Browser API base URL embedded at build time |
| `FRONTEND_PORT` | Frontend host port |
| `BACKEND_PORT` | Backend host port |
| `AUTH_RATE_LIMIT_WINDOW_MS` | Authentication rate-limit window |
| `AUTH_RATE_LIMIT_MAX_REQUESTS` | Authentication requests allowed per window |
| `LOG_LEVEL` | Backend log verbosity |
| `NODE_ENV` | Set to `production` inside application containers |

## Image contents

The backend image installs from `package-lock.json`, generates Prisma Client,
compiles TypeScript, and starts `dist/server.js`. Its runtime stage includes the
Prisma CLI, migrations, and `tsx` so manual `migrate deploy` and seed commands
work from the same image.

The frontend image installs from `package-lock.json`, performs a production
Next.js build, and copies the standalone server, static files, and public assets
into the runtime stage. It starts the generated standalone `server.js` on
`0.0.0.0:3000`.
