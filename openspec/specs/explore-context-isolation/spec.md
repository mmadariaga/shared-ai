# explore-context-isolation Specification

## Purpose
TBD - created by archiving change tasks-as-scaffold. Update Purpose after archive.

## Requirements

### Requirement: Keep delegated writes behind explicit route selection

Explore SHALL remain directly read-only. The explicit Plan (unattended) route MAY dispatch only its existing supervised workers, and the explicit Direct Build (unattended) route MAY dispatch only its existing fast-lane workers under their closed ownership contracts.

The POC lane MAY dispatch the Direct Build `--no-specs` POC only after the user explicitly selects `Yes, run a POC before continuing` at the close of the `Explore change` stage and the `C1..Cn` candidate list has been agreed. That POC is a bounded exception to ordinary explore read-only behavior: only the implementer may write code, tests, or required project configuration outside `openspec/`, and only inside the lane's own branch or worktree; it may not write OpenSpec artifacts, create planning artifacts, or run mutating Git commands beyond the creation and abandonment of that isolation. The POC does not authorize backfill, spec, archive, or commit work.

#### Scenario: route authorization is explicit

- **WHEN** a crystallization selector answer or a POC go/no-go answer is received
- **THEN** only an explicitly selected Plan or Direct Build route, or an explicitly accepted POC, may dispatch its authorized workers
- **AND** no route dispatches merely because the idea is ready or the POC trigger fired

#### Scenario: the accepted POC has narrowed authority

- **WHEN** the user selects `Yes, run a POC before continuing` and the candidate list is agreed
- **THEN** only the implementer-only `--no-specs` profile may run, inside the lane's isolation, and it cannot write under `openspec/` or mutate Git state beyond that isolation

### Requirement: explore-no-inline-proposal

`sai-explore` SHALL NOT create or modify proposal or spec artifacts itself. When an idea becomes solid, it SHALL continue to emit the readiness signal and, only on explicit crystallization, the existing `Ready to Propose` block. After crystallization, explore SHALL dispatch an isolated routed worker only when the user explicitly selects `Plan - Unattended` or `Direct Build - Unattended` in the crystallization-close selector. `Manual` or no selection MUST dispatch none. The uncertainty POC is not an inline proposal or spec route and does not change this artifact boundary.

#### Scenario: idea crystallizes without pipeline consent

- **WHEN** explore emits a `Ready to Propose` block and the user has not selected Plan or Direct Build
- **THEN** explore creates no proposal or spec artifact and dispatches no feature worker

#### Scenario: user explicitly starts the isolated pipeline

- **WHEN** the user selects Plan - Unattended or Direct Build - Unattended for a change in the latest crystallized set on a supported harness
- **THEN** explore coordinates the selected isolated worker route using the crystallized block
- **AND** explore itself performs no file write

### Requirement: explore-context-preserved

The explore agent MUST remain a read-and-discuss coordinator and MUST NOT create, modify, or delete files directly. It MAY dispatch workers whose explicit phase contracts authorize writes, provided each worker writes only within the scope it owns. Outside an explicitly user-triggered supervised pipeline or an accepted POC, explore SHALL NOT invoke a write-producing phase.

During a POC, only the Direct Build `--no-specs` implementer may write code, tests, or required project configuration outside `openspec/`, and only within the branch or worktree the lane created for it. The POC SHALL NOT write proposal, spec, change metadata, planning artifacts, or any other file under `openspec/`. Explore itself remains read-only throughout the POC, and the isolation is abandoned rather than destructively deleted when the lane closes.

#### Scenario: explore performs ordinary discussion or review

- **WHEN** no user-triggered supervised pipeline or accepted POC is active
- **THEN** explore invokes no write-producing phase and no file is written by explore

#### Scenario: dispatched worker writes within owned scope

- **WHEN** a user-triggered supervised pipeline dispatches the spec-proposal worker
- **THEN** only the worker may write `proposal.md`, `specs/**`, and permitted change metadata within its owned change directory

#### Scenario: viability POC writes only implementation scope

- **WHEN** the POC lane authorizes a Direct Build `--no-specs` POC
- **THEN** only the implementer writes authorized code, tests, or required project configuration outside `openspec/`, inside the branch or worktree the lane created for it

#### Scenario: write would escape the owned change directory

- **WHEN** a supervised operation would write outside its authorized scope
- **THEN** the pipeline refuses that write
- **AND** explore does not perform or delegate the out-of-scope write
