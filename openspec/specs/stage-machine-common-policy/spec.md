# stage-machine-common-policy Specification

## Purpose
Post-hoc record of the implemented centralization of `sai-state` stage-machine operations into one common policy with per-command inclusion and `AGENTS.md` cleanup.
## Requirements
### Requirement: Common operational policy source
The common policy at `sai/policies/stage-machine.md` SHALL own the canonical stage-machine operational contract: the local per-chat CLI store model, the `spawn`, `emit`, and `close` verbs, `machineId` handling, closed errors, Windows PowerShell quoting, `next.follow` loading, and degraded-mode handling. The canonical verb spelling SHALL live only in that policy.
#### Scenario: Operations resolve through the single source
- **WHEN** a consuming command needs spawn, emit, close, machine identity, error, quoting, pointer, or degraded-mode handling
- **THEN** the command fetches the common policy instead of restating the contract

### Requirement: Command policy inclusion
Every command mentioning `sai-state` SHALL fetch `sai/policies/stage-machine.md` and SHALL NOT restate its verbs, errors, quoting, pointer, or degraded-mode contract inline. Each consuming command SHALL keep exactly its own event table and pointer usage.
#### Scenario: Consuming prompt keeps only its event table
- **WHEN** a prompt references the stage machine for its own machine and stage progression
- **THEN** the prompt carries a fetch line to the common policy plus its owned intents and stages with no duplicated operational block

### Requirement: AGENTS cleanup
`AGENTS.md` SHALL NOT contain a stage-machine section or HTTP, token, port, or health-check remains. The `bin/sai-state.js` index line SHALL read as the `spawn / emit / close` CLI.
#### Scenario: Repository docs carry no stale machine model
- **WHEN** a reader searches `AGENTS.md` for the stage machine
- **THEN** no stage-machine section and no HTTP or token model is found

### Requirement: Operations-only boundary and change negatives
The common policy SHALL cover operations only and SHALL NOT contain a per-machine event catalog. The change SHALL NOT alter runtime behavior, add a shim, change `PATH`, rewrite `GLOSSARY.md`, create or modify ADR or DDR records, or rewrite archived specs.
#### Scenario: Negatives hold on the implemented diff
- **WHEN** the staged diff is inspected for runtime, shim, path, glossary, record, or archive changes
- **THEN** only docs, prompt inclusions, the new policy file, and tests are present

