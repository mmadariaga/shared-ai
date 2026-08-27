# worker-matrix-collapse Specification

## Purpose

TBD
## Requirements
### Requirement: Canonical worker matrix contents

The canonical worker matrix SHALL define exactly fourteen entries: the eleven canonical phase identities (spec, design, implementation, review, security, performance, accessibility, commit, archive, backfill, merge), followed by the RED then GREEN apply identities and one Direct Build implementer identity. The Direct Build identity SHALL be `sai-direct-build-worker`, use binding stem `direct-build`, and use contract `sai/commands/explore/direct-build-worker.md`. The former auto-fast implement and hands roles are retired; no hands worker or autofast identity SHALL remain active. Materializing the matrix SHALL project exactly one binding and one managed agent per worker per harness, including `orchestration/workers/bindings/merge-worker.md` and the `sai-merge-worker` managed agent.

#### Scenario: Manifest expansion yields the fourteen-worker roster

- **WHEN** the install manifest expands for either harness
- **THEN** exactly fourteen active worker bindings and fourteen managed agents materialize, with the merge phase bound to `sai-merge-worker` and the Direct Build phase bound to `sai-direct-build-worker`.

### Requirement: Materialized worker behavior preserves canonical lifecycle contracts

Each materialized worker agent SHALL preserve its harness-specific frontmatter identity and user-tunable fields while its managed body begins with the harness-specific fetch-skill bootstrap and remains a thin Fetch wrapper for the canonical worker contract. Each materialized binding SHALL preserve the shared two-string invocation envelope, same-worker continuation before bounded replacement reconstruction, closed lifecycle payloads, progress-plan rules, and the harness-specific dispatch primitive. Direct Build materialization SHALL use the `sai-direct-build-worker` contract and the same lifecycle rules without exposing the retired auto-fast or hands identities. No worker template or generated worker payload SHALL expose continuation identifiers, dispatch metadata, or artifact contents.

#### Scenario: Thin agent wrappers resolve the canonical contract

- **WHEN** a managed worker agent is inspected after matrix materialization
- **THEN** it has exactly one harness-valid frontmatter block, its managed body begins with the harness fetch bootstrap, and it fetches exactly the canonical phase worker contract without duplicating the contract text or leaving a placeholder.

#### Scenario: worker matrix renders the harness bootstrap

- **WHEN** the worker matrix materializes a managed worker for either supported harness
- **THEN** the generated body begins with that harness's fetch bootstrap and then fetches exactly the canonical worker contract.

#### Scenario: Worker continuation and replacement remain bounded

- **WHEN** a worker result requests continuation or a coordinator reconstructs a replacement worker
- **THEN** the binding uses the phase's exact continuation literal, preserves only the allowed reconstruction fields, and never starts more than the existing bounded worker/replacement lifecycle permits.

### Requirement: Projection lifecycle integrity covers matrix replacement and retirements

The manifest and expansion layer SHALL represent the parameterized templates as deterministic managed projections whose materialized bytes remain available to install, doctor, and uninstall. The change SHALL retire every removed per-phase binding and managed-agent source destination with a complete `managedHashes` record in the same manifest revision, including the former auto-fast implementer and hands projections, while preserving existing retirement records and excluding unrelated `idea-list-render` and support-agent projections from retirement. The retired `sai/commands/apply/body.md` utility-card destination SHALL be covered by the same retirement machinery.

#### Scenario: Re-projection removes obsolete managed files safely

- **WHEN** install is run against a prior installation containing a removed per-phase source file or the retired apply body destination
- **THEN** the obsolete file is recognized through its retirement record and removed only when its bytes match a permitted managed hash, while user-modified content is preserved and reported as drift.

#### Scenario: Doctor and uninstall agree with installation

- **WHEN** doctor and uninstall are run after matrix projection
- **THEN** both enumerate the same active materialized worker projections and retirement records, report no orphan or phantom worker destinations, preserve user tuning, and complete without treating historical retired files as active projections.

### Requirement: Canonical tests enforce cross-harness matrix parity

The test suite SHALL verify every routed phase and both apply workers across both harnesses, including parameter substitution, exact worker-contract Fetch targets, frontmatter and tuning preservation, phase-flag isolation, absence of unresolved placeholders, and install/doctor/uninstall retirement integrity. The tests SHALL verify the fourteen-entry roster, the Direct Build phase, `sai-direct-build-worker`, the retired hands role, and the absence of active auto-fast identities. The tests SHALL retain the established thin-agent Fetch-wrapper behavior precedent rather than accepting duplicated worker contract bodies.

#### Scenario: Matrix regression is detected before installation

- **WHEN** a phase parameter, continuation literal, model, or Fetch target is missing, duplicated, or assigned to the wrong phase or worker
- **THEN** the canonical matrix tests fail with the phase, worker, and harness identified.

#### Scenario: Historical files remain covered

- **WHEN** a removed binding, managed-agent destination, or retired apply body destination has any previously managed byte variant
- **THEN** the retirement-integrity tests require every known hash to remain registered and reject incomplete retirement or a duplicate active destination.
