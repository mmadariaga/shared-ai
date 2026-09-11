# stage-machine-common-policy Specification

## Purpose
Post-hoc record of the implemented centralization of `sai-state` stage-machine operations into one common policy with per-command inclusion and `AGENTS.md` cleanup.
## Requirements
### Requirement: Common operational policy source

The common policy at `sai/policies/stage-machine.md` SHALL own the canonical stage-machine operational contract: the local per-chat CLI store model, the `spawn`, `emit`, `reset`, and `close` verbs, `machineId` handling, closed errors, Windows PowerShell quoting, `next.follow` loading, degraded-mode handling, and shared step machine consumption rules. The canonical verb spelling and machine consumption patterns SHALL live only in that policy.

#### Scenario: Operations resolve through the single source

- **WHEN** a consuming command needs spawn, emit, reset, close, machine identity, error, quoting, pointer, degraded-mode handling, or step machine consumption rules
- **THEN** the command fetches the common policy instead of restating the contract

### Requirement: Command policy inclusion

Every command mentioning `sai-state` SHALL fetch `sai/policies/stage-machine.md` and SHALL NOT restate its verbs, errors, quoting, pointer, degraded-mode contract, or step machine consumption rules inline. Each consuming command SHALL keep exactly its own event table, progress_plan, and step-routing specifics.

#### Scenario: Consuming prompt keeps only its event table

- **WHEN** a prompt references the stage machine for its own machine and stage progression
- **THEN** the prompt carries a fetch line to the common policy plus its owned event table, progress_plan ids, and step files with no duplicated operational block

### Requirement: AGENTS cleanup
`AGENTS.md` SHALL NOT contain a stage-machine section or HTTP, token, port, or health-check remains. The `bin/sai-state.js` index line SHALL read as the `spawn / emit / close` CLI.
#### Scenario: Repository docs carry no stale machine model
- **WHEN** a reader searches `AGENTS.md` for the stage machine
- **THEN** no stage-machine section and no HTTP or token model is found

### Requirement: Operations-only boundary and change negatives

The common policy SHALL cover operations and shared step machine consumption rules only and SHALL NOT contain per-machine event catalogs or per-command step definitions. The change SHALL NOT alter runtime behavior beyond adding step machine consumption rules, add a shim, change `PATH`, rewrite `GLOSSARY.md`, create or modify ADR or DDR records, or rewrite archived specs.

#### Scenario: Negatives hold on the implemented diff

- **WHEN** the staged diff is inspected for runtime, shim, path, glossary, record, or archive changes
- **THEN** only docs, prompt inclusions, the updated policy file, and tests are present

### Requirement: Step machine consumption rules

When a coordinator declares the optional `step_machine: <name>@<version>` adapter field, the common policy SHALL define: session initialization (spawn plus immediate per-machine reset), progress-event emission with reported step ids, pointer delivery in the coordinator's two-line continuation format, machine state parking on non-progress-event continuations (questions, feedback, recovery), replacement worker re-resolution from surviving session state, run-close cleanup (per-machine reset), and store-failure handling (stop, report, wait with no degraded fallback or static-map bypass).

#### Scenario: Coordinator consults step machine per progress event

- **WHEN** a coordinator declaring `step_machine` emits a progress event with reported step ids
- **THEN** the common policy defines the emit invocation, pointer wrapping, and state parking behavior for that emission

#### Scenario: Store failure stops step machine coordinator

- **WHEN** the sai-state store fails (unreachable, corrupt file, version mismatch, unknown machine)
- **THEN** the common policy directs the coordinator to stop, surface the error, and wait; no degraded continuation or static fallback occurs

