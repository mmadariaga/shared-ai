# standalone-close-selector Specification

## Purpose
TBD - created by archiving change review-standalone-direct-build-close. Update Purpose after archive.

## Requirements

### Requirement: Standalone Direct Build Selector
The standalone review close SHALL present exactly two options, Direct Build and Do not implement anything now, through the native picker only when the freshly generated review.md reports remaining findings, and SHALL dispatch the fix worker only on explicit Direct Build selection.
#### Scenario: Findings remain in standalone review
- **WHEN** the freshly generated review.md reports at least one remaining finding
- **THEN** the close presents Direct Build versus Do not implement anything now and dispatches only on explicit selection

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
