# ADR 0193: The apply Step routing mode is computed by `apply-step.js route`

<!-- adr-index: amends 0183 -->

## Status

Accepted

## Context

ADR 0183 has the `/sai-4-apply` coordinator decide which of five routing conditions a Step satisfies, read from a table in `runner.md`, and emit that mode to `apply-standalone@1`. All three inputs of the decision are facts of the written plan: whether the Step has a RED block, whether `interfaces.md` holds exactly one `## Step N` contract, and whether a production file is in scope. In an opencode `/sai-build` run the coordinator classified a test-only Step as `green-direct`, re-routed it mid-Step, and sent the RED worker without its own `dispatch-check`. The late checkpoint made `verify` fail with `only_in_subagent` and stopped the run.

## Decision

1. `apply-step.js route --change <name> --step <N>` computes the mode from `implementation.md`, `interfaces.md`, and `tasks.md` as they are on disk, and returns it. The coordinator emits that mode to the machine unchanged; the routing table leaves `runner.md`.
2. `dispatch-check` classifies the Step with the same function and refuses a dispatch kind the mode does not accept, returning `reason: dispatch-mode-mismatch`, the mode, and no checkpoint, before any worker writes. The recovery fresh-RED `red` dispatch stays accepted on a `green-direct` Step.
3. Test versus production is decided by the tool's existing test/support path recognizer, extended with common conventions, so plans written before this decision classify without re-running `/sai-3-implement`.
4. The machine stays routing-only: it still accepts any valid mode and does no file I/O.

## Alternatives Considered

- **Guard only in `dispatch-check`, with the coordinator still classifying in prose** — rejected: the model would re-classify after a refusal, the improvisation that skipped the check.
- **Let `apply-standalone@1` derive the mode** — rejected: the machine would have to read `implementation.md`, breaking its routing-only role.
- **An explicit test/production marker in the plan** — rejected: it needs design and implement changes and leaves written plans unclassifiable.

## Consequences

- The recognizer is a heuristic: a project with an unusual test layout can have a test file classified as production.
- A coordinator that omits a `dispatch-check` for another reason still gets the generic `only_in_subagent` diagnosis; an in-run exit for a late checkpoint is out of scope.
