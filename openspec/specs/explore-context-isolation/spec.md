# explore-context-isolation Specification

## Purpose
TBD - created by archiving change tasks-as-scaffold. Update Purpose after archive.
## Requirements

### Requirement: Keep delegated writes behind explicit route selection

Explore SHALL remain directly read-only. The explicit Plan (unattended) route MAY dispatch only its existing supervised workers, and the explicit Direct Build (unattended) route MAY dispatch only its existing fast-lane workers under their closed ownership contracts.

The uncertainty pause MAY dispatch the Direct Build `--no-specs` viability POC only after the user explicitly selects `Yes, create a POC before continuing`. That POC is a bounded exception to ordinary explore read-only behavior: only the implementer may write code, tests, or required project configuration outside `openspec/`; it may not write OpenSpec artifacts, create planning artifacts, or run mutating Git commands. The POC does not authorize backfill, spec, archive, or commit work.

#### Scenario: route authorization is explicit

- **WHEN** a crystallization selector answer or Ask 1 answer is received
- **THEN** only an explicitly selected Plan or Direct Build route, or an explicitly selected Ask 1 POC, may dispatch its authorized workers
- **AND** no route dispatches merely because the idea is ready or uncertainty was detected

#### Scenario: Ask 1 POC has narrowed authority

- **WHEN** the user selects `Yes, create a POC before continuing`
- **THEN** only the implementer-only `--no-specs` profile may run and the profile cannot write under `openspec/` or mutate Git state

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

The explore agent MUST remain a read-and-discuss coordinator and MUST NOT create, modify, or delete files directly. It MAY dispatch workers whose explicit phase contracts authorize writes, provided each worker writes only within the scope it owns. Outside an explicitly user-triggered supervised pipeline or Ask 1 POC, explore SHALL NOT invoke a write-producing phase.

During an Ask 1 POC, only the Direct Build `--no-specs` implementer may write code, tests, or required project configuration outside `openspec/`. The POC SHALL not write proposal, spec, change metadata, planning artifacts, or any other file under `openspec/`, and SHALL not run a mutating Git command. Explore itself remains read-only throughout the POC.

#### Scenario: explore performs ordinary discussion or review

- **WHEN** no user-triggered supervised pipeline or Ask 1 POC is active
- **THEN** explore invokes no write-producing phase and no file is written by explore

#### Scenario: dispatched worker writes within owned scope

- **WHEN** a user-triggered supervised pipeline dispatches the spec-proposal worker
- **THEN** only the worker may write `proposal.md`, `specs/**`, and permitted change metadata within its owned change directory
- **AND** explore performs no direct write

#### Scenario: viability POC writes only implementation scope

- **WHEN** Ask 1 authorizes a Direct Build `--no-specs` viability POC
- **THEN** only the implementer may write authorized code, tests, or required project configuration outside `openspec/`
- **AND** no OpenSpec artifact or Git state is mutated by the POC or explore

#### Scenario: write would escape the owned change directory

- **WHEN** a supervised operation would write outside its authorized scope
- **THEN** the pipeline refuses that write
- **AND** explore does not perform or delegate the out-of-scope write
