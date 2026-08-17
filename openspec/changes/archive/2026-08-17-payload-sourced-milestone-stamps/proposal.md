> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation. It describes a decision already made, not one being proposed.

## Why

Worker payloads previously did not carry their own emission instant, so milestone stamps depended on coordinator render time and on harness-specific shell plumbing. The implementation makes closure timestamps worker-authored, measurable across the complete result stream, and independent of coordinator clock access. The interview reported no known limitations or technical debt left behind.

## What Changes

- Add mandatory worker-authored `emitted_on` timestamps to every terminal payload, design notice, and progress event, including pre-resolution and no-plan results.
- Validate and forward the offset-bearing ISO-8601 value verbatim in every routed phase.
- Derive exactly one `HH:MM` milestone stamp when a progress step renders completed, using the result that marked it.
- Extend milestone stamping from the three planning phases to the four audit progress plans.
- Keep the `sai-explore` Idea Progress List and apply step projection unstamped.
- Remove start-and-closure stamp pairs, inheritance, per-render clock calls, time-command grants, and the planning-phase Claude `Bash(date:*)` exception.
- Record the decision in DDR 0140, DDR 0141, and ADR 0144, update indexes and glossary entries, and add regression coverage.

## Capabilities

### New Capabilities

- `payload-emission-time`: Closed worker payloads carry a mandatory worker-authored `emitted_on` value in the required offset-bearing ISO-8601 format.

### Modified Capabilities

- `sai-todo-timestamps`: Milestone stamps become closure-only, payload-sourced, and applicable to audit plans.
- `worker-lifecycle-protocol`: Terminal, notice, and progress payload contracts include and validate `emitted_on`.
- `progress-event-lifecycle`: Progress events include `emitted_on` while retaining nonterminal continuation semantics.
- `nonterminal-result-transport`: Notices and progress events transport their worker-authored emission time.
- `worker-failure-classification`: Failed payloads retain classification fields while carrying validated emission time.
- `coordinator-progress-ownership`: Coordinators mark declared steps and source stamps only from marking payloads.
- `apply-step-projection`: Apply's run-start projection remains unstamped and separate from dispatch-local progress plans.
- `apply-coordinator-ownership`: Apply coordinator ownership remains unchanged while worker payloads provide timestamps.
- `apply-red-green-worker-model`: RED and GREEN lifecycle results carry timestamps without changing their scope boundaries.
- `apply-routed-card-set`: Apply progress validation accepts the timestamped event shape.
- `spec-coordinator`: The spec coordinator accepts timestamped progress events without taking clock ownership.
- `spec-proposal-worker`: Spec worker progress and terminal payloads carry emission time.
- `implementation-coordinator`: The implementation coordinator renders payload-sourced stamps without coordinator clock access.
- `implementation-planning-worker`: Implementation worker progress and terminal payloads carry emission time.
- `design-coordinator`: Design coordination no longer uses a wall-clock shell call.
- `design-planning-worker`: Design notices, progress events, and terminal payloads carry emission time.
- `design-subagent-delegation`: Design source discovery and timestamp sourcing remain outside coordinator shell I/O.
- `review-phase-coordinator`: Review progress uses the shared timestamped lifecycle and audit stamping policy.
- `review-phase-worker`: Review lifecycle results carry emission time.
- `security-phase-coordinator`: Security progress uses the shared timestamped lifecycle and audit stamping policy.
- `security-phase-worker`: Security lifecycle results carry emission time.
- `accessibility-phase-coordinator`: Accessibility progress uses the shared timestamped lifecycle and audit stamping policy.
- `accessibility-phase-worker`: Accessibility lifecycle results carry emission time.
- `audit-command-progress-plans`: Review, security, performance, and accessibility plans receive closure-only stamps.
- `per-command-tool-scoping`: Planning Claude wrappers return to the common read-only tool scope without `Bash(date:*)`.

## Impact

- **New files**: `docs/adr/0144-planning-coordinators-drop-the-scoped-date-shell-entry.md`, `docs/ddr/0140-closed-worker-payloads-carry-result-emission-time.md`, `docs/ddr/0141-milestone-stamp-is-closure-only-and-derived-from-emitted-on.md`, `test/result-emission-time.test.js`.
- **Modified files**: `GLOSSARY.md`, `commands/claude/sai-1-spec.md`, `commands/claude/sai-2-design.md`, `commands/claude/sai-3-implement.md`, `docs/adr/0000-INDEX.md`, `docs/adr/0117-planning-coordinators-scoped-shell-entry.md`, `docs/adr/0118-per-harness-wall-clock-commands-in-bindings.md`, `docs/ddr/0000-INDEX.md`, `sai/command-runner.md`, `sai/commands/accessibility/coordinator.md`, `sai/commands/apply/coordinator.md`, `sai/commands/apply/green-worker.md`, `sai/commands/apply/red-worker.md`, `sai/commands/apply/runner.md`, `sai/commands/implement/coordinator.md`, `sai/commands/performance/coordinator.md`, `sai/commands/review/coordinator.md`, `sai/commands/security/coordinator.md`, `sai/commands/spec/coordinator.md`, `sai/policies/todo-structure.md`, `sai/worker-core.md`, `test/design-coordinator-worker.test.js`, `test/implement-coordinator-worker.test.js`, `test/install-claude.test.js`, `test/todo-structure-policy.test.js`.
- **Out of scope**: `design.md`, `tasks.md`, `implementation.md` — not generated by `/sai-backfill`.
