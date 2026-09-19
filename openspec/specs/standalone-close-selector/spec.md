# standalone-close-selector Specification

## Purpose
TBD - created by archiving change review-standalone-direct-build-close. Update Purpose after archive.

## Requirements

### Requirement: Standalone Direct Build Selector
The standalone review close SHALL present exactly two options, Direct Build and Do not implement anything now, through the native picker only when the freshly generated review.md reports remaining findings, and SHALL dispatch the fix worker only on explicit Direct Build selection. This close SHALL belong to the standalone `/sai-5-review` invocation only. When the review adapter runs inside the `/sai-review` composition it SHALL offer no selector and SHALL dispatch nothing: with one or more audits activated the shared runner already resolves this non-final adapter's terminal navigation to the composition transition, and in the zero-audit case the composition coordinator owns the terminal outcome.
#### Scenario: Findings remain in standalone review
- **WHEN** the freshly generated review.md reports at least one remaining finding
- **THEN** the close presents Direct Build versus Do not implement anything now and dispatches only on explicit selection
#### Scenario: The adapter runs inside the review composition
- **WHEN** the review adapter runs inside the `/sai-review` composition, with audits activated or with zero audits recommended
- **THEN** the Direct Build close does not apply, no selector is offered, and nothing is dispatched from that adapter

### Requirement: Clean Empty-Diff Failed Cancelled Exclusion
The standalone close SHALL offer no selector and SHALL close with the normal terminal text when review.md reports zero findings, the diff is empty, or the run is failed or cancelled, and a dismissed picker SHALL equal Do not implement anything now.
#### Scenario: Clean close without selector
- **WHEN** review.md reports zero findings or the run carries an empty diff, failure, or cancellation
- **THEN** the run closes with the standard terminal text and dispatches no fix worker

### Requirement: Identical Standalone Close Text
Every standalone branch and post-fix path SHALL close with identical text consisting of the verbatim worker summary plus the Recommended Audits block plus the changed-files union plus Review done., with the E4 non-convergence note appended after that same close.
#### Scenario: Identical close on every branch
- **WHEN** any standalone branch completes including post-fix convergence or E4 non-convergence
- **THEN** the run prints the identical standard close text with the manual-route note only after it for E4

### Requirement: Review Close Read Boundary Covers The Fix-Loop Diff

The review coordinator's sole read exception SHALL cover, in addition to the freshly generated `review.md` and the on-disk audits, the diff its fix loop verifies — the fix worker's resulting diff, read read-only. The exception SHALL NOT widen the artifact-blind clean route, and every other coordinator prohibition SHALL remain in force.

#### Scenario: The fix loop reads the diff it verifies

- **WHEN** the standalone Direct Build close runs its fix loop after dispatching the review-fix worker
- **THEN** the coordinator MAY read the resulting diff read-only under the same sole exception, while the clean route stays artifact-blind

### Requirement: Meta-Review Zero-Audit Branch Is Terminal

The `/sai-review` composition coordinator SHALL treat its zero-audit branch as terminal for the composition: it SHALL print its pinned zero-audit literal, SHALL dispatch nothing, and SHALL NOT apply the review adapter's Direct Build close, even when `review.md` still carries findings. Using the final adapter's `terminal_navigation` in that branch SHALL select its presentation only, never its selector or its dispatches.

#### Scenario: Zero audits recommended with findings still present

- **WHEN** a `/sai-review` run recommends zero audits while `review.md` still carries findings
- **THEN** the composition prints its pinned zero-audit literal, offers no Direct Build selector, and dispatches nothing
