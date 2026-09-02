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
- `POST /score-imports`, `POST /score-imports/:id/complete`, `GET /score-imports`, `GET /score-imports/:id`, `GET /score-imports/:id/source`

All endpoints except health checks, authentication, and public exercise-library reads require `Authorization: Bearer <accessToken>`.

### Private score import

Authenticated users can import private Guitar Pro (`.gp`, `.gp3`–`.gp5`, `.gpx`), MusicXML (`.musicxml`, `.xml`), or alphaTex (`.alphatex`, `.at`, `.txt`) files. Imported files are not public library content.

1. `POST /score-imports` with `title`, optional `artist`, `format`, `fileName`, `mimeType`, and `sizeBytes` (maximum 10 MiB).
2. Upload the browser `File` directly with `PUT` to `upload.uploadUrl`, using `upload.uploadHeaders`.
3. Call `POST /score-imports/:id/complete`.
4. Poll `GET /score-imports/:id` until the status is `READY` or `FAILED`.
5. When ready, use `GET /score-imports/:id/source` to obtain a ten-minute signed `sourceUrl` for alphaTab. Do not persist this URL.

The completion step downloads the private upload server-side, parses it with alphaTab, writes the canonical v2 timeline, and persists the discovered tracks. A `READY` import exposes `timeline` and `tracks`; a `FAILED` import includes a safe diagnostic `parseError`. The API always scopes every import to the authenticated owner and returns `404` for another user's import.

Create a **private** Supabase Storage bucket named `fret-coach-scores` (or set `SUPABASE_SCORE_BUCKET` to another private-bucket name). Set `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, and `SUPABASE_SCORE_BUCKET` only in the API environment, such as Railway. Never put the secret key in frontend code or a Vercel environment variable. `SUPABASE_SERVICE_ROLE_KEY` remains a temporary legacy fallback for older projects.

Google sign-in is optional. Set `GOOGLE_CLIENT_ID` to the same Google OAuth Web Client ID used by the frontend. The API validates Google-issued ID tokens before using their verified email and stable Google subject to create or link an account; it does not store Google access tokens.

Exercise-detail responses include `score.timeline`, the normalized musical timeline used for future performance scoring. Events use MIDI ticks rather than fixed milliseconds, so clients can use any BPM:

```text
milliseconds = (startTick / ticksPerQuarter) * (60_000 / currentBpm)
```

The MVP uses one BPM per score. Future tempo changes, time-signature changes, and backing-track offsets can extend this with a `tempoMap`. Exercise-list responses intentionally omit the full timeline.

### Canonical score timeline

`score.timeline` is a versioned FretCoach contract, independent of alphaTab's internal objects. Version 2 adds `tracks` and structured notation data, while retaining `trackIndex`, `notes`, and `techniques` for existing clients. A track has a stable `id` within `score.revision`, name, instrument class, tuning, and optional capo. Events use `trackId` when selecting a practice target.

Beat-level notation is returned in `event.effects`; note-specific notation is returned in `event.notes[].effects`. The current canonical effect set includes pick direction, tremolo picking, upward/downward arpeggios, vibrato, bends with a BPM-independent pitch curve, hammer/pull relationships, slides, palm mute, let ring, harmonics, dead/ghost notes, and staccato. `destinationEventId` links applicable legato and slide effects to their deterministic target event.

The client may display every effect immediately, but only pitch and timing should be treated as scoreable for now. Technique-specific grading will be introduced one effect family at a time. On a parser upgrade, incrementing the timeline version regenerates `score.revision`; clients must submit that revision with practice results.

This is a JSONB-only timeline shape upgrade: there is no Prisma migration to deploy. Run `npm run prisma:seed` locally, or invoke the score rebuild path for existing imported scores, to write version-2 timelines.

The development seed provides 18 original foundation exercises across chromatic finger independence, alternate picking, legato, scales, chord mobility, rhythm, tremolo, arpeggios, and bend-target preparation. Several seeds now include real alphaTex notation markers for pick direction, palm mute, tremolo picking, arpeggio direction, and whole-step bends. Exercise metadata includes `skillFocus`, `estimatedMinutes`, and `libraryOrder`, so library and dashboard surfaces do not need hard-coded labels or durations.

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
