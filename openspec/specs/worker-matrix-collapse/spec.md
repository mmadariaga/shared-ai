# worker-matrix-collapse Specification

## Purpose

TBD

## Requirements

### Requirement: Canonical worker matrix contents

The canonical matrix SHALL contain nineteen entries: spec, design, five ordered implementation roles ui/frontend/backend/infra/other, review, security, performance, accessibility, commit, archive, backfill, merge, RED then GREEN apply, Direct Build implementer, and review-fix. Implementation roles SHALL share sai/commands/implement/worker.md with distinct implementation-category binding stems. Direct Build SHALL retain sai-direct-build-worker, direct-build, and sai/commands/explore/direct-build-worker.md; review-fix SHALL retain sai-review-fix-worker, review-fix, and sai/commands/meta-review/review-fix-worker.md. Materialization SHALL produce one binding and one agent per worker per harness. Retired hands and autofast identities SHALL remain inactive.

#### Scenario: Manifest expansion yields the fifteen-worker roster

- **WHEN** the category-planning manifest expands for either harness
- **THEN** nineteen bindings and nineteen managed agents materialize, including all five implementation roles, the unchanged merge worker, and the unchanged Direct Build worker.

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
- **THEN** the binding continues the captured handle with the runner's continuation payload, reuses its single dispatch call for the replacement, and defers the bounded worker/replacement lifecycle to `sai/orchestration/command-runner.md`.

### Requirement: Projection lifecycle integrity covers matrix replacement and retirements

Deterministic matrix projections SHALL remain available to install, doctor, and uninstall. The former single implementation agent and binding destinations SHALL have managed-hash retirement records for both harnesses. Existing retirement records SHALL remain intact. Obsolete managed files SHALL be removed only when their bytes match registered managed variants; modified files SHALL remain preserved. Unrelated support-agent and idea-list projections SHALL not be retired.

#### Scenario: Re-projection removes obsolete managed files safely

- **WHEN** a prior installation contains retired implementation, per-phase, autofast, hands, or apply-body destinations
- **THEN** installation uses their recorded hashes to remove only recognized managed content and preserves modified content with drift reporting.

#### Scenario: Doctor and uninstall agree with installation

- **WHEN** doctor and uninstall run after category matrix projection
- **THEN** they share the active nineteen-worker inventory and retirement records, preserve tuning, and do not treat retired files as active or phantom workers.

### Requirement: Canonical tests enforce cross-harness matrix parity

Tests SHALL verify nineteen workers per harness, exact bindings/contracts, parameter substitution, frontmatter and tuning preservation, phase-flag isolation, absence of unresolved placeholders, and installation/doctor/uninstall retirement integrity. They SHALL retain thin Fetch wrappers, unchanged apply/Direct Build/review-fix identities, retired-role exclusions, and byte-level regression protection for unaffected projections.

#### Scenario: Matrix regression is detected before installation

- **WHEN** a phase, worker, model, or Fetch target is missing, duplicated, or misassigned
- **THEN** matrix tests fail with the affected phase, worker, and harness identified.

#### Scenario: Historical files remain covered

- **WHEN** a removed binding, agent, or apply-body destination has a known managed byte variant
- **THEN** retirement tests require its recorded hash and reject incomplete retirement coverage or duplicate active destinations.
