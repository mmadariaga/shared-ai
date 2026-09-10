# stage-machine-write-ownership Specification

## Purpose
TBD - created by archiving change enforce-single-writer-stage-machine. Update Purpose after archive.
## Requirements
### Requirement: Coordinator-only stage machine emission

Worker cards MUST NOT reference the stage machine emission surface. The stage machine is coordinator-owned; only coordinator sessions may invoke the emit, spawn, close, and run operations. The invariant is enforced at lint time to prevent accidental introduction of worker-to-stage-machine emit calls.

#### Scenario: Worker card lint validation passes with no stage machine references

- **WHEN** a worker card contains legitimate progress event statements (using the English word "emit" in descriptive prose or progress-event contracts)
- **THEN** the lint check passes because it discriminates on stage-machine-specific surface patterns, not the bare word "emit"

#### Scenario: Worker card lint validation fails on sai-state command

- **WHEN** a worker card references `sai-state emit`, `sai-state spawn`, `sai-state close`, or `sai-state run`
- **THEN** the lint check fails with `WORKER_REFERENCES_STAGE_MACHINE_SURFACE`

#### Scenario: Worker card lint validation fails on stage machine ID

- **WHEN** a worker card references a stage machine ID in the form `{machine-name}@{version}` (such as `explore-idea@1`)
- **THEN** the lint check fails with `WORKER_REFERENCES_STAGE_MACHINE_SURFACE`

### Requirement: Lint check coverage of emission surface

The worker-emission-ownership lint check SHALL detect all forms of stage machine emission surface reference including sai-state command invocations, bin/sai-state.js file references, quoted command references, registered stage machine IDs, and the legacy /emit HTTP command. The check SHALL validate every worker card in the repository (matching `*worker*.md` under `sai/commands/`) without false positives on legitimate progress event or coordinator prose.

#### Scenario: All real worker cards pass the check

- **WHEN** the lint check runs against every worker card in the repository (every `*worker*.md` under `sai/commands/`)
- **THEN** every worker card passes with zero violations

#### Scenario: Lint fails on bin/sai-state.js reference

- **WHEN** a worker card references `bin/sai-state.js`
- **THEN** the lint check fails with `WORKER_REFERENCES_STAGE_MACHINE_SURFACE`

