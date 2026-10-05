# FretCoach API — Domain context

FretCoach serves returning self-taught guitarists practicing meaningful, player-owned arrangements. This API supplies persistence and score contracts for a private, evidence-first practice loop.

| Concept              | Meaning and API boundary                                                                                                                |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Private arrangement  | Owner-only notation represented by UserSong, ScoreImport, and tracks; not a public catalogue entry.                                     |
| Target passage       | Selected track and inclusive measure range.                                                                                             |
| Assessable passage   | Deterministic expected events plus usable input; READY parsing alone is insufficient.                                                   |
| Attempt              | A finalized passage or technique performance persisted as PracticeAttempt. PracticeSession represents a different activity lifecycle.   |
| Accuracy rating      | Summary paired with pitch, onset-timing, and input-confidence evidence. Unassessable input receives no authoritative rating.            |
| Baseline             | First reliable valid measurement for a passage. Current earliest-saved history selection is a limitation, documented in project status. |
| Weak point           | An observed event or transition limiting reliable performance.                                                                          |
| Focused intervention | One next action grounded in evidence; proposed physical causes remain intervention hypotheses.                                          |
| Mastery threshold    | Product-defined pitch, timing, tempo, and repeatability criteria, independent of player-selected practice assistance.                   |
| Correction           | Separate player feedback that preserves the original attempt.                                                                           |

The browser captures and evaluates performance; raw microphone audio stays on-device by default. The API validates structured results, calculates diagnostic aggregates, and enforces ownership. AI may explain evidence but does not replace measurement.

Canonical timelines use musical ticks and revisions derived from timeline version/source hash. Interpret track IDs and event indexes within the submitted revision. Technique progress does not establish song mastery. Initial assessment claims cover calibrated single-note pitch/onset timing; expressive techniques, chords, overlap, and unsupported timing require separate evidence even when parser metadata exists.

The shared glossary is `../fret-coach-web/CONTEXT.md`. Read the web ADRs `docs/adr/0001-private-player-owned-arrangements.md` and `0002-evidence-first-assessment.md` for privacy and assessment decisions when changing cross-repository design. See [project status](docs/project-context.md) for implementation gaps.
