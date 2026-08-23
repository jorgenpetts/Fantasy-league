# Cricket Fantasy League

Mobile-friendly fantasy cricket app for a local club league.

## Structure

- `frontend/` - Next.js, React, TypeScript, Tailwind CSS
- `backend/` - Express, TypeScript, Zod, Prisma
- `shared/` - shared TypeScript domain types

## Backend

```bash
cd backend
npm install
cp .env.example .env
npm run build
npm start
```

Health check:

```bash
curl http://localhost:4000/api/health
```

Prisma schema validation:

```bash
cd backend
npx prisma validate
```

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Production build:

```bash
cd frontend
npm run build
```

## Current Scope

The current foundation includes project structure, TypeScript setup, Express
health checks, Prisma schema for confirmed entities, environment examples, and a
simple frontend dashboard placeholder.

Unresolved fantasy rules are intentionally not hard-coded yet.
