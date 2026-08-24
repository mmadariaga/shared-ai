# apply-coordinator-read-boundary Specification

## Purpose

TBD - created by syncing change clarify-apply-coordinator-contract.

## Requirements

### Requirement: Apply coordinators SHALL distinguish coordination reads from technical write-preparation reads

The Apply coordinator SHALL be allowed to inspect artifacts required for prerequisites, change resolution, the run-start Step Projection, checklist verification, reporting, and gate decisions. The coordinator MUST NOT perform technical reads whose purpose is to prepare the contents of a RED or GREEN worker write, and MUST NOT perform RED/GREEN verification runs or production and test edits.

#### Scenario: Coordinator performs a coordination read

- **WHEN** the coordinator reads an artifact to resolve, project, route, verify, report, or gate the current Apply step
- **THEN** the read is permitted, while technical reads preparing a worker write remain prohibited
