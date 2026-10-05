# FretCoach API — Status and unfinished work

Reviewed 2026-10-04 against source and live GitHub issues. This is an implementation snapshot, not deployment or pilot evidence.

## Product goal and challenge

Help returning self-taught guitarists master failing passages in their own songs through a private practice loop: arrangement → assessable passage → input-quality check → attempt → evidence-backed review → focused intervention → re-attempt and comparison.

The API owns private data, canonical score timelines, persistence, and account isolation. The sibling web repository owns input capture, playback, evaluation, and presentation. The active product specification is [web issue #1](https://github.com/BinaryDevil/fret-coach-web/issues/1), still open. The challenge is validating trustworthy pitch/onset assessment and useful interventions, rather than merely storing results. A supported import is not necessarily assessable, and one clean attempt does not establish mastery.

## Implemented foundation

| Capability                    | Evidence and limits                                                                                                                                                                                               |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Accounts and curated practice | JWT/Google authentication, public exercise reads, sessions, dashboard, progress. Technique progress remains separate from song mastery.                                                                           |
| Private arrangements          | Signed upload, server-side alphaTab parsing, canonical v3 timeline, owner-scoped list/detail/source/deletion. Public publishing removed. [API #1](https://github.com/BinaryDevil/fret-coach-api/issues/1) closed. |
| Attempts                      | Private track/measure targets and curated targets, revision checks, retry identity, server-calculated diagnostic counts. [API #2](https://github.com/BinaryDevil/fret-coach-api/issues/2) closed.                 |
| History and research          | Exact-passage history, separate corrections, consented structured telemetry, deletion cascades. [API #3](https://github.com/BinaryDevil/fret-coach-api/issues/3) closed.                                          |
| Legacy recording analysis     | Registration and queued analysis records exist; an audio-analysis worker is not implemented.                                                                                                                      |

Source authorities are `prisma/schema.prisma`, `src/score-imports/`, `src/scores/`, and `src/practice-attempts/`. See [README](../README.md) for setup/contracts and [CONTEXT](../CONTEXT.md) for vocabulary.

## Unfulfilled work

These are product requirements and review findings, not newly accepted API tickets. All existing API issues are closed; verify live issues before choosing new work.

- **Reliable baseline/comparability:** history currently chooses the earliest saved attempt for the exact track/range. It does not select by input reliability or separate comparisons by revision or tempo. Define those rules with the web evaluator before claiming the first reliable baseline is delivered.
- **Evidence contract:** diagnostic aggregates alone do not establish input confidence, product-defined pitch/onset criteria, or repeated mastery. Determine which evidence and criteria version must persist across both experiences. Corrections must preserve historical measurements.
- **Integration:** verify import → passage → input check → attempt → persisted review → comparison → deletion across web/API. API tests alone do not prove this journey.
- **Real input:** validate permission, noise/bleed, detector/onset behavior, and latency with a real guitar at relevant milestones. Simulator results do not establish microphone reliability.
- **Deletion recovery:** storage deletion precedes the database cascade; a database failure can leave metadata without its source. Resolve retries/recovery before claiming operationally robust deletion.
- **Pilot:** verify consent/event emission/deletion and define a continue/revise/stop rubric before recruitment. No discovery or pilot outcomes are established here.
- **Release:** verify target-database migrations, storage behavior, and deployed client/API compatibility. This review did not deploy migrations or run production checks.

Prioritize the private-song vertical slice. Cloud audio workers, broad formats, library expansion, complex AI, public sharing, and pricing experiments are deferred pending evidence.

## Operations and handoff

Deploy existing migrations with `npm run prisma:deploy` against the intended database. Private-arrangement, attempt, and research migrations need deployment independently of source commits. Tickets #1–#3 need no seed data; seed only to load/update development exercises. Timeline rebuilding is a separate derived-data operation.

Use `PORT=3001` alongside the web app on port 3000; the API defaults to 3000. Keep secrets out of docs. `scripts/migrate-to-neon.sh` was introduced as unused; its presence does not prove a database-provider migration occurred.

Handoffs should record commits, checks actually run, outstanding contracts, and migration/deployment status. Keep GitHub as the tracker and update this snapshot as facts change.
