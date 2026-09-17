# terminal-review Specification

## Purpose
TBD - created by archiving change apply-functional-review. Update Purpose after archive.

## Requirements

### Requirement: Terminal functional review execution
The system SHALL perform exactly one coordinator-owned read-only terminal functional review after the Step loop, Human Verification gates, per-Step commit gates, and appendices have completed, and before the Final sweep, with no worker dispatch, no RED/GREEN cycle, no recovery slot, no writes, and no extra commit.
#### Scenario: Review runs pre-sweep without dispatch
- **WHEN** the Step loop, Human Verification gates, commit gates, and appendices have completed
- **THEN** the coordinator re-exercises the aggregated Human checks empirically before the Final sweep without dispatching a worker or writing a file

### Requirement: Aggregated Human coverage
The system SHALL cover the aggregated Human checkboxes from implementation.md across all Steps including Deferred from Step N blocks, SHALL contribute nothing from italic parenthetical notes and Steps without Human checks, and SHALL NOT re-run Automated checks.
#### Scenario: Human-only aggregated coverage
- **WHEN** the terminal review collects its coverage from the current implementation.md
- **THEN** every Human checkbox including deferred blocks is re-exercised once while Automated checks and italic notes are excluded

### Requirement: Per-check verdicts
The system SHALL assign exactly one verdict per Human check — pass, fail, or unverifiable with a one-line reason — where unverifiable means the check needs human senses with no runnable surface to re-exercise.
#### Scenario: Verdict per Human check
- **WHEN** each aggregated Human check is re-exercised against current working-tree state where a runnable surface exists
- **THEN** the check receives exactly one of pass, fail, or unverifiable with a reason

### Requirement: Synthetic terminal projection entry
The system SHALL allow exactly one coordinator-derived synthetic terminal entry for the terminal functional review in the run-start Step Projection, with no Step heading, no checkbox, and no dispatch, rendering pending until its warnings print and completed when they do, independent of findings.
#### Scenario: Synthetic entry completes on warnings print
- **WHEN** the run-start projection renders with the terminal review entry present
- **THEN** the entry stays pending through review execution and flips to completed when its warnings print even when findings exist
