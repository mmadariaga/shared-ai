# command-runner-layout Specification

## Purpose

TBD

## Requirements

### Requirement: Shared root protocol
The repository SHALL place the harness-neutral command protocol in `sai/command-runner.md` and the harness-neutral worker lifecycle protocol in `sai/worker-core.md`. These files SHALL define reusable mechanics only; phase-specific behavior SHALL be selected through command-card flags rather than harness or phase branches in either root file.

#### Scenario: Shared protocol is located at the sai root
- **WHEN** a maintainer needs to change command-runner or worker lifecycle mechanics
- **THEN** the authoritative source SHALL be discoverable at `sai/command-runner.md` or `sai/worker-core.md`
- **AND** no second harness-specific canonical copy of either protocol SHALL exist

#### Scenario: Phase behavior is selected by card flags
- **WHEN** two command cards require different phase behavior
- **THEN** the cards SHALL express that difference through their declared flags
- **AND** `sai/command-runner.md` and `sai/worker-core.md` SHALL remain branch-free with respect to those phase differences

### Requirement: Routed command cards
Each routed `/sai-*` invocation SHALL have a self-contained source folder at `sai/commands/{name}/` containing its `coordinator.md` and `worker.md` surfaces, plus its retained `invocation.md` source when the routed phase uses a separate invocation card. The routed card SHALL identify the shared root protocol and the policies or instructions it fetches, and a new routed invocation SHALL be addable by adding its card without copying the shared protocol. Routed cards SHALL NOT require a `body.md` surface.

#### Scenario: Maintainer locates one invocation
- **WHEN** a maintainer selects a routed command name
- **THEN** its coordinator and worker sources SHALL be discoverable under the same `sai/commands/{name}/` folder
- **AND** the folder SHALL reference `sai/command-runner.md` and `sai/worker-core.md` rather than duplicate their protocol prose

#### Scenario: New command uses the extension seam
- **WHEN** a new routed `/sai-*` command is introduced
- **THEN** its command card SHALL be added under `sai/commands/{name}/`
- **AND** adding that card SHALL NOT require a new runner or worker-core branch for the command name

### Requirement: Utility command cards
Each utility `/sai-*` command that is not routed through a coordinator and worker SHALL have a self-contained source folder at `sai/commands/{name}/` containing only its `body.md` surface. Utility cards SHALL identify the shared root protocol and the policies or instructions they fetch where applicable, and SHALL NOT acquire routed-only coordinator, worker, or invocation surfaces solely to fit the layout.

#### Scenario: Utility command surface is discoverable
- **WHEN** a maintainer selects a utility command such as explore, archive, backfill, commit, pr, status, or worktree
- **THEN** its body source SHALL be discoverable as `sai/commands/{name}/body.md`
- **AND** the utility card SHALL not be required to contain `coordinator.md`, `worker.md`, or `invocation.md`

#### Scenario: Routed and utility classes remain distinct
- **WHEN** the command-card inventory is audited
- **THEN** routed cards SHALL map to `coordinator.md` plus `worker.md`, with retained `invocation.md` when that routed phase uses a separate invocation card
- **AND** utility cards SHALL map to `body.md`
- **AND** neither class SHALL be treated as requiring the other class's surfaces

### Requirement: Harness boot adapters

The source tree SHALL contain exactly one adapter boot file for each supported harness: `sai/adapters/claude/boot.md` and `sai/adapters/opencode/boot.md`. Each harness-qualified adapter tree MAY contain additional harness-specific install-time runtime glue that is paired with that boot entry, including the non-worker idea-list render adapter. Adapter files SHALL contain harness-specific fetch, dispatch, or runtime-glue mechanics only, SHALL invoke or support the shared root protocol and command cards where applicable, and SHALL NOT redefine command or worker lifecycle semantics.

#### Scenario: Claude Code projection resolves its adapter seam

- **WHEN** the Claude Code projection is installed
- **THEN** it SHALL receive `sai/adapters/claude/boot.md` and `sai/adapters/claude/idea-list-render.md`
- **AND** it SHALL NOT use either opencode adapter source

#### Scenario: opencode projection resolves its adapter seam

- **WHEN** the opencode projection is installed
- **THEN** it SHALL receive `sai/adapters/opencode/boot.md` and `sai/adapters/opencode/idea-list-render.md`
- **AND** it SHALL NOT use either Claude Code adapter source

#### Scenario: shared protocols remain neutral

- **WHEN** the relocated adapter sources and shared protocols are audited
- **THEN** harness-specific mechanics remain in `sai/adapters/{harness}/`
- **AND** `sai/command-runner.md` and `sai/worker-core.md` retain harness-neutral lifecycle semantics

### Requirement: Harness names remain at the adapter seam

When newly introduced root protocol files and command-card sources under the new `sai/` layout are audited, harness-specific source naming SHALL be confined to the harness-qualified adapter seam `sai/adapters/{harness}/` and established harness-specific worker or managed-agent runtime glue. Command cards and root protocol files SHALL remain harness-neutral. The idea-list render adapters SHALL be treated as adapter-seam glue rather than as routed worker binding templates.

#### Scenario: non-worker adapter naming is permitted at the seam

- **WHEN** the newly introduced harness-specific source paths are audited
- **THEN** `sai/adapters/claude/idea-list-render.md` and `sai/adapters/opencode/idea-list-render.md` are accepted as adapter-seam paths
- **AND** no harness-specific name is introduced into command cards or root protocols

#### Scenario: routed worker and agent carve-outs remain valid

- **WHEN** existing harness-specific worker or managed-agent runtime glue is audited
- **THEN** the established `sai/orchestration/workers/bindings/{claude,opencode}/` and `agents/{claude,opencode}/` paths remain permitted
- **AND** the idea-list render adapter is not required to remain in the worker-binding carve-out

### Requirement: Deterministic two-harness projection

`sai/install-manifest.json` SHALL be re-projected to describe the new root protocol, command-card, and adapter sources for both Claude Code and opencode. The manifest expansion module, installer, doctor, and uninstall SHALL consume that inventory; they SHALL preserve managed ownership, content-drift detection, collision checks, and existing modified-file safeguards across active projections and hash-gated retired destinations.

#### Scenario: relocation is reflected by every inventory consumer

- **WHEN** install, doctor, or uninstall evaluates the moved idea-list render binding
- **THEN** it derives the active harness-qualified adapter destination and retired old destination from the manifest inventory
- **AND** it applies the existing managed ownership and modified-file safeguards

#### Scenario: Fresh installation projects the new layout

- **WHEN** a supported harness is installed from the re-projected manifest
- **THEN** its managed SAI destination SHALL contain the shared root protocol and command cards
- **AND** it SHALL contain only that harness's adapter boot and idea-list render files
- **AND** it SHALL not recreate the retired `orchestration/workers/bindings/idea-list-render.md` destination

#### Scenario: Both harnesses are re-projected in one change

- **WHEN** the manifest is expanded for Claude Code and opencode
- **THEN** both harness inventories SHALL be generated from the same manifest change
- **AND** their neutral root protocol, command-card, and routed worker content SHALL remain equivalent
- **AND** each inventory SHALL differ at the adapter seam only by its harness-specific sources

#### Scenario: Doctor and uninstall share the active inventory

- **WHEN** doctor or uninstall evaluates an installed projection
- **THEN** it SHALL derive expected and removable paths from the same re-projected manifest expansion used by install
- **AND** doctor SHALL report missing, unexpected, or drifted active projections and retired-path mismatches
- **AND** uninstall SHALL retain locally modified managed files under the existing ownership safeguard

### Requirement: Shared policy fetch targets are preserved
The layout migration SHALL leave `sai/policies/` as the shared policy projection target. Generic budget, executor, and explore agents or skills SHALL continue fetching `sai/policies/{budget,executor,explore}-agent.md`, and new command cards SHALL use the established `@sai/...` fetch namespace for root protocol, command-card, adapter, instruction, and policy files.

#### Scenario: Generic policy consumer remains valid
- **WHEN** a generic budget, executor, or explore agent is projected for either supported harness
- **THEN** its policy fetch SHALL resolve under `sai/policies/`
- **AND** the layout change SHALL not create a harness-specific policy copy or move those policy files into `commands/` or `adapters/`

#### Scenario: New sources use the established Fetch namespace
- **WHEN** a wrapper or adapter references a new root, command-card, or adapter source
- **THEN** it SHALL use the `@sai/...` path convention documented by ADR 0003
- **AND** the referenced installed path SHALL match the corresponding manifest projection
