# GradienceV2

AI-powered grading platform built with Next.js. GradienceV2 is the frontend for Gradient. View the app [here](gradience-v1.vercel.app).

## Prerequisites

- Node.js `>= 20.9.0` (recommended: Node 22)
- npm
- Auth0 tenant + application

## 1) Install dependencies

From the project root:

- `npm install`

## 2) Configure environment variables

Create a `.env` file in the project root (or copy from `.env.example`) and set:

- `AUTH0_ISSUER_BASE_URL` (e.g. `https://your-tenant.us.auth0.com`)
- `AUTH0_DOMAIN` (e.g. `your-tenant.us.auth0.com`)
- `AUTH0_CLIENT_ID`
- `AUTH0_CLIENT_SECRET`
- `AUTH0_SECRET` (long random secret)
- `APP_BASE_URL` (local: `http://localhost:3000`)
- `AUTH0_BASE_URL` (local: `http://localhost:3000`)
- `NEXT_PUBLIC_GA_MEASUREMENT_ID` (optional, for GA)
(The variables below should be obtained from aws psql db)
- `STORAGE_AWS_ACCOUNT_ID`
- `STORAGE_AWS_REGION`
- `STORAGE_AWS_RESOURCE_ARN`
- `STORAGE_AWS_ROLE_ARN`
- `STORAGE_PGDATABASE`
- `STORAGE_PGHOST`
- `STORAGE_PGPORT`
- `STORAGE_PGSSLMODE`
- `STORAGE_PGUSER`

## 3) Run locally

- Development: `npm run dev`
- App URL: `http://localhost:3000`

Authentication flow:

- Unauthenticated users are redirected to `/login`
- Login starts at `/api/auth/login`

## 4) Production build

- Build: `npm run build`
- Start: `npm run start`

## Notes

- Route protection is handled via `proxy.ts`.
- Auth is handled by `@auth0/nextjs-auth0` server-side sessions.
- Do not commit `.env` secrets to source control.

## Database workflow

- Apply schema changes: `npm run db:apply`
- Seed canonical demo data: `npm run db:seed`
- Verify table counts and seed expectations: `npm run db:check`
- Validate relational integrity rules: `npm run db:test`
