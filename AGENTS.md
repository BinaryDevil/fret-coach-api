# Fret Coach API

NestJS + Prisma (PostgreSQL) backend for Fret Coach, a guitar practice and performance-feedback product. The web client lives in the sibling repo `fret-coach-web`. See `README.md` for setup and the endpoint overview, and `docs/project-context.md` for product direction and key decisions.

## Commands

- `npm run dev`: start with watch (API at `http://localhost:3000/api/v1`, Swagger at `/api/docs`)
- `npm test`: Jest, run in band
- `npm run lint:check` / `npm run format:check`: verify only; `lint` and `format` write changes
- `npm run build`: compile with `nest build`
- `npm run prisma:migrate`: create and apply a migration in dev; `prisma:deploy` applies existing ones; `prisma:seed` seeds

Run `npm test`, `npm run lint:check`, and `npm run build` before considering a change done.

## Conventions

- One Nest module per feature under `src/<feature>/`: `*.module.ts`, `*.controller.ts`, `*.service.ts`, `dto/`, and co-located `*.spec.ts` tests.
- Validate input with `class-validator` DTOs; document endpoints with `@nestjs/swagger` decorators.
- Prettier: single quotes, trailing commas, 100-column width.
- Schema changes go through a new Prisma migration in `prisma/migrations/` (timestamped folder). Never edit an applied migration.
- All routes except health, auth, and public exercise-library reads require the JWT bearer guard.

## Domain rules

- This is **not a quiz product**. Do not add answer keys or right/wrong scoring to the practice model.
- Score imports and practice attempts are **private to the owning user** and deletable. Scope every query by the authenticated user.
- Scores use alphaTab-loadable formats (`GUITAR_PRO`, `MUSIC_XML`, `ALPHA_TEX`). The client does the rendering; the API only stores and serves them.
- Files go directly from the browser to Supabase object storage via signed upload URLs. The API never proxies file bodies.
- AI analysis is asynchronous. `POST /recordings/:id/analysis` only creates a `QUEUED` record.

## Secrets

`.env` is local and must not be committed or echoed in output. `SUPABASE_SECRET_KEY` and the JWT secrets are server-only. Add new variables to `.env.example` with placeholder values.

## Working with the web repo

An API contract change (route, request or response shape, enum value) usually needs a matching change in `../fret-coach-web`. When you change a contract, say so, and update or flag the client. Commits and PRs are per repo.

## Agent skills

### Issue tracker

Issues are tracked in this repository's GitHub Issues (`BinaryDevil/fret-coach-api`); use the `gh` CLI. The web repo keeps its tracker conventions in `docs/agents/issue-tracker.md` and `docs/agents/triage-labels.md`, and the same five triage labels apply here.

### Domain docs

Single-context layout. Read `CONTEXT.md` and any relevant `docs/adr/` entries if they exist; proceed silently if not.
