# Fret Coach — Project Context

> This file is the persistent handoff record for cross-session and cross-device development. Update it whenever product direction, a key technical decision, or an API contract changes.

## Product goal

Fret Coach is a web product for guitar learners. It helps users practice techniques and complete songs, and will gradually provide feedback based on recorded performances.

It is not a quiz product: answer keys and correctness scores are not part of the core practice model.

Long-term flow:

```text
Practice library / full-song practice → performance recording → asynchronous AI analysis → pitch, rhythm, bend, and technique feedback
```

## Current stage: Practice library

The current scope is limited to the practice library and basic practice records. It does not yet include recording input, AI evaluation, real-time pitch detection, score uploads, or backing-track generation.

The product is currently in **guest practice mode**: users can go from “Start a session” to the practice library and an individual exercise without signing in. The client still sends credentials automatically when an authenticated session exists. Guests do not create practice records, so practice-session creation and completion plus progress endpoints still require authentication.

Users can:

1. Browse chromatic, scale, and finger-dexterity exercises.
2. View tablature.
3. Select a BPM and loop range.
4. Start and complete a practice session, saving duration and daily streaks.

## Score and playback approach

The client uses **alphaTab**; do not draw tablature manually with Canvas.

- Supported formats: `GUITAR_PRO`, `MUSIC_XML`, and `ALPHA_TEX`.
- alphaTex can be read directly from the API's `score.content`.
- Guitar Pro and MusicXML will later load from object-storage URLs; the database already stores `storageKey`.
- A backing `<audio>` element or Web Audio is the sole time source. alphaTab provides the playback cursor, current beat/note highlighting, scrolling, and score synchronization.
- `LoopRegion` stores loop configuration by measure range.

First exercise:

- Slug: `chromatic-1-2-3-4`
- Title: `1-2-3-4 Full-Range Spider`
- Format: alphaTex
- Default tempo: 60 BPM
- Content: play 1-2-3-4 from the low E string to the high E string, then return to the low E string (12 measures total)
- Loop: measures 1–12 (`Full Loop`)

The seed content, loop label, score title, API-facing descriptions, and project documentation are English-only.

## Technology stack

- Node.js + TypeScript + NestJS
- PostgreSQL (currently Supabase) + Prisma
- REST API + Swagger
- JWT access tokens + refresh tokens
- Docker Compose for optional local PostgreSQL
- ESLint, Prettier, and Jest

## Domain models

| Model                                                                  | Purpose                                                                  |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `User`                                                                 | Account, handedness, tuning, timezone, and refresh-token hash            |
| `Exercise`                                                             | Exercise title, type, description, and training configuration            |
| `ExerciseScore`                                                        | alphaTab score, default BPM, time signature, and backing-track resources |
| `LoopRegion`                                                           | A repeatable measure range within an exercise                            |
| `PracticeSession`                                                      | User-selected loop, BPM, duration, and status                            |
| `UserProgress`                                                         | Total sessions, total duration, and daily streaks                        |
| `PerformanceRecording` / `PerformanceAnalysis` / `PerformanceFeedback` | Reserved for future audio AI analysis                                    |

`prisma/schema.prisma` is the authoritative source for the database models. Migrations live in `prisma/migrations/`.

## API

API base URL: `http://localhost:3001/api/v1`

Swagger: `http://localhost:3001/api/docs`

Health check: `GET /health`

Authentication:

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`

Public practice-library reads (an authenticated client may optionally send `Authorization: Bearer <accessToken>`):

- `GET /exercises`
- `GET /exercises/slug/chromatic-1-2-3-4`

The following endpoints require `Authorization: Bearer <accessToken>`:

- `GET /exercises/:id`
- `POST /practice-sessions`
- `POST /practice-sessions/:id/complete`
- `GET /progress/me`

Create-session request:

```json
{
  "exerciseId": "<exercise.id>",
  "loopRegionId": "<optional loopRegion.id>",
  "targetBpm": 60
}
```

## Local development

```bash
npm install
cp .env.example .env
# Set DATABASE_URL and JWT secrets; never commit .env
npm run prisma:deploy
npm run prisma:seed
npm run start:dev
```

The frontend normally uses port `3000`; set the backend `PORT` to `3001` in `.env`.

Raw SQL seed data:

```bash
psql "$DATABASE_URL" -f prisma/seed.sql
```

## Known notes

- `joi` must use `import * as Joi from 'joi'`; otherwise it is `undefined` at runtime.
- The production start script is `node dist/src/main` because the current TypeScript build output is under `dist/src/`.
- Prisma warns that the `prisma.seed` package.json configuration will be deprecated. This does not block development; migrate it to `prisma.config.ts` in the future.
- Do not commit `.env` or `node_modules`. Inject Supabase connection strings and JWT secrets independently on each device.

## Next priorities

1. Capture guitar audio input in the frontend and define the recording-upload flow.
2. Build the alphaTab exercise-detail page, BPM controls, and loop playback in the frontend.
3. Add more exercises and a content-management workflow.
4. Add pre-signed object-storage uploads for Guitar Pro, MusicXML, and backing-track files.
5. Add a background queue, then implement pitch, rhythm, bend, and technique analysis on a unified millisecond timeline.
