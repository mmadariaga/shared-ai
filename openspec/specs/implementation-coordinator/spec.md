# Implementation Coordinator Specification

## Purpose

Define the coordination boundary, I/O isolation, and user-facing result handling responsibilities of the implementation coordinator that dispatches work to the implementation-planning worker.
## Requirements
### Requirement: Harness adapter dispatch seam
The Claude Code and opencode command wrappers SHALL select the shared routed coordinator entry path, while the Copilot command wrapper SHALL select `sai/orchestration/inline-invocation.md` directly with `phase: sai-3-implement` and SHALL NOT consume the shared routed coordinator instructions as its execution path. The routed prerequisite and change-picker behavior SHALL execute in the worker; the Copilot Inline Coordinator Adapter SHALL retain that behavior for Copilot without an intermediate inline command loader.

#### Scenario: Harness-specific entry selection
- **WHEN** `/sai-3-implement` is invoked under Claude Code
- **THEN** its wrapper SHALL enter the coordinator-to-worker dispatch seam

#### Scenario: Opencode coordinator entry selection
- **WHEN** `/sai-3-implement` is invoked under opencode
- **THEN** its wrapper SHALL enter the coordinator-to-worker dispatch seam

#### Scenario: Copilot inline entry selection
- **WHEN** `/sai-3-implement` is invoked under GitHub Copilot
- **THEN** its wrapper SHALL bypass that seam and dispatch the direct inline adapter with the current prerequisite and change-picker behavior
- **AND** it SHALL NOT invoke `sai/commands/sai-3-implement-inline.md`

### Requirement: Coordinator dispatch boundary
The `/sai-3-implement` coordinator SHALL construct a normalized invocation envelope containing both `wrapper_echo_value` (the non-empty `**Change-name argument:** <value>` wrapper-echo value, or empty when absent) and `arguments_value` (the raw `$ARGUMENTS` value, including flags). It SHALL pass that envelope unchanged to one implementation-planning worker, SHALL preserve wrapper-echo precedence for the worker, and SHALL NOT run prerequisite checks, query OpenSpec, execute change-picker logic, resolve the change name, or perform technical planning itself.

#### Scenario: Raw implementation invocation
- **WHEN** a user invokes `/sai-3-implement` with a change name, no change name, or supported flags
- **THEN** the coordinator SHALL dispatch one implementation-planning worker with both invocation sources in the normalized envelope, the harness binding SHALL capture the dispatch identifier outside the worker-authored payload, and the coordinator SHALL await the binding-augmented result

#### Scenario: Opencode wrapper-echo precedence
- **WHEN** the opencode wrapper-echo value is non-empty and `$ARGUMENTS` is empty or contains a different value
- **THEN** the coordinator SHALL forward both values and the worker SHALL treat `wrapper_echo_value` as the resolved change-name source without scanning the parent conversation

### Requirement: Coordinator I/O isolation
The coordinator SHALL NOT run prerequisite checks or change-picker queries, read the codebase, OpenSpec artifacts, or implementation audit files, or write `implementation.md` or any other planning artifact.

#### Scenario: Worker-owned technical work
- **WHEN** the implementation phase needs prerequisites, artifact contents, codebase context, or a planning write
- **THEN** the coordinator SHALL leave that operation to the worker rather than performing it directly

### Requirement: User-facing result handling
The coordinator SHALL preserve the existing user communication and MANDATORY STOP behavior while reporting the worker's concise structured summary and handling completed, needs_input, failed, and cancelled outcomes. The harness binding SHALL augment `needs_input` with coordinator-owned continuation metadata captured at dispatch. The coordinator SHALL present the worker's question through the harness-native picker, forward the selected answer to the same worker using that metadata, asynchronously await the next structured payload when the worker runs in the background, and re-present the request when the worker rejects an invalid response.

#### Scenario: Worker reports completion
- **WHEN** the worker returns `completed`
- **THEN** the coordinator SHALL communicate the summary, identify changed files, and fire the existing MANDATORY STOP without adding technical planning content

#### Scenario: Worker requests input
- **WHEN** the binding delivers `needs_input` with a worker-authored question and closed option set plus coordinator-owned continuation metadata
- **THEN** the coordinator SHALL present those options through Claude Code's native option picker or opencode's native option picker, forward the selected value to the same worker session, and await its next structured payload without starting a second worker

#### Scenario: Invalid input is rejected
- **WHEN** the worker returns `needs_input` because a forwarded answer is invalid
- **THEN** the coordinator SHALL not start a second worker and SHALL present the worker's updated question and option set again

#### Scenario: User declines cleanly
- **WHEN** the worker returns `cancelled` because the user deliberately declined a decision whose existing semantics terminate the invocation, such as a one-change selection
- **THEN** the coordinator SHALL report a clean stop without claiming planning completion, SHALL identify changed files, and SHALL not fire the completed-planning MANDATORY STOP path

### Requirement: Shared lifecycle adapter integration
The routed `/sai-3-implement` coordinator SHALL consume the canonical shared coordinator contract through an implementation phase adapter. The adapter SHALL provide the original two-field invocation envelope, harness binding dispatch and continuation operations, an empty set of allowed nonterminal extensions, no extension handlers, the enumerated implementation replacement-reconstruction fields below, and implementation terminal navigation. The adapter SHALL NOT duplicate lifecycle payload validation, ordered changed-file aggregation, continuation-first recovery, replacement-worker limits, or terminal routing, and SHALL NOT import design feedback, notice, or continue-now behavior.

The replacement-reconstruction fields SHALL be exactly:

- `resolved_change_name` when resolution already occurred;
- `opaque_input_history`, an ordered list whose entries contain only one prior worker-authored `question`, its ordered `options`, and the exact selected `answer_value`; and
- `durable_artifact_reconstruction_instruction`, a fixed instruction requiring the replacement worker to rerun prerequisites and independently reread current change artifacts, audit artifacts, and `implementation.md` from disk.

The coordinator SHALL retain the accumulated `changed_files` union itself rather than seed the replacement worker's empty journal. It SHALL NOT pass artifact contents, inferred planning state, design `pending_feedback`, design notice acknowledgements, design fast-track presentation flags, or binding continuation identifiers as reconstruction fields.

#### Scenario: Implementation lifecycle result is processed
- **WHEN** the implementation-planning worker returns a lifecycle payload under Claude Code or opencode
- **THEN** the coordinator SHALL process it through the canonical shared coordinator contract
- **AND** implementation-specific behavior SHALL enter only through the declared phase-adapter fields

#### Scenario: Design-only event reaches implementation
- **WHEN** the implementation coordinator receives a design notice, artifact-feedback event, or continue-now transition
- **THEN** it SHALL reject that event as unsupported rather than adding a design-only extension or processing it as an implementation lifecycle status

#### Scenario: Continuation cannot resume the original worker
- **WHEN** same-worker implementation continuation fails
- **THEN** the shared lifecycle SHALL preserve the ordered changed-file union and dispatch at most one replacement worker only when the original envelope, `resolved_change_name` when applicable, complete `opaque_input_history`, and `durable_artifact_reconstruction_instruction` are available
- **AND** the replacement worker SHALL rebuild technical state from durable artifacts rather than receive artifact contents or the prior worker journal

#### Scenario: Reconstruction metadata is incomplete
- **WHEN** the coordinator cannot provide an exact required reconstruction field
- **THEN** it SHALL return a failed restart request and SHALL NOT dispatch a replacement worker with inferred or partial state

### Requirement: Resolved change name propagation
After the worker resolves a change, every `completed`, `needs_input`, `failed`, or `cancelled` lifecycle payload SHALL contain the coordinator-owned `resolved_change_name` field. The coordinator SHALL retain that exact value in invocation-scoped state and SHALL pass it to terminal navigation so the exact completion message can replace `{name}`, including when the original invocation envelope contained no change name. A post-resolution payload missing `resolved_change_name` SHALL be treated as a failed lifecycle result and SHALL NOT reach terminal completion navigation.

#### Scenario: Resolved name reaches terminal navigation
- **WHEN** an empty invocation resolves `{name}` through the worker-owned change picker and later returns a terminal payload
- **THEN** the payload SHALL contain `resolved_change_name: {name}`
- **AND** terminal navigation SHALL receive that value and use it in the exact completion message

### Requirement: shared-routed-coordinator-profile
Opencode routed implementation planning SHALL use the shared `sai-coordinator` primary control-plane profile rather than an implementation-only coordinator profile. Claude Code SHALL retain its wrapper-session coordinator model and effort settings; only its managed worker identity SHALL align with the numbered phase name. The opencode profile SHALL retain the union of the routed design and implementation coordinator permissions and SHALL preserve `subagent_depth: 2`.

#### Scenario: opencode starts routed implementation planning
- **WHEN** opencode invokes `/sai-3-implement` through the routed path
- **THEN** the invocation SHALL use the `sai-coordinator` primary profile
- **AND** the profile SHALL dispatch the implementation phase worker without performing technical I/O itself

#### Scenario: Claude Code retains coordinator adapter settings
- **WHEN** Claude Code invokes `/sai-3-implement`
- **THEN** its wrapper session SHALL retain the established coordinator model and effort settings
- **AND** its managed worker definition SHALL target the numbered implementation worker identity

#### Scenario: shared profile preserves implementation lifecycle
- **WHEN** the shared profile handles an implementation lifecycle event
- **THEN** it SHALL use the existing shared coordinator lifecycle contract and implementation phase adapter
- **AND** it SHALL preserve the existing prerequisite, picker, continuation, replacement, and terminal behavior

### Requirement: numbered-implementation-worker-identity
The routed implementation worker SHALL use the phase-specific identifier `sai-3-implementation-worker` across opencode agent configuration, Claude Code managed worker definitions, forwarding skill directories and fetch references, harness bindings, installer projections, and verification/documentation surfaces. Its reusable technical core SHALL be named `sai-3-implementation-core` in `sai/compat/` and SHALL remain separate from the design worker contract. The routed Claude Code and opencode implementation workers and the Copilot Inline Coordinator Adapter SHALL fetch the renamed core wherever they consume the implementation invocation core.

#### Scenario: implementation dispatch resolves the phase worker
- **WHEN** the routed implementation coordinator dispatches technical implementation planning
- **THEN** the harness binding SHALL target `sai-3-implementation-worker`
- **AND** the worker SHALL retain the existing implementation lifecycle, permissions, artifact, and phase-policy contract

#### Scenario: opencode wrapper activates the shared profile
- **WHEN** opencode invokes `/sai-3-implement`
- **THEN** the wrapper SHALL select `agent: sai-coordinator`
- **AND** the wrapper SHALL omit a command-level model override

#### Scenario: all implementation paths use the renamed core
- **WHEN** a routed implementation worker or the Copilot Inline Coordinator Adapter loads the reusable implementation invocation behavior
- **THEN** it SHALL reference `sai-3-implementation-core`
- **AND** no caller SHALL fetch the former unnumbered implementation core name

#### Scenario: shared permissions do not change implementation dispatch
- **WHEN** the shared coordinator is permitted to launch both phase workers
- **THEN** `/sai-3-implement` SHALL dispatch only `sai-3-implementation-worker`
- **AND** it SHALL NOT dispatch `sai-2-design-worker`

#### Scenario: existing implementation worker is migrated
- **WHEN** installation finds the former managed implementation worker identity `sai-implementation-planning-worker`
- **THEN** it SHALL verify that the file content matches its recorded ownership hash before removing the file or sidecar
- **AND** after a successful hash match it SHALL replace the managed identity with `sai-3-implementation-worker` and its sidecar without leaving both managed identities installed

#### Scenario: modified implementation worker is preserved
- **WHEN** the former managed implementation worker file fails ownership-hash verification or its sidecar is missing or incompatible
- **THEN** migration SHALL preserve the old file and sidecar
- **AND** it SHALL report a protected manual-migration collision without deleting, overwriting, or silently installing a duplicate replacement

#### Scenario: implementation-name collision is protected
- **WHEN** the new `sai-3-implementation-worker` destination exists with incompatible user-owned content
- **THEN** installation, doctor, and uninstall SHALL report the collision as unmanaged or incompatible
- **AND** SHALL not overwrite or delete that content
