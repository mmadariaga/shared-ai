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

After successful review and a valid triage parse, the `/sai-review` composition coordinator SHALL own the zero-audit close and SHALL apply the shared findings-driven Direct Build close with only the freshly generated `review.md`. Eligible findings SHALL receive the existing correction choice, with no fix dispatch before explicit selection; when no eligible findings remain, the composition SHALL preserve its pinned zero-audit literal and existing blocked-finding explanations. The composition SHALL NOT apply the review adapter's standalone Direct Build close. Using the final adapter's `terminal_navigation` SHALL select its presentation only, never its standalone selector or dispatches. Missing review content or no legible triage section SHALL retain the error close, not a correction choice.

#### Scenario: Zero audits recommended with findings still present
- **WHEN** a successful `/sai-review` run has a valid triage parse, recommends zero audits, and the freshly generated `review.md` still carries eligible findings
- **THEN** the composition coordinator SHALL offer the existing shared Direct Build correction choice with `review.md` only, dispatch no audits and dispatch no fix before explicit selection; the standalone review adapter SHALL offer no selector and dispatch nothing
