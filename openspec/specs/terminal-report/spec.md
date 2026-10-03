# terminal-report Specification

## Purpose
TBD - created by archiving change apply-functional-review. Update Purpose after archive.

## Requirements

### Requirement: Screen-only warnings report

The system SHALL report findings as screen-only non-blocking warnings with no selector, auto-fix, or recovery continuation. At terminal navigation it SHALL use the shared implementation closing format, preserving the complete `Terminal functional review — pending human review` block before Next step and placing the unchanged completion literal in Next step, followed by Execution details last. The Final sweep, learnings, visibility listing, and terminal documentation commit SHALL occur before the closing report, not between its review findings and navigation. The report itself SHALL write no artifact; the review's Functional checkbox marking already happened at execute. There SHALL be no fast-track deferred Human Verification item.

#### Scenario: Findings print before unchanged literal

- **WHEN** the terminal review completes with `fail` or `unverifiable` verdicts
- **THEN** every finding prints with its reason as pending human review and one recommendation line in the complete held review block before the byte-identical completion literal in Next step, after the Final sweep, learnings, and terminal documentation commit, with Execution details last

#### Scenario: Consecutive cluster prints after intervening work

- **WHEN** the terminal documentation commit, no-op, or decline has completed
- **THEN** the shared closing report presents all held `fail` and `unverifiable` checks or omits the review block when none remain, followed by the byte-identical literal in Next step and Execution details last, with no intervening execution work or deferred Human Verification list

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

The system SHALL print the shared closing report only at navigation and never at execute. Its order SHALL be the required initial status, Terminology when applicable, What you need to know, the complete held pending-human-review block when applicable, Next step containing the unchanged completion literal, and Execution details last. Printing SHALL occur after the Final sweep, learnings, and terminal documentation commit, with no execution work between review findings and navigation. The order SHALL be identical with and without fast-track; no deferred Human Verification list SHALL exist in either path.

#### Scenario: Fast-track findings-HV-literal order

- **WHEN** fast-track is active and the terminal review has completed
- **THEN** the common report presents findings or omits their block before the unchanged completion literal in Next step, places Execution details last, and prints only at navigation after the Final sweep, learnings, and terminal documentation commit

#### Scenario: Fast-track findings-HV-literal order after commit

- **WHEN** fast-track is active and the terminal review has completed with held verdicts
- **THEN** the complete pending-human-review block precedes the unchanged completion literal in Next step and final Execution details, with no sweep, learnings, or commit work between findings and navigation

### Requirement: Ephemeral warnings
The system SHALL keep warnings ephemeral with no persistence, so a re-entry re-derives them from the current implementation.md and previous findings are lost.
#### Scenario: Re-entry re-derives warnings
- **WHEN** apply re-enters with a current implementation.md after a prior run printed warnings
- **THEN** the review re-derives verdicts from the current file without restoring prior findings

### Requirement: Terminal suite stop has a direct closing-report path

When the plan's Verification commands section lacks the full-suite command, the command cannot run, or the suite fails, Apply SHALL print the shared stopped closing report directly from the terminal suite gate without invoking successful terminal navigation. It SHALL state the command or its absence, failure or cannot-run reason, remaining work and commits, and existing suite re-entry guidance before Execution details. Sections 1 through 5 of the terminal lifecycle SHALL NOT run, no terminal entry SHALL be marked, and no completion literal or successful transition SHALL print. The report SHALL omit the pending-human-review block because the functional review has not run. Under Build, the supervisor SHALL print the single invocation-wide stopped report from these available results.

#### Scenario: Terminal suite fails after Step commits

- **WHEN** the terminal suite gate fails after every Step and its commit gate have closed
- **THEN** the direct stopped report describes the retained commits and suite re-entry action, prints available diagnostics last, and performs no functional review, final sweep, learnings promotion, or terminal documentation commit

#### Scenario: Full-suite command is absent or cannot run

- **WHEN** the Verification commands section exists but lacks the full-suite command or the command cannot run
- **THEN** Apply uses the same direct stopped-report path, identifies the missing command or execution error, and marks no terminal work

### Requirement: Legacy suite omission remains permitted and visible

A plan with no Verification commands section SHALL retain the pinned notice `> Terminal suite gate: skipped — plan has no full-suite command` and continue through the remaining terminal lifecycle. The closing report SHALL carry this omission and its reason in What you need to know and Execution details and classify an otherwise completed run as completed with warnings. The permitted omission SHALL NOT be presented as successful verification.

#### Scenario: Legacy plan completes after skipping the gate

- **WHEN** a plan has no Verification commands section and otherwise reaches completion
- **THEN** the existing skip notice and continuation remain intact and the final report identifies the skipped full-suite check with its reason and the completed-with-warnings status
