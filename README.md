# Fret Coach API

Fret Coach provides a backend foundation for guitar practice and performance feedback. Its first feature is a practice library where users choose chromatic, scale, or finger-dexterity exercises, view tablature, follow a BPM, and loop selected measures.

This is not a quiz product. The service does not store answer keys or model practice as right or wrong answers.

## Current architecture boundary

`Exercise` describes a training goal. `ExerciseScore` stores alphaTab-loadable Guitar Pro, MusicXML, or alphaTex scores together with a default BPM and backing track. `LoopRegion` stores repeatable measure ranges, and `PracticeSession` stores the selected loop, BPM, duration, and completion status.

The client uses **alphaTab** for tablature rendering and playback highlighting. A backing `<audio>` element or Web Audio is the single time source; alphaTab follows that source for synchronization. Future real-time pitch detection will compare notes against the target note at that time.

At this stage, the project only defines the asynchronous API contract and persistence models for AI analysis: `POST /recordings/:id/analysis` creates a `QUEUED` analysis record. Audio transcription, beat and pitch detection, bend detection, and queue workers will be added later without blocking the core API.

## Local setup

1. `npm install`
2. `cp .env.example .env`, then replace both JWT secrets for production.
3. `docker compose up -d`
4. `npm run prisma:deploy`
5. `npm run prisma:seed`
6. `npm run start:dev`

The API base URL is `http://localhost:3000/api/v1`; Swagger is at `http://localhost:3000/api/docs`; the health check is `GET /api/v1/health`.

## API overview

- `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`
- `POST /auth/google`: verify a Google Identity Services ID token and issue Fret Coach JWTs
- `GET/PATCH /users/me`
- `GET /exercises`, `GET /exercises/:id`
- `GET /dashboard/me`: authenticated next-practice, weekly statistics, coach note, and recommendations
- `POST /practice-sessions`: submit `exerciseId`, optional `loopRegionId`, and `targetBpm`
- `POST /practice-sessions/:id/recordings`: register audio uploaded directly to object storage
- `POST /recordings/:recordingId/analysis`, `GET /recordings/:recordingId/analysis`
- `POST /practice-sessions/:id/complete`, `GET /progress/me`
- `POST /practice-attempts`, `GET /practice-attempts`, `GET /practice-attempts/:id`
- `GET /exercises/:id/progress`

All endpoints except health checks, authentication, and public exercise-library reads require `Authorization: Bearer <accessToken>`.

Google sign-in is optional. Set `GOOGLE_CLIENT_ID` to the same Google OAuth Web Client ID used by the frontend. The API validates Google-issued ID tokens before using their verified email and stable Google subject to create or link an account; it does not store Google access tokens.

Exercise-detail responses include `score.timeline`, the normalized musical timeline used for future performance scoring. Events use MIDI ticks rather than fixed milliseconds, so clients can use any BPM:

```text
milliseconds = (startTick / ticksPerQuarter) * (60_000 / currentBpm)
```

The MVP uses one BPM per score. Future tempo changes, time-signature changes, and backing-track offsets can extend this with a `tempoMap`. Exercise-list responses intentionally omit the full timeline.

The development seed provides 16 original foundation exercises across chromatic finger independence, alternate picking, legato, scales, chord mobility, rhythm, and bend-target preparation. Exercise metadata includes `skillFocus`, `estimatedMinutes`, and `libraryOrder`, so library and dashboard surfaces do not need hard-coded labels or durations.

## Practice-attempt persistence

The client keeps microphone audio local. It may send only a finalized practice summary and optional per-event diagnostics to `POST /practice-attempts`; the API never accepts audio bytes or an audio URL on this endpoint.

Exercise detail includes `score.revision`, a stable identifier composed from the generated timeline version and source hash. Send that value unchanged with the attempt. A stale revision is rejected so results cannot be saved against a changed score.

`clientRunId` must be a UUID generated once per local run. Retrying the same request returns the original attempt without incrementing progress twice. The server validates the selected loop and timeline event IDs, creates missing diagnostics for omitted target notes, and calculates every count and accuracy percentage itself.

For an `EXTRA_NOTE` diagnostic, attach it to the scoreable timeline event window where the extra note occurred. It counts as an extra note and a missed target. Do not send client-computed aggregate fields such as `correctCount`, `accuracyPercent`, or `extraNoteCount`; they are deliberately rejected by request validation.

## Commands

- `npm run prisma:migrate -- --name <migration_name>`: create a migration
- `npm run prisma:deploy`: deploy migrations
- `npm run prisma:seed`: load development exercises
- `psql "$DATABASE_URL" -f prisma/seed.sql`: load the same base exercise data using raw SQL
- `npm test`, `npm run lint:check`, `npm run format:check`, `npm run build`

## Next steps

Add pre-signed object-storage uploads, queue workers, and the audio AI pipeline. Then add score parsing and optional backing-track generation. Analysis results should use a unified millisecond timeline so the client can locate issues in the waveform, score, and practice replay.
