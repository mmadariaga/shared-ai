# command-runner-layout Specification

## Purpose

TBD

## Requirements

### Requirement: Routed command cards
Each routed `/sai-*` invocation SHALL have a self-contained source folder at `sai/commands/{name}/` containing its `coordinator.md` and `worker.md` surfaces, plus its retained `invocation.md` source when the routed phase uses a separate invocation card. The routed card SHALL identify the policies or instructions it fetches, and a new routed invocation SHALL be addable by adding its card without copying a shared protocol. A worker contract SHALL state its own ready return and terminal result shapes and SHALL NOT fetch `sai/orchestration/worker-core.md`. Routed cards SHALL NOT require a `body.md` surface.

#### Scenario: Maintainer locates one invocation
- **WHEN** a maintainer selects a routed command name
- **THEN** its coordinator and worker sources SHALL be discoverable under the same `sai/commands/{name}/` folder
- **AND** no worker contract in the folder SHALL fetch `sai/orchestration/worker-core.md`; each states its own lifecycle shapes

#### Scenario: New command uses the extension seam
- **WHEN** a new routed `/sai-*` command is introduced
- **THEN** its command card SHALL be added under `sai/commands/{name}/`
- **AND** adding that card SHALL NOT require a new runner or worker-core branch for the command name

### Requirement: Utility command cards
Each utility `/sai-*` command that is not routed through a coordinator and worker SHALL have a self-contained source folder at `sai/commands/{name}/` containing its `body.md` surface. Utility cards SHALL identify the policies or instructions they fetch, including the `public-chat`, capability-profile, and obstacle-escalation loads that no boot adapter provides any more, and SHALL NOT acquire routed-only coordinator, worker, or invocation surfaces solely to fit the layout.

#### Scenario: Utility command surface is discoverable
- **WHEN** a maintainer selects a utility command: explore, retire-docs, status, or worktree
- **THEN** its body source SHALL be discoverable as `sai/commands/{name}/body.md`
- **AND** the utility card SHALL not be required to contain `coordinator.md`, `worker.md`, or `invocation.md`

#### Scenario: Routed and utility classes remain distinct
- **WHEN** the command-card inventory is audited
- **THEN** routed cards SHALL map to `coordinator.md` plus `worker.md`, with retained `invocation.md` when that routed phase uses a separate invocation card
- **AND** utility cards SHALL map to `body.md`
- **AND** neither class SHALL be treated as requiring the other class's surfaces

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

The manifest SHALL describe command-card and adapter sources for both supported harnesses. Expansion, installation, doctor, and uninstall SHALL consume that inventory with collision checks and harness isolation. Commands SHALL use customizable-copy and managed agents tunable-seed, preserving current tuning and exact user suffixes during managed refresh. Doctor SHALL ignore tuning and suffixes for managed identity; guarded uninstall SHALL retain custom suffixes and other body changes. Exact retired-path installation cleanup SHALL be independent of historical hashes and SHALL NOT migrate old settings; doctor and guarded uninstall SHALL retain historical recognition.

#### Scenario: relocation is reflected by every inventory consumer
- **WHEN** install, doctor, or uninstall evaluates the relocated idea-list render binding
- **THEN** all derive active and retired paths from the manifest; installation deletes exact retired files without hash gating while doctor and guarded uninstall retain their respective protections

#### Scenario: Fresh installation projects the new layout
- **WHEN** a supported harness is installed from the manifest
- **THEN** its managed SAI destination SHALL contain the command cards; it SHALL contain only that harness's adapter files (`idea-list-render.md` and `panel-render.md`) and no boot adapter; it SHALL not recreate the retired `orchestration/workers/bindings/idea-list-render.md` destination

#### Scenario: Both harnesses are re-projected in one change
- **WHEN** the manifest is expanded for Claude Code and opencode
- **THEN** both harness inventories SHALL be generated from the same manifest change; their neutral command-card and routed worker content SHALL remain equivalent; each inventory SHALL differ at the adapter seam only by its harness-specific sources

#### Scenario: Doctor and uninstall share the active inventory
- **WHEN** doctor or uninstall evaluates an installed projection
- **THEN** it SHALL derive expected and removable paths from the same manifest expansion used by install; doctor SHALL report missing, unexpected, or drifted active projections and retired-path mismatches; uninstall SHALL retain locally modified managed files under the existing ownership safeguard

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

### Requirement: Harness adapter seam holds runtime glue only

Each harness-qualified adapter tree `sai/adapters/{claude,opencode}/` SHALL contain only harness-specific install-time runtime glue: the non-worker `idea-list-render.md` and `panel-render.md` bindings. No adapter boot file SHALL exist. Adapter files SHALL contain harness-specific rendering or runtime-glue mechanics only and SHALL NOT redefine command or worker lifecycle semantics.

#### Scenario: Each harness receives only its own adapter glue

- **WHEN** the Claude Code or opencode projection is installed
- **THEN** it receives that harness's `idea-list-render.md` and `panel-render.md` adapters, no `boot.md`, and no adapter source of the other harness
