# ADR 0069: Test Command is a sibling field of Implementation Context, outside the Conventions bullet quota

## Status

Accepted

## Context

`tasks.md`'s `## Implementation Context` is the single hand-off surface between `/sai-2-design` and its two downstream consumers, `/sai-3-implement` and `/sai-4-apply`. It carried exactly three fields — **Stack**, **Conventions**, **Avoid** — mandated identically in four governing surfaces (the generator, the schema instruction, the template scaffold, and the consumer).

The blind test-writer dispatched by `/sai-4-apply` is required to run the project's test command during RED verification, yet it is forbidden from reading `implementation.md` where the resolved command lives. The command therefore has no field to travel in. **Conventions** already invites "testing idioms", so a run command could plausibly be written as one of its 2–5 bullets — but that makes a structural guarantee depend on designer discipline, and a consumer cannot parse "the bullet that happens to be the test command".

## Decision

Add **Test Command** as a fourth mandatory field of `## Implementation Context`, declared explicitly as a sibling to **Stack**, **Conventions**, and **Avoid**, and explicitly excluded from the **Conventions** 2–5 bullet quota. A run command is an infrastructure fact, not a project-specific convention, so it must not compete for that capped budget. The enumeration stays parseable by position and name across all four surfaces, which are edited to agree on four fields.

## Alternatives Considered

| Option | Pro | Con |
|---|---|---|
| Flat fourth field, outside the quota (chosen) | Parseable by name/position; a structural guarantee, not a discipline one; keeps the quota's purpose (project-specific idiom) intact | Four surfaces must be kept in sync on the field count |
| Require one **Conventions** bullet to cover testing | No new field | Makes a structural guarantee depend on designer discipline; forces an infrastructure fact to compete for a budget meant for idiom; not machine-parseable |
| Five-field testing sub-block (framework, libraries, location, naming, command) | Explicit about every testing input | Four of five duplicate information already in **Stack** or recoverable by the test-writer under permissions it already holds |

## Consequences

- Moving the field later re-breaks every consumer, so the field position/name is now load-bearing across four documents.
- The mandate binds the producer (`/sai-2-design`) for every change, including changes whose Steps all route to a single dispatch and where nothing reads the field.
- Existing archived plans are not backfilled; a plan lacking the field still triggers only the pre-existing whole-section STOP (see ADR-adjacent decision D5 in the change's `design.md`).

## Related

- `openspec/changes/mandate-test-run-command-in-implementation-context/design.md` — Decision D1
- `openspec/changes/mandate-test-run-command-in-implementation-context/specs/tasks-implementation-context/spec.md`
- `docs/adr/0070-test-command-carries-parameterised-scoping-idiom.md`
