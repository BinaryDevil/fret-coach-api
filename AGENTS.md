# FretCoach API

NestJS + Prisma/PostgreSQL backend for private, evidence-first guitar practice. Help returning self-taught guitarists improve failing passages in their own arrangements through measured attempts, focused interventions, and repeatable progress. The client is in `../fret-coach-web`.

## Context and workflow

- Before domain/contract changes, read [CONTEXT.md](CONTEXT.md) for vocabulary and boundaries.
- Before planning or reporting status, read [project status](docs/project-context.md), then verify relevant source and live issues. Closed tickets do not prove product delivery.
- For setup/contracts, read [README.md](README.md). Scripts and schema are authoritative in package.json and prisma/schema.prisma.
- Track work in GitHub Issues for BinaryDevil/fret-coach-api using gh. Shared product scope is web issue #1; commits and pushes are per repository.

## Project rules

- Enforce authenticated ownership for private arrangements, attempts, corrections, and telemetry. Keep imports private and deletable; public discovery requires a separate licensed-content decision.
- Keep microphone audio on-device by default. Attempt/telemetry contracts accept structured data, not audio bytes or URLs. Legacy recording routes do not authorize default cloud capture.
- Ground assessment in pitch, onset timing, and input quality. Parser support and diagnostic counts do not prove assessability, a reliable baseline, or repeated mastery.
- Keep technique progress separate from song mastery and corrections separate from historical measurements. AI explanations cannot replace diagnosis.
- Match feature-local Nest modules, class-validator DTOs, Swagger, and existing style. Test externally visible behavior, including ownership, invalid inputs, revisions, and retries as relevant.
- Add new Prisma migrations; preserve applied ones. Distinguish generation, deployment, and seeding. Apply database changes only in the authorized scope/environment.
- Inspect affected web consumers when changing a contract; update or explicitly flag client work.
- Keep .env, connection strings, JWT secrets, and storage secrets out of commits/output. Add environment variables to .env.example with placeholders.
- For code changes run focused tests, npm test, npm run lint:check, npm run build, and changed-file formatting checks. For docs-only work verify formatting, links, claims, and symlinks. Report checks actually run; distinguish implemented, pushed, deployed, and production-verified.

## Behavioral guidelines

These guidelines reduce common LLM coding mistakes and bias toward caution over speed. For trivial tasks, use judgment.

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No flexibility or configurability that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't improve adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```text
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

These guidelines are working if there are fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
