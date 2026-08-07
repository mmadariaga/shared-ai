# opencode-agent-census Specification

## Purpose
TBD: Define the binding-derived census and explicit registration defaults for managed opencode agents.

## Requirements

### Requirement: Binding dispatches define the managed opencode worker roster
The installer SHALL validate the managed opencode worker roster by scanning every Markdown binding under `sai/orchestration/workers/bindings/opencode/` and extracting explicit initial `task(subagent_type: "...")` string declarations. Every binding file SHALL contain exactly one such initial `subagent_type` declaration and exactly one initial dispatch prompt matching the encoded worker-dispatch-prompt-template contract for the extracted worker. The parser SHALL capture the initial dispatch's double-quoted `prompt` value, decode its literal `\n` escape sequences for validation, and ignore continuation calls carrying `task_id`. Extracted names SHALL be unique across files, and the derived roster SHALL be deterministic. The roster SHALL be the only source of managed opencode worker membership; a hand-maintained membership flag MUST NOT add or remove a dispatched worker. The roster SHALL NOT be joined with registration-default records, because the opencode workers are registered as owned markdown agent files declared by the install manifest, not as configuration registration defaults.

#### Scenario: Current bindings produce a complete validated roster
- **WHEN** the installer loads the current opencode worker bindings
- **THEN** the validated roster contains every worker declared by a binding, including `sai-1-spec-proposal-worker`, and contains no worker that is not declared by a binding
- **AND** every binding's initial prompt is validated against its matching literal contract-aware template

#### Scenario: A new binding is automatically included only when valid
- **WHEN** a new Markdown binding containing one valid initial `task(subagent_type: "new-worker")` declaration and its matching encoded literal contract-aware prompt is present under the opencode binding directory
- **THEN** `new-worker` is included in the validated roster without an additional membership-list edit

#### Scenario: A binding has a missing, malformed, or mismatched dispatch contract
- **WHEN** a binding file does not contain exactly one parseable initial `subagent_type` declaration, its initial prompt is not a parseable encoded string, or its decoded prompt does not match the worker-specific template
- **THEN** installation fails with an actionable error identifying the binding and the failed declaration or prompt assertion rather than silently omitting or guessing its worker name

#### Scenario: Two binding files declare the same worker
- **WHEN** two binding files contain valid `subagent_type` declarations with the same worker name
- **THEN** installation fails with an actionable duplicate-declaration error identifying the conflicting bindings

### Requirement: Roster validation is isolated to opencode consumers
Loading the shared installer module MUST NOT derive or validate the opencode worker roster. The installer SHALL complete binding declaration and prompt-template validation before an opencode installation or configuration mutation begins, SHALL NOT expose a derived managed-agent census export, and SHALL leave Claude operations able to load and run independently when opencode bindings are malformed. A validation failure MUST stop the affected opencode operation before it writes.

#### Scenario: Invalid prompt validation remains isolated
- **WHEN** an opencode binding has an invalid initial prompt template
- **THEN** importing the shared installer module and invoking unrelated Claude operations does not evaluate the invalid binding or fail because of it
- **AND** an opencode installation fails with the actionable validation error before modifying its destination

#### Scenario: Shared installer import survives other invalid binding inputs
- **WHEN** an opencode binding is malformed or duplicated
- **THEN** importing the shared installer module and invoking unrelated Claude operations does not evaluate the invalid binding or fail because of it

#### Scenario: Opencode installation validates before mutation
- **WHEN** an opencode installation starts and binding validation fails
- **THEN** the operation fails with the actionable validation error before modifying an opencode destination

### Requirement: The opencode worker roster does not alter other harness paths
The opencode roster change SHALL affect only opencode managed-worker registration. Claude Code worker registration and owned-copy projections MUST retain their existing assets, ownership, routing, and exclusion of opencode-specific managed-agent configuration.

#### Scenario: Claude projections are unaffected
- **WHEN** the opencode roster is rebuilt or a new opencode binding is processed
- **THEN** Claude worker registration and owned-copy projections remain unchanged

#### Scenario: Routed worker boundaries remain explicit
- **WHEN** installer or doctor inventories harness-specific worker assets
- **THEN** Claude and opencode retain their routed worker behavior with no inline worker substitute
