# ADR 0225: Explore machines guard preconditions, not paths

## Status

Accepted. Builds on the `explore-idea@1` and `explore-slice@1` machines and the issue intake of `/sai-explore`; it supersedes no earlier record.

## Context

A Direct Build slice parked only to correct its `Backlog origin` became a dead end: `route-choice` answered `RESUMPTION_REQUIRED`, the resume needed run state that never existed, and the only exit was resetting `explore-slice@1`, which also clears the completed slices and the publication answer. Each correction or shortcut needed its own special intent (`issue-shortcut`, `resume-direct-build`, a prose rule against `fail` as an amendment shortcut), so any case the intents did not foresee ended without an exit.

## Decision

1. **Each explore machine has one precondition-checked `goto`.** `explore-idea@1` and `explore-slice@1` each take a `goto` intent with a target and a reason (`user-request` or `correction`). Each machine declares its per-stage preconditions as data. A failed check answers `MISSING_PRECONDITIONS` with `missing` and `resume_at`, leaves the state unchanged, and records nothing. Every accepted move is recorded in the machine's `moves` list and exposed through the run view. The stage order is a default path, not a gate.
2. **Backward always, forward only up to the route selector.** A backward `goto` is always accepted and keeps the sections of later stages. A forward `goto` needs the sections of the earlier stages `agreed` and stops at the route selector, which stays the only authorization of a route: it is answered in a later turn with the block visible, and no `goto` reaches a route start or a route step (`GOTO_PAST_CEILING`). A block amendment that changes agreed content voids the slice's route authorization; one that changes only block metadata keeps it.
3. **A section is skipped only when its data already exists in an agreed source.** A section is the data a stage produces (`What`/`Why`, the `E` list, the `I` list), with the state `agreed` or `open` and the source `issue` or `conversation`. It counts as `agreed` only when the work issue holds it explicitly, or the user wrote or confirmed it earlier in the conversation; a list the agent proposed and the user never confirmed stays `open`. The data itself is never omitted, and the store keeps identifiers and states, never free text.
4. **Issue seeding requires an explicit `work` answer.** An issue given as context is not a request to work on it, so it seeds nothing; it is seeded when the user later picks it for work, at any `Maturity`. Seeding records each section with its state and source, so only the sections the issue leaves open, or that a deviation reopens, are discussed. The `issue-shortcut` intent is removed.
5. **A Direct Build rewind reaches only pending or the first step.** Direct Build run state lives in the conversation, not in the store, so a rewind to a later step has nothing to resume from. Until that state lives in the store, a rewind inside a Direct Build route moves the slice to pending or to the route's first step with fresh run state; a Plan route rewinds to any earlier step.

## Alternatives Considered

- **A single `discard-parked` intent for the parked Direct Build cursor** — rejected: it fixes only the reported case and leaves every other correction without an exit.
- **A prose rule forbidding `fail` as an amendment shortcut** — rejected: it is cheap, but it keeps the dead end and the loss of completed slices.
- **Treat a direct instruction such as "go straight to Direct Build" as route authorization** — rejected: it would grant writes without showing the block.

## Consequences

- A correction or shortcut is one general movement. A case no intent foresaw still has an exit, and every rejection names what is missing.
- A rewind inside a Direct Build route reaches only pending or the first step until its run state lives in the store.
- A backward `goto` after crystallization locks the route intents until the stored blocks are registered again or amended.

## Provenance

Change `explore-state-goto`, decision "Explore machines guard preconditions, not paths".
