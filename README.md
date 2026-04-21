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

Create `.env` from the example file:

- `cp .env.example .env`

Then update values in `.env` as needed (for local development, use `http://localhost:3000` for base URLs):

- `AUTH0_ISSUER_BASE_URL` (e.g. `https://your-tenant.us.auth0.com`)
- `AUTH0_DOMAIN` (e.g. `your-tenant.us.auth0.com`)
- `AUTH0_CLIENT_ID`
- `AUTH0_CLIENT_SECRET`
- `AUTH0_SECRET` (long random secret)
- `APP_BASE_URL` (local: `http://localhost:3000`)
- `AUTH0_BASE_URL` (local: `http://localhost:3000`)
- `NEXT_PUBLIC_GA_MEASUREMENT_ID` (optional, for GA)
- `API_SECRET_TOKEN` (required for AI rubric/grade API requests via `X-API-Token`)
(The variables below should be obtained from aws psql db)
- `AWS_ACCOUNT_ID`
- `AWS_REGION`
- `AWS_RESOURCE_ARN`
- `AWS_ROLE_ARN`
- `PGDATABASE`
- `PGHOST`
- `PGPORT`
- `PGSSLMODE`
- `PGUSER`
- `STORAGE_AWS_ACCOUNT_ID`
- `STORAGE_AWS_REGION`
- `STORAGE_AWS_RESOURCE_ARN`
- `STORAGE_AWS_ROLE_ARN`
- `STORAGE_PGDATABASE`
- `STORAGE_PGHOST`
- `STORAGE_PGPORT`
- `STORAGE_PGSSLMODE`
- `STORAGE_PGUSER`
- `VERCEL_OIDC_TOKEN` (has to be generated from vercel cli)

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

## LLM automation in PR workflow

This repository includes two repeatable automation steps for LLM-assisted engineering workflow:

- `LLM PR Review` workflow (`.github/workflows/llm-pr-review.yml`)
  - Trigger: PR opened/synchronized/reopened/ready for review
  - Output: bot comment on the PR with risk summary and findings
- `Dev Spec Automation On Approval` workflow (`.github/workflows/dev-spec-on-approval.yml`)
  - Trigger: PR review submitted with `APPROVED` state
  - Requirement: PR must include a `story:<id>` label mapped in `.github/dev-spec-mapping.json`
  - Output: auto-generated docs PR that creates/updates the story development spec, plus a tracking issue

Required configuration:

- Repository secret: `OPENAI_API_KEY`
- Optional repository variable: `OPENAI_REVIEW_MODEL`
- Optional repository variable: `OPENAI_SPEC_MODEL`

Prompt sources:

- PR review prompt is embedded in `.github/workflows/llm-pr-review.yml`
- New spec prompt: `prompts/dev-spec-create.prompt.md`
- Update spec prompt: `prompts/dev-spec-update.prompt.md`

Story implementation/testing prompt helpers:

- Build story implementation prompt: `npm run llm:story:implementation`
- Build story testing prompt: `npm run llm:story:tests`
- Story-specific workflow notes for regrade requests: `docs/regrade-story-automation.md`
