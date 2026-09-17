# terminal-review Specification

## Purpose
TBD - created by archiving change apply-functional-review. Update Purpose after archive.

## Requirements

### Requirement: Terminal functional review execution
The system SHALL perform exactly one coordinator-owned terminal functional review execution after the Step loop, the per-Step commit gates, and the appendices have completed, and before the Final sweep, with no worker dispatch, no RED/GREEN cycle, no recovery slot, and no extra commit. No Human Verification gate precedes it, because apply has none. It SHALL assign verdicts, mark the `pass` checks, hold every verdict in invocation memory, and SHALL NOT print at execute time; print is not part of execution.

#### Scenario: Review runs pre-sweep without dispatch
- **WHEN** the Step loop, commit gates, and appendices have completed
- **THEN** the coordinator re-exercises the aggregated Functional checks empirically before the Final sweep without dispatching a worker, marks the `pass` checks, holds verdicts in invocation memory, and prints nothing at execute time

#### Scenario: Execute holds verdicts silently pre-sweep
- **WHEN** the Step loop, commit gates, and appendices have completed
- **THEN** the coordinator re-exercises aggregated Functional checks once before the Final sweep, holds verdicts in invocation memory, and prints nothing at that moment

### Requirement: Aggregated Human coverage
The system SHALL cover the aggregated **Functional** `- [ ]` checkboxes from `implementation.md` across all Steps including `Deferred from Step N` blocks, reading `**Functional (...)**` and the legacy `**Human (...)**` header as the same block with no artifact migration. Already-marked `[x]` checks SHALL be outside coverage and SHALL NOT be re-verified. Italic parenthetical notes and Steps without Functional checks SHALL contribute nothing, and Automated checks SHALL NOT be re-run.

#### Scenario: Human-only aggregated coverage
- **WHEN** the terminal review collects its coverage from the current `implementation.md`
- **THEN** every unmarked Functional checkbox including deferred blocks is re-exercised once under either header, while already-marked checks, Automated checks, and italic notes are excluded

### Requirement: Per-check verdicts
The system SHALL assign exactly one verdict per Functional check — `pass`, `fail`, or `unverifiable` with a one-line reason — where `unverifiable` means the check needs human senses with no runnable surface to re-exercise.

#### Scenario: Verdict per Human check
- **WHEN** each aggregated Functional check is re-exercised against current working-tree state where a runnable surface exists
- **THEN** the check receives exactly one of `pass`, `fail`, or `unverifiable` with a reason

### Requirement: Synthetic terminal projection entry
The system SHALL allow exactly one coordinator-derived synthetic terminal entry for the terminal functional review in the run-start Step Projection, with no Step heading, no checkbox, and no dispatch, staying pending through execute, sweep, learnings, and commit and becoming completed when the print slot is emitted, including when the slot is empty, independent of findings.
#### Scenario: Synthetic entry completes on warnings print
- **WHEN** the run-start projection renders with the terminal review entry present
- **THEN** the entry stays pending through execute, sweep, learnings, and commit and flips to completed when the print slot is emitted even when the findings slot is silent
#### Scenario: Synthetic entry completes on print-slot emission including empty
- **WHEN** the run-start projection renders with the terminal review entry present
- **THEN** the entry stays pending through execute, sweep, learnings, and commit and flips to completed when the print slot is emitted even when the findings slot is silent

### Requirement: Terminal functional review marks the Functional checkboxes it verified
The terminal functional review SHALL be the only surface that marks Functional checkboxes. At execute it SHALL mark `[x]` exactly the checks whose verdict is `pass`, and a `fail` or `unverifiable` check SHALL stay `- [ ]` and be reported as pending human review — a valid terminal state, not missing work. Marking those checkboxes in `implementation.md` SHALL be the review's only file write, and RED and GREEN workers SHALL never mark a checkbox.

#### Scenario: Review marks only verified checks
- **WHEN** the review assigns `pass` to some aggregated Functional checks and `fail` or `unverifiable` to others
- **THEN** it marks `[x]` exactly the `pass` checks, leaves the rest `- [ ]` as pending human review, and writes no other file
