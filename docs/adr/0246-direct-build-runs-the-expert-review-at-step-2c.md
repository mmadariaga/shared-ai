# ADR 0246: Direct Build runs the expert review at step-2c

## Status

Accepted.

## Context

Direct Build had no independent review of the implemented production code before backfill and archive. The producer and its own review loop share the same framing, so a code defect they both miss could reach the backfilled OpenSpec drafts and the archive commit.

## Decision

The Direct Build route runs an optional adversarial expert review at `step-2c`, after the Step 2b suite gate and before the Step 3 backfill. Its mode is mutations and its product is the run's production changed-path union, with test files and untouched dirty paths excluded. Only `auto` runs it on the unattended route; `ask` and `no` skip it without a question. Kept corrections rerun the tests `test-select.js` selects for them, and a new failure against the Step 2b classification reverts every worker change. The checkpoint creates no commit, no no-commit guard window, and no commit grant: the corrections stay in the working tree for the archive step's commit. `/sai-direct-build` accepts `--expert-review [no|auto|ask]`, where a bare flag is `auto` and the argument wins over `expertReview.build`; the explore route reads the setting alone.

## Alternatives Considered

- **Reuse the `/sai-build` checkpoint.** Rejected because its product and flow differ: it reviews the files a planned change modifies against its change base and commits its corrections, while Direct Build has no build flow and must leave the commit to the archive step.
- **Run the checkpoint before the suite gate.** Rejected because its corrections would invalidate the gate's verdict, forcing a second gate run.
- **Let `ask` ask in the unattended route.** Rejected because no human is present to answer, which would break the unattended contract.

## Consequences

- The route has nine steps and a fourth worker, the `sai-adversarial-expert-review-worker` at `step-2c`.
- The backfill checkpoint waits for the handled review, which `direct-build-run@1` enforces.
- The archive commit carries any kept corrections, and the checkpoint creates no commit of its own.
- A stamped checkpoint is recorded as `expert_review_checkpoint`, so a resumed run runs it once.

## Provenance

Change `expert-review-configuration`, decision "Direct Build gets a post-implementation checkpoint in mutations mode before backfill".
