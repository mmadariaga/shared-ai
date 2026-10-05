# change-overview-generation-routing Specification

## Purpose

Route overview generation to a budget-routed subagent executing a shared overview-generation instruction, without introducing a new numbered SAI phase; constrain the generator to write only the overview artifact; define the closed, deterministic result envelope the generator returns; and require mirrored Claude Code and opencode behavior.

## Requirements

### Requirement: Generation runs in a budget-routed subagent executing a shared instruction

Overview generation SHALL run in a budget-routed subagent executing `sai/commands/design/change-overview.md` as the single shared generation contract. It SHALL NOT introduce a numbered phase, worker lifecycle, question loop, or feedback loop.

Dispatch SHALL name `Agent(subagent_type: budget-subagent)` for Claude Code and `task(subagent_type: budget)` for opencode. Its prompt SHALL carry exactly the resolved change name, current invocation's `overview_language`, and the directive to Fetch `@sai/commands/design/change-overview.md` and follow it exactly. The generator SHALL load the contract itself. The prompt SHALL NOT enumerate source mappings, content requirements, the faithful-copy rule, validation rules, or other normative contract content. First materialization and regeneration SHALL share the same transport and minimal prompt shape.

Fetch SHALL use active-harness project-local-before-global precedence. A project-local override SHALL be accepted without detecting or repairing its staleness.

A contract-load failure after successful dispatch SHALL be parent-authored as `status: failed`, the overview path in `changed_files`, `validation: not-performed`, non-empty English `failure_details` naming the contract-load failure, and `failure_kind: generation-error`. The generator SHALL NOT improvise from conversation, a parent paraphrase, or schema text, and SHALL NOT return a usable five-field envelope for an unloaded contract. `dispatch-failed` SHALL remain reserved for a dispatch that never ran.

The schema's non-empty overview instruction SHALL remain an informative reference to the shared contract, not a second normative generation contract. It SHALL NOT enumerate required or forbidden output sections, restate fidelity or validation rules, restate the five-field envelope or failure vocabulary, or restate parent-versus-generator or outer-worker classification rules. Its description of source-oriented organization SHALL defer selection to the shared contract.

#### Scenario: generation does not create a new phase
- **WHEN** the pipeline triggers overview generation
- **THEN** it dispatches a budget-routed subagent using the shared contract without introducing a numbered phase, coordinator, or worker lifecycle

#### Scenario: shared instruction is the generation contract
- **WHEN** an overview is generated or regenerated
- **THEN** the same shared overview-generation instruction governs the attempt

#### Scenario: dispatch names the budget binding per harness
- **WHEN** overview generation runs under either supported harness
- **THEN** Claude Code uses `Agent(subagent_type: budget-subagent)` and opencode uses `task(subagent_type: budget)`

#### Scenario: contract is transported by Fetch on dispatch
- **WHEN** the design worker dispatches the generator
- **THEN** it supplies the contract Fetch directive instead of substituting a parent-authored paraphrase

#### Scenario: dispatch prompt stays minimal
- **WHEN** the design worker builds a generation prompt
- **THEN** it carries only change name, effective language, and contract Fetch, without enumerating source mappings, content, faithful-copy, or validation rules

#### Scenario: first materialization and regeneration share the same transport
- **WHEN** generation is initial materialization or later regeneration
- **THEN** both use the same harness binding, Fetch transport, and minimal prompt shape

#### Scenario: Fetch resolution accepts project-local override without staleness detection
- **WHEN** a project-local contract exists at the harness-resolved command-owned path
- **THEN** Fetch prefers it over the global contract without a warning or failure solely for content divergence

#### Scenario: contract-load failure does not improvise
- **WHEN** a successfully dispatched generator cannot load the shared contract
- **THEN** the parent returns the defined generation-error mapping and the generator produces no successful overview or improvised usable envelope

#### Scenario: schema instruction is an informative reference only
- **WHEN** the workflow schema exposes the overview instruction
- **THEN** it remains non-empty, names the shared contract, describes its reference role, and does not duplicate the normative generation or envelope rules

### Requirement: Generator writes only the overview artifact

The generation subagent SHALL write exactly one file: `openspec/changes/{change-name}/change-overview.md`. It SHALL NOT create, modify, or delete any other file — in particular none of the source artifacts, project source files, configuration files, or other change artifacts.

#### Scenario: write scope is a single file
- **WHEN** the generation subagent completes
- **THEN** the only file it created or modified is `openspec/changes/{change-name}/change-overview.md`

#### Scenario: sources are untouched by the generator
- **WHEN** the generation subagent runs
- **THEN** no source artifact and no other project file is created, modified, or deleted by it

### Requirement: Contract tests pin dispatch transport and schema instruction cleanup

Automated contract tests SHALL independently cover the live design-worker generation surface, both harness binding names, its Fetch directive, and the schema instruction's informative-reference-only role. They SHALL also check that the live schema and generation consumers do not impose the replaced thematic organization.

Template-only section checks SHALL NOT substitute for transport or schema-instruction coverage. The overview template SHALL be tested separately for its source-oriented Proposal, Design, and repeated Step skeleton rather than the obsolete nine-section layout.

#### Scenario: transport assertions cover worker Fetch and both bindings
- **WHEN** overview-generation transport contract tests run
- **THEN** they fail if the live dispatch surface omits the contract Fetch or either harness binding

#### Scenario: schema-instruction assertions cover forbidden sections and the informative-reference prohibition
- **WHEN** contract tests inspect the workflow overview instruction
- **THEN** they fail if it enumerates required or forbidden output sections, duplicates normative contract rules, or imposes replaced thematic organization

#### Scenario: template-only section checks do not substitute for transport coverage
- **WHEN** a test checks only the overview template's source-oriented section shape
- **THEN** that assertion does not satisfy independent dispatch-transport or schema-instruction coverage

### Requirement: Generator returns a closed result contract with mandatory failure diagnostics

The overview-generation subagent SHALL return a closed, deterministic result envelope that the design worker (the parent) can interpret without ambiguity. The generator envelope SHALL carry exactly these five fields, all mandatory:

- `status` — one of `success` or `failed`.
- `changed_files` — the paths written or potentially affected by this generation attempt: `[openspec/changes/{change-name}/change-overview.md]` when the generator writes the overview or a failure record, `[]` only when dispatch itself failed before the generator was acknowledged as running and therefore no generator write could occur, and the overview path for a malformed, empty, or process-loss outcome whose file state may have changed before the parent received no trustworthy result.
- `validation` — `passed` or `failed` for a generator-run result; `not-performed` for a parent-authored dispatch or contract-violation result where validation did not occur or cannot be trusted.
- `failure_details` — the empty string on success; a non-empty English diagnostic on failure naming what went wrong and the relevant source, artifact, envelope, dispatch, or file location.
- `failure_kind` — `none` on success; otherwise one of `blocking-contradiction`, `validation-failed`, `generation-error`, `dispatch-failed`, or `envelope-contract-violation` according to the overview-generation contract. Only the first three failure values are generator-authored; the parent authors `dispatch-failed` for an unstarted dispatch, `generation-error` for process loss, or `envelope-contract-violation` for a malformed or empty result. A valid failed generator result propagates its `failure_kind` unchanged into the outer worker's `failure_class`.

On every failed generator result, `failure_details` SHALL be non-empty. A blocking contradiction SHALL name both conflicting source locations and the one-line disagreement. A validation or generation failure that is not a blocking contradiction SHALL identify the failed validation or generation operation and its relevant location rather than using an empty or generic detail. `failure_details` SHALL remain English regardless of `overview_language`.

The parent SHALL preserve the same five-field shape when it authors a failure result for a route on which the generator did not return a valid envelope. A dispatch failure SHALL use `status: failed`, `validation: not-performed`, `failure_kind: dispatch-failed`, `changed_files: []`, and a non-empty `failure_details` naming the dispatch operation, the failure reason, and where the dispatch failed. A process-loss route after dispatch acknowledgement SHALL use `failure_kind: generation-error`, the overview path, and a non-empty diagnostic naming the lost operation and missing result. A malformed or empty envelope SHALL use the same five fields with `validation: not-performed`, `failure_kind: envelope-contract-violation`, the overview path, and a non-empty diagnostic naming the contract violation and offending value or missing field; the worker SHALL record that offending value or missing field in the persisted `failure_details` and classify the outer result as `envelope-contract-violation`, not `generation-error`. The outer result keeps the nested `validation: not-performed` marker and preserves the potentially affected `change-overview.md` path. If the invalid envelope supplied a `failure_kind`, the parent-authored diagnostic SHALL quote that originally reported value before describing the reclassification. These parent-authored fields preserve the durable overview mapping, while the outer worker classification remains distinct.

The parent SHALL map each valid generator result deterministically per the `change-overview-synchronization` capability: `success` commits `overview.state: current` after `materializing`; a failed first materialization sets `failed` and suppresses the success terminal; a failed regeneration sets `stale`; and parent-authored dispatch or contract-violation failures use the corresponding first-materialization or regeneration state mapping. A same-worker recovery continuation that returns `completed` is a successful materialization outcome: the design worker SHALL commit `overview.state: current`, clear both diagnostic keys, and include `.openspec.yaml` in the outer changed-file union. A recovery re-dispatch of the generator for `validation-failed`, `generation-error`, or `dispatch-failed` SHALL be treated as part of the bounded recovery attempt, SHALL be exempt from the ordinary one-regeneration-per-effective-transaction limit, and SHALL be bounded only by the shared three-attempt pool. For a malformed generator envelope, the worker SHALL verify overview soundness before its first failed return; if unsound, it SHALL set `unrecoverable: true`, spend zero recovery attempts, and report the zero-attempt veto. The parent SHALL NOT interpret an invalid generator envelope as success. A coordinator-rejected worker envelope SHALL be classified as outer `outer-envelope-violation` under the worker-failure-classification capability, and the parent SHALL never write or delete `change-overview.md` itself.

The workflow schema's embedded `change-overview` `instruction:` SHALL obey the informative-reference-only prohibition defined under Requirement "Generation runs in a budget-routed subagent executing a shared instruction": it remains a non-empty pointer to `sai/commands/design/change-overview.md` and does not carry a second normative generation contract. Schema wording under both supported harness projections SHALL remain consistent with that role. The closed generator envelope itself continues to be defined by this requirement's five-field contract and by the shared generation instruction the design worker consumes.

#### Scenario: Successful generation returns the closed envelope

- **WHEN** the generation subagent completes successfully
- **THEN** its result envelope SHALL carry exactly `status`, `changed_files`, `validation`, `failure_details`, and `failure_kind`
- **AND** it SHALL carry `status: success`, the overview path, `validation: passed`, `failure_details: ""`, and `failure_kind: none`
- **AND** the parent SHALL commit `overview.state: current`

#### Scenario: Every generator failure returns diagnostics

- **WHEN** the generation subagent returns `status: failed` for a blocking contradiction, validation failure, or generation error
- **THEN** the envelope SHALL carry exactly five fields and a non-empty English `failure_details`
- **AND** the diagnostic SHALL name what failed and the relevant location

#### Scenario: Blocking contradiction returns source-located details

- **WHEN** the generation subagent fails validation on a blocking source contradiction
- **THEN** its result envelope SHALL carry `status: failed`, `validation: failed`, `failure_kind: blocking-contradiction`, and non-empty `failure_details`
- **AND** `failure_details` SHALL name both conflicting sources and their locations and state the one-line disagreement

#### Scenario: Valid generator failure kind propagates

- **WHEN** a valid generator envelope carries `failure_kind: generation-error`
- **THEN** the outer failed worker result SHALL carry `failure_class: generation-error`
- **AND** the generator's durable diagnostic and overview state mapping SHALL remain unchanged

#### Scenario: Dispatch failure is parent-authored

- **WHEN** the budget-routed subagent cannot be dispatched and never runs
- **THEN** the parent authors the five-field failed result with `failure_kind: dispatch-failed`, `changed_files: []`, and non-empty `failure_details`
- **AND** `failure_details` names what dispatch operation failed, where it failed, and the dispatch error
- **AND** the prior `change-overview.md` is left unmodified

#### Scenario: Malformed nested generator envelope is a distinct worker class

- **WHEN** the dispatched generator returns unknown fields, an unknown status, a missing mandatory field, an empty result, or an empty `failure_details` on `status: failed`
- **THEN** the parent SHALL preserve the five-field generator failure mapping with `validation: not-performed`
- **AND** the outer worker result SHALL carry `failure_class: envelope-contract-violation`
- **AND** the diagnostic SHALL name the violation, location, and verbatim offending value or `missing` field
- **AND** the parent SHALL preserve whatever file state exists without modifying `change-overview.md`

#### Scenario: Process loss is parent-authored

- **WHEN** the generator was dispatched but the parent receives no result
- **THEN** the parent-authored generator envelope SHALL use `failure_kind: generation-error` and the overview path
- **AND** the outer worker result SHALL carry `failure_class: generation-error`
- **AND** the diagnostic SHALL name the lost operation, worker or continuation location, and missing result

#### Scenario: Recovered materialization commits current state

- **WHEN** a first materialization or regeneration records a failed or stale diagnostic and a same-worker recovery continuation returns `completed`
- **THEN** the design worker SHALL commit `overview.state: current`
- **AND** SHALL clear `overview.failure_kind` and `overview.failure_details`
- **AND** SHALL include `openspec/changes/{change-name}/.openspec.yaml` in the outer changed-file union

#### Scenario: Validation failure recovery re-dispatches generation

- **WHEN** overview generation returns `failure_kind: validation-failed` and the same worker starts a recovery continuation
- **THEN** the worker MAY re-dispatch the overview generator within that recovery attempt
- **AND** a validated successful generation SHALL return `completed` through the same worker
- **AND** the re-dispatch SHALL be exempt from the ordinary one-regeneration-per-effective-transaction limit and bounded only by the shared three-attempt pool

#### Scenario: Unsound envelope violation vetoes recovery before an attempt

- **WHEN** a malformed generator envelope is detected and worker-side verification before the first failed return finds the existing overview unsound
- **THEN** the outer worker outcome SHALL carry `failure_class: envelope-contract-violation` with `unrecoverable: true`
- **AND** the coordinator SHALL spend zero recovery attempts
- **AND** the terminal hand-back SHALL report zero attempts spent and the worker veto

#### Scenario: Schema instruction stays an informative reference under the envelope requirement

- **WHEN** the workflow schema describes the `change-overview` artifact in the presence of this closed generator envelope
- **THEN** its embedded `instruction:` obeys the informative-reference-only prohibition defined under Requirement "Generation runs in a budget-routed subagent executing a shared instruction"
- **AND** the closed envelope remains defined by this requirement and by the shared generation instruction the design worker consumes

### Requirement: Claude Code and opencode parity

Overview generation SHALL behave identically under Claude Code and opencode: dispatch permissions, worker bindings, installation projections, generator-envelope handling, outer failure-class propagation, and durable overview-state mapping SHALL be mirrored across both harnesses, consistent with the pipeline's mirror discipline.

The design worker's overview-generation dispatch clause SHALL name both harness bindings in the same instruction surface so that neither harness is left with an unnamed or improvised binding. Transport of the shared contract by Fetch, the minimal dispatch-prompt shape, and the contract-load `generation-error` failure path SHALL be identical in meaning under both harnesses; only the harness-native dispatch primitive differs.

#### Scenario: Both harnesses preserve generator-envelope mapping

- **WHEN** a change's overview generation returns a valid failure or a malformed envelope on either supported harness
- **THEN** both harnesses SHALL expose the same outer `failure_class` and durable overview mapping

#### Scenario: Installation projections remain mirrored

- **WHEN** the shared overview-generation instruction is installed
- **THEN** the installation projections for Claude Code and opencode SHALL both carry the unchanged generator envelope and the same outer-classification rules

#### Scenario: both harness bindings are named in the worker dispatch clause

- **WHEN** the design worker contract describes overview-generation dispatch
- **THEN** it names `Agent(subagent_type: budget-subagent)` for Claude Code and `task(subagent_type: budget)` for opencode
- **AND** naming only one harness leaves the dispatch incomplete against this parity requirement

#### Scenario: contract transport is mirrored

- **WHEN** overview generation is dispatched on either supported harness
- **THEN** the subagent is instructed to Fetch `@sai/commands/design/change-overview.md` and follow it exactly
- **AND** the minimal prompt shape and contract-load failure classification are the same on both harnesses
