# temporary-plan-integration Specification

## Purpose
Assemble independent planning parts into a complete verified implementation plan without replacing protected work on an incomplete or invalid run.

## Requirements

### Requirement: Run-bound temporary artifact identity

The planning tool SHALL create a distinct run under the change's .planning-parts directory with an immutable assignment inventory and hashes of current planning inputs. Each part SHALL identify its run, agent, input hashes, and ordered assigned Steps. Acceptance SHALL require current run/input identity and exact assignment coverage; a matching filename alone SHALL be insufficient.

#### Scenario: A part comes from another run

- **WHEN** a part's run, input hashes, agent, or assignment differs from the current run
- **THEN** integration rejects it and preserves the previous final plan and retained temporary files.

#### Scenario: Planning inputs change during collection

- **WHEN** a current planning input differs from the captured input hashes
- **THEN** the run is invalidated and requires fresh preparation and routing rather than reusing stale parts.

### Requirement: Complete ordered assembly and semantic verification

The coordinator SHALL assemble every tasks.md Step exactly once from its assigned worker in original tasks.md order. It SHALL verify interfaces.md conformance, cross-category dependencies, test and implementation planning rules, manual and deferred checks, rerun preservation, and audit-append invariants. Parser and hash checks SHALL not replace semantic verification.

#### Scenario: A part is incomplete or incompatible

- **WHEN** a part omits, duplicates, misassigns, malforms, or conflicts with a required Step or interface
- **THEN** publication remains blocked while the coordinator requests same-worker corrections and preserves valid sibling parts.

#### Scenario: An audit adds coordinator-owned Steps

- **WHEN** eligible audit findings require appended Steps
- **THEN** the coordinator owns those Steps, numbers them after the tasks.md Steps, and verifies their audit-ingestion and interface contracts before publication.

### Requirement: Verified publication preserves the final contract

The coordinator SHALL be the sole final-plan writer. Publication SHALL require the complete part set, current input identity, the verified candidate hash, unchanged validation candidate bytes, successful executable preflight, and completed semantic validation. The tool SHALL rerun preflight before atomically replacing implementation.md. The final format and sai-4 RED/GREEN consumption SHALL remain unchanged.

#### Scenario: Publication checks fail

- **WHEN** an input, candidate, preflight, or semantic check fails
- **THEN** the previous implementation.md remains intact and neither planning completion nor an apply transition is claimed.

#### Scenario: A complete candidate is verified

- **WHEN** all required parts and final checks succeed
- **THEN** the coordinator publishes the complete plan in its existing format and may invoke the phase's authorized terminal action.

### Requirement: Exact successful-run cleanup

Cleanup SHALL remove only exact temporary files owned by the successfully verified run. It SHALL preserve unrelated files, other runs, and failed-run artifacts, and SHALL not recursively delete the temporary directory. Changed-file reporting SHALL include written temporary paths even if successful cleanup later removes them.

#### Scenario: Unrelated files share the temporary directory

- **WHEN** a verified run publishes with unrelated files present
- **THEN** only the run's named owned files are removed and unrelated files remain.

#### Scenario: A run does not publish successfully

- **WHEN** integration or verification fails
- **THEN** its temporary artifacts remain available for identity-checked recovery.
