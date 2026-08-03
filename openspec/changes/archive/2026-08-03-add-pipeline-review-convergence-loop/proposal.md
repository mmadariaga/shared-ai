**Complexity**: high

## Why

Pipeline-driven artifact reviews currently run once and do not contractually assign severity, so supervision cannot implement the user's termination rule of iterating until no high-priority findings remain. A closed severity contract and a bounded review-feedback loop make that stop condition machine-readable without allowing unattended review to consume budget indefinitely.

## What Changes

- Require every pipeline-driven artifact review finding to carry exactly one severity from the closed set `High`, `Medium`, or `Low`.
- Define convergence as a completed review pass with no `High` findings; `Medium` and `Low` findings remain reportable but do not block convergence, and accepted non-blocking edits are disclosed as not re-reviewed.
- Repeat isolated review, existing per-item feedback evaluation, and re-review until convergence or a hard cap of three review passes.
- Count one review pass, followed by feedback application when findings exist, as one loop iteration; the cap counts review passes rather than findings.
- Handle a completed review pass carrying a finding with a missing or out-of-set severity as review failure through the existing failure path, without dropping the finding, coercing it to a default severity, or adding a result variant, and report that output-contract cause distinctly from a reviewer crash or cancellation.
- Treat cap exhaustion as a reportable non-failure terminal outcome that returns control with every outstanding `High` finding intact.
- Preserve the existing feedback gate's legitimacy evaluation and discard reporting, including the possibility that a repeatedly discarded `High` finding remains present until the cap.
- Preserve completed-pass findings, feedback dispositions, and the current artifact state when the spec-proposal worker fails or is cancelled during the loop; a user-initiated retry starts a new bound over those preserved artifacts.
- Keep this severity vocabulary scoped to pipeline artifact review; it does not alter the manual review loop or the vocabularies used by `sai-5-review`, `sai-6-security`, or `sai-7-performance`.

## Capabilities

### New Capabilities
- `pipeline-review-severity`: Requires an explicit `High`, `Medium`, or `Low` severity on every pipeline-driven artifact review finding, defines each level, and identifies which severity blocks convergence.
- `pipeline-convergence-loop`: Repeats isolated artifact review and existing feedback processing until a completed pass reports no `High` findings.
- `pipeline-iteration-bound`: Caps convergence at three review passes and reports outstanding `High` findings when the cap is exhausted.

### Modified Capabilities
- `pipeline-independent-review`: Extends the current single isolated review into fresh isolated passes within the bounded convergence loop while preserving reviewer independence and failure behavior.
- `explore-pipeline-supervision`: Tracks convergence, cap exhaustion, and outstanding findings as supervised pipeline outcomes before handing control back to the user.
- `artifact-feedback-gate`: Reuses the existing machine-feedback adapter on every review pass and defers the ordinary user-facing gate until the bounded convergence loop terminates.

## Impact

- `sai/instructions/explore.md`
- `sai/policies/artifact-feedback-gate.md`
- `test/explore-pipeline-supervision.test.js`
- Pipeline state and reporting contracts consumed by Claude Code, opencode, and GitHub Copilot adapters; no harness-specific severity behavior is introduced.
- No new external dependency and no change to manual review-loop output or audit command severity vocabularies.

## Proposal Research Documentation

**Local files**:
- `sai/instructions/explore.md:170-211`
- `sai/policies/artifact-feedback-gate.md:35-43,67-88`
- `sai/instructions/review.md:172-181`
- `openspec/specs/explore-pipeline-supervision/spec.md:9-69`
- `openspec/specs/pipeline-independent-review/spec.md:9-62`
- `openspec/specs/explore-post-crystallization-review-loop/spec.md:72-152`
- `openspec/changes/archive/2026-08-03-add-sai-explore-pipeline-supervision/`
- `GLOSSARY.md`

**External URLs**: None.

## Additional Notes

- The three-pass cap extrapolates from the observed pipeline review history supplied during specification, where explore-context reviewers converged in one to three passes. The pipeline reviewer is instead freshly isolated from conversation and worker reasoning, so the direction of that extrapolation is unverified; recurring cap exhaustion is evidence to revisit the bound.
- Equivalent or repeatedly discarded `High` findings still prevent convergence when a fresh reviewer reports them; the bound, rather than silent suppression, terminates that case.
- Cap exhaustion is distinct from review execution failure: it preserves valid output and outstanding findings for supervised follow-up.
