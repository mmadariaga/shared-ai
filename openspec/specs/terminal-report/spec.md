# terminal-report Specification

## Purpose
TBD - created by archiving change apply-functional-review. Update Purpose after archive.

## Requirements

### Requirement: Screen-only warnings report
The system SHALL report findings as screen-only non-blocking warnings with no selector, no auto-fix, and no recovery continuation, emitting a consecutive cluster of findings or silence followed by the unchanged completion literal, and SHALL place the Final sweep, learnings, visibility listing, and terminal documentation commit before this cluster, never between its items. The report itself SHALL write no artifact; the review's Functional checkbox marking already happened at execute. There SHALL be no fast-track deferred Human Verification item in the cluster.

#### Scenario: Findings print before unchanged literal
- **WHEN** the terminal review completes with `fail` or `unverifiable` verdicts
- **THEN** each finding prints with its reason as pending human review and one recommendation line before the byte-identical completion literal, as a consecutive cluster after the Final sweep, learnings, and terminal documentation commit, with nothing between its items

#### Scenario: Consecutive cluster prints after intervening work
- **WHEN** the terminal documentation commit, no-op, or decline has completed
- **THEN** each held `fail` and `unverifiable` check or silence, then the byte-identical literal, print consecutively with no intervening work and no deferred list between them

### Requirement: User-language recommendation prose
The system SHALL print the failure and unverifiable prose plus the recommendation in the user input language, using Spanish when the user writes Spanish and English fallback otherwise.
#### Scenario: Spanish user receives Spanish warnings
- **WHEN** the user writes Spanish and the terminal review has fail or unverifiable verdicts
- **THEN** each finding and its recommendation line prints in Spanish before the completion literal

### Requirement: Lax completion semantics
The system SHALL complete the terminal entry even with findings and SHALL pass the Final sweep independently of them, treating applied as Steps executed and committed.
#### Scenario: Findings do not block completion
- **WHEN** the terminal review yields fail or unverifiable findings
- **THEN** the entry still completes and the Final sweep still passes without auto-fix or extra commit

### Requirement: Fixed fast-track print order
The system SHALL print the cluster in the fixed consecutive order of findings or silence first and the unchanged completion literal last, after the Final sweep, learnings, and terminal documentation commit, never between the cluster items, with print occurring only at navigation and never at execute. The order SHALL be identical with and without fast-track; no deferred Human Verification list exists in either path.

#### Scenario: Fast-track findings-HV-literal order
- **WHEN** fast-track is active and the terminal review has completed
- **THEN** the output order is findings or silence first and the completion literal last, after the Final sweep, learnings, and terminal documentation commit, with nothing between the cluster items and no print at execute time

#### Scenario: Fast-track findings-HV-literal order after commit
- **WHEN** fast-track is active and the terminal review has completed with held verdicts
- **THEN** the output order is findings or silence first and the completion literal last, with no sweep, learnings, or commit work between them

### Requirement: Ephemeral warnings
The system SHALL keep warnings ephemeral with no persistence, so a re-entry re-derives them from the current implementation.md and previous findings are lost.
#### Scenario: Re-entry re-derives warnings
- **WHEN** apply re-enters with a current implementation.md after a prior run printed warnings
- **THEN** the review re-derives verdicts from the current file without restoring prior findings
