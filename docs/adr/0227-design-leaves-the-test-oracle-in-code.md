# ADR 0227: Design leaves the test oracle in code

## Status

Accepted. It supersedes no earlier record.

## Context

`/sai-2-design` described each test in prose (`interfaces.md`), and RED then translated that prose into code again in `/sai-3-implement`. Telemetry of the last eight changes showed the planning and build coordinators spending 70% or more of their tokens, much of it on this translation and on the per-step RED and GREEN arbitration. A reviewer of a plan read several markdown artifacts instead of executable tests.

## Decision

1. **`/sai-2-design` runs two phases in one run.** `sai-2-design-worker` writes a reduced `design.md` (the finished shape with its file manifest, the decisions with their record family, the risks) and a `tasks.md` whose steps each name the plan tests they turn green, or a closure criterion when no meaningful test exists, with their files and their own test command. The dedicated `sai-2-red-worker`, a separate matrix entry with its own model and card (`sai/commands/design/red-worker.md`), then writes the interface stubs and the failing plan tests.
2. **The coordinator accepts a plan test only when it is red by assertion.** A test that fails to compile or already passes is sent back, except an entry that `tasks.md` marks as a regression guard. A test that cannot be written as a meaningful assertion becomes a closure criterion, recorded as an assumption. A change whose steps all carry closure criteria creates no plan RED. The plan tests are committed failing, never skipped, in a commit of their own after the plan documents.
3. **`/sai-3-implement` and `/sai-build` run GREEN-only steps.** Each step turns its plan tests green while the tests of earlier steps stay green. At start the run checks that the plan tests are still red by assertion, and a change planned with the earlier format (it has `interfaces.md` and no plan tests) stops and asks for `/sai-2-design` to run again. The fix RED (`sai-3-red-worker`) is created only for a review or audit finding that needs a new test.
4. **The prose contract and the overview retire.** `interfaces.md`, `change-overview.md`, the `--overview-lang` option, the overview question of the explore Plan route, and the `step-contract` lint check are removed; the draft pull request, which carries the design segment's code commits, is the review surface. `design.md` keeps the File Manifest so documentation, prompts, configuration, and glue code that never pass through the plan RED stay visible.

## Alternatives Considered

- **Remove `/sai-2-design` and fold the test phase into `/sai-plan`** — rejected: the standalone command stays, with a new job.
- **Move the decisions into `proposal.md` and drop `design.md`** — rejected: `design.md` keeps four sections with real consumers.
- **Let the RED agent also write `design.md` and `tasks.md`** — rejected: it would put planning artifacts into an implementer card.
- **Reuse `sai-3-red-worker` as the plan RED** — rejected: the plan RED and the fix RED would share one model, and telemetry would have to split one agent by command.

## Consequences

- The branch of a draft pull request has failing tests, so its continuous integration stays red until the build runs.
- A change planned with the earlier format cannot be built without running `/sai-2-design` again.
- RED work moves from the build to the plan; the saving comes from what disappears (the prose contract and the per-step arbitration), not from removing RED work.
- The worker matrix gains one entry and one short worker card to maintain, and telemetry attributes `sai-2-red-worker` to the Design segment by agent name.

## Provenance

Change `design-writes-red-tests`, decision "The design phase writes the tests in code".
