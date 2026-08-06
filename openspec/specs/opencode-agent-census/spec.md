# opencode-agent-census Specification

## Purpose
TBD: Define the binding-derived census and explicit registration defaults for managed opencode agents.

## Requirements

### Requirement: Binding dispatches define the managed opencode census
The installer SHALL derive the managed opencode agent-name set by scanning every Markdown binding under `sai/orchestration/workers/bindings/opencode/` and extracting explicit initial `task(subagent_type: "...")` string declarations. Every binding file SHALL contain exactly one such initial `subagent_type` declaration and exactly one initial dispatch prompt matching the encoded worker-dispatch-prompt-template contract for the extracted worker. The census parser SHALL capture the initial dispatch's double-quoted `prompt` value, decode its literal `\n` escape sequences for validation, and ignore continuation calls carrying `task_id`. Extracted names SHALL be unique across files, and the derived set SHALL be deterministic. The derived set SHALL be the only source of membership for managed opencode agents; a hand-maintained membership flag MUST NOT add or remove a dispatched worker.

#### Scenario: Current bindings produce a complete validated census
- **WHEN** the installer loads the current opencode worker bindings
- **THEN** the derived census contains every worker declared by a binding, including `sai-1-spec-proposal-worker`, and contains no worker that is not declared by a binding
- **AND** every binding's initial prompt is validated against its matching literal contract-aware template

#### Scenario: A new binding is automatically included only when valid
- **WHEN** a new Markdown binding containing one valid initial `task(subagent_type: "new-worker")` declaration and its matching encoded literal contract-aware prompt is present under the opencode binding directory
- **THEN** `new-worker` is included in the managed census without an additional membership-list edit

#### Scenario: A binding has a missing, malformed, or mismatched dispatch contract
- **WHEN** a binding file does not contain exactly one parseable initial `subagent_type` declaration, its initial prompt is not a parseable encoded string, or its decoded prompt does not match the worker-specific template
- **THEN** installation fails with an actionable error identifying the binding and the failed declaration or prompt assertion rather than silently omitting or guessing its worker name

#### Scenario: Two binding files declare the same worker
- **WHEN** two binding files contain valid `subagent_type` declarations with the same worker name
- **THEN** installation fails with an actionable duplicate-declaration error identifying the conflicting bindings

### Requirement: Every derived worker has explicit registration defaults
For every name in the derived census, the installer MUST have exactly one explicit opencode registration record keyed by that name. Each record SHALL provide the worker's model, `mode: "subagent"`, task permissions, optional variant, and canonical fetch contract `prompt`. The repository defaults MUST NOT contain a managed-agent record for a name absent from the census. Census derivation SHALL supply membership only; it MUST NOT infer model, mode, variant, task permissions, or prompt values from binding content. The prompt assertion is validation of the binding, not a source of registration data.

#### Scenario: The spec worker receives an explicit registration
- **WHEN** the current bindings are processed
- **THEN** `sai-1-spec-proposal-worker` has an explicit model, `mode: "subagent"`, variant policy, and task-permission record alongside the other configured workers
- **AND** it has a canonical worker-contract `prompt` alongside the other configured workers

#### Scenario: A dispatched worker lacks defaults
- **WHEN** a binding declares a worker name that has no explicit registration record
- **THEN** installation stops with a hard, visible error naming the missing registration and does not silently exclude that worker from installer guidance or doctor coverage

#### Scenario: A repository registration is orphaned
- **WHEN** repository-managed defaults contain a worker name that no binding declares
- **THEN** installation stops with a hard, visible orphan-registration error instead of silently retaining a second membership list

#### Scenario: A retirement is only partially applied
- **WHEN** a worker is removed from the binding census but its repository defaults remain, or its defaults are removed while its binding remains
- **THEN** installation stops with an actionable mismatch error until both sides are updated together, and retirement metadata does not silently suppress the mismatch

#### Scenario: A synchronized retirement completes
- **WHEN** a worker's binding and repository registration defaults are removed together
- **THEN** the worker is removed from the derived opencode census while unrelated installed-asset retirement behavior remains unchanged

#### Scenario: Worker-specific defaults remain distinct
- **WHEN** the derived records are built for workers with different models, variants, task allowlists, or contract prompts
- **THEN** each worker retains its explicitly keyed settings and no common default replaces a worker-specific value

### Requirement: All managed-agent consumers use the derived census
The installer SHALL expose and consume one derived managed-agent census for opencode configuration generation, installer reporting, and doctor integration. No downstream consumer MAY maintain a separate opencode membership list.

#### Scenario: Installer and doctor observe the same names
- **WHEN** installer configuration guidance and doctor managed-agent records are generated from the same source tree
- **THEN** both consumers enumerate the identical derived worker-name set, including every binding-dispatched worker

#### Scenario: A dispatched worker cannot be invisible to consumers
- **WHEN** a valid binding dispatch declaration is added
- **THEN** the worker is simultaneously eligible for registration guidance and doctor validation, subject only to the explicit-default completeness check

### Requirement: Census validation is isolated to opencode consumers
Loading the shared installer module MUST NOT derive or validate the opencode census. The installer SHALL resolve the validated census lazily when an opencode consumer requests it, SHALL preserve the existing `OPENCODE_MANAGED_AGENTS` export contract, and SHALL complete declaration, prompt-template, and explicit-registration validation before an opencode installation or configuration mutation begins. A validation failure MUST stop the affected opencode operation before it writes while leaving Claude and Copilot operations able to load and run independently.

#### Scenario: Invalid prompt validation remains isolated
- **WHEN** an opencode binding has an invalid initial prompt template
- **THEN** importing the shared installer module and invoking unrelated Claude or Copilot operations does not evaluate the invalid census or fail because of it
- **AND** an opencode installation fails with the actionable validation error before modifying its destination

#### Scenario: Shared installer import survives other invalid census inputs
- **WHEN** an opencode binding is malformed, duplicated, missing defaults, or paired with orphan defaults
- **THEN** importing the shared installer module and invoking unrelated Claude or Copilot operations does not evaluate the invalid census or fail because of it

#### Scenario: Opencode installation validates before mutation
- **WHEN** an opencode installation requests the managed-agent projection and census derivation fails
- **THEN** the operation fails with the actionable derivation error before modifying an opencode destination

### Requirement: The opencode census does not alter other harness paths
The census change SHALL affect only opencode managed-agent membership. Claude Code worker registration and owned-copy projections, and Copilot's inline worker path, MUST retain their existing assets, ownership, routing, and exclusion of opencode-specific managed-agent configuration.

#### Scenario: Claude and Copilot projections are unaffected
- **WHEN** the derived opencode census is rebuilt or a new opencode binding is processed
- **THEN** Claude worker registration and Copilot inline prompt projections remain unchanged

#### Scenario: Routed worker boundaries remain explicit
- **WHEN** installer or doctor inventories harness-specific worker assets
- **THEN** Claude and opencode retain their routed worker behavior while Copilot remains excluded from routed worker bindings and opencode agent registration
