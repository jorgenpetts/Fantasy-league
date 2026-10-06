# Cricket Fantasy League

Mobile-friendly fantasy cricket app for a local club league.

For the production-like local Docker environment, see
[DOCKER_PRODUCTION_TEST.md](./DOCKER_PRODUCTION_TEST.md).

## Structure

- `frontend/` - Next.js, React, TypeScript, Tailwind CSS
- `backend/` - Express, TypeScript, Zod, Prisma
- `shared/` - shared TypeScript domain types

## Backend Setup

```bash
cd backend
npm install
cp .env.example .env
npx prisma migrate dev
npm run dev
```

Required backend environment variables:

- `DATABASE_URL`
- `DIRECT_URL`
- `JWT_SECRET`
- `CORS_ORIGIN`
- `AUTH_COOKIE_NAME`

`backend/prisma/schema.prisma` defines the provider, models, and constraints.
Prisma 6.19 still requires its `url` and `directUrl` environment references.
`backend/prisma.config.ts` supplies datasource URLs when available, plus the
migration path and seed command. Prisma commands run from `backend/` load
`backend/.env` for development.
Explicit process environment values for `DATABASE_URL` and `DIRECT_URL` take
precedence for CI and production commands. Set both to the intended database
when using separate runtime and migration URLs.

Useful commands:

```bash
cd backend
npm run typecheck
npm run build
npm test
npx prisma validate
npx prisma migrate status
```

Health check:

```bash
curl http://localhost:4000/api/health
```

## Backend API Summary

Auth:

- `POST /api/auth/register` - create a user account
- `POST /api/auth/login` - login and set the auth cookie
- `POST /api/auth/logout` - clear the auth cookie
- `GET /api/auth/me` - return the authenticated user

Fantasy rules:

- `GET /api/fantasy-rules` - central squad, budget, transfer, chip, and scoring rules

Seasons and rounds:

- `GET /api/seasons`
- `GET /api/seasons/current`
- `GET /api/rounds`
- `GET /api/rounds/current`
- `GET /api/rounds/:id`
- `GET /api/rounds/:roundId/performances`

Players:

- `GET /api/players?position=&active=&search=&seasonId=`
- `GET /api/players/:id`
- `GET /api/players/:id/performances?seasonId=&roundId=`

Fantasy teams and lineups:

- `POST /api/fantasy-teams`
- `GET /api/fantasy-teams/me`
- `GET /api/fantasy-teams/me/status`
- `GET /api/fantasy-teams/:id`
- `GET /api/fantasy-teams/:id/lineups`
- `GET /api/lineups/me/current`
- `GET /api/lineups/:teamId/:roundId`
- `PUT /api/lineups/:teamId/:roundId`

Chips:

- `POST /api/fantasy-teams/:teamId/rounds/:roundId/chip`
- `DELETE /api/fantasy-teams/:teamId/rounds/:roundId/chip`

Dashboard and leaderboards:

- `GET /api/dashboard`
- `GET /api/leaderboard`
- `GET /api/leaderboard?seasonId=`
- `GET /api/leaderboard?roundId=`

Admin:

- `POST /api/admin/seasons`
- `PUT /api/admin/seasons/:id`
- `POST /api/admin/players`
- `PUT /api/admin/players/:id`
- `POST /api/admin/rounds`
- `PUT /api/admin/rounds/:id`
- `GET /api/admin/rounds/:roundId/performances`
- `PUT /api/admin/rounds/:roundId/performances`
- `PUT /api/admin/rounds/:roundId/performances/:playerId`
- `POST /api/admin/rounds/:roundId/recalculate`

## Fantasy Rules

Version 1 uses an 11-player squad with a R110,000,000 budget:

- 1 wicketkeeper
- 4 batters
- 2 all-rounders
- 4 bowlers
- 3 free transfers per round
- 4-point penalty per extra transfer
- 1 Wildcard per season
- 1 Triple Captain per season

Player prices are stored as integer ZAR amounts.

## Frontend

```bash
cd frontend
npm install
npm run dev
```

## Continuous integration

GitHub Actions runs on every pull request and every push to `main`. It checks the backend, frontend, fresh Prisma migrations on PostgreSQL 17, and both production Docker images. CI uses Node.js 22 and npm lockfiles; it does not deploy or use production credentials.

Reproduce the main checks locally with:

```bash
cd backend
npm ci
npx prisma generate
npx prisma validate
npm run lint
npm run typecheck
npm test
npm run build

cd ../frontend
npm ci
npm run typecheck
npm run lint
npm test
BACKEND_ORIGIN=http://localhost:4000 npm run build

cd ..
docker compose -f compose.production.yml build
```

Backend integration tests and `prisma migrate deploy` require a disposable PostgreSQL database. GitHub Actions creates it automatically.
