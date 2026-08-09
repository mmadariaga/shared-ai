# Progress Harness Bindings Specification

## Purpose

Define how each harness binding maps progress events to its native task-list mechanism, the shared neutral semantic policy, the neutral installed binding, and the coordinator-only emission invariant.

## Requirements

### Requirement: claude-task-list-update

On each progress event, the Claude Code binding SHALL update the harness task list so that the reported step ids render `completed` and the leading unmarked step renders `in_progress`, per the deterministic state derivation of `coordinator-progress-ownership` (plan order plus the marked set), by whatever mechanism the harness's task-list tool provides. Incrementality is a binding-level optimization, not a normative contract: where the harness tool supports updating single entries without re-listing the rest, the binding MAY use them; where it replaces the list wholesale, the binding SHALL emit the full list on each update.

#### Scenario: Claude marks a progress batch

- **WHEN** a progress event reports step ids on Claude Code
- **THEN** the binding SHALL update the harness task list so those steps render `completed` and the leading unmarked step renders `in_progress` per the deterministic state derivation, using the harness's update mechanism

#### Scenario: Claude renders below-threshold plans

- **WHEN** the declared plan has fewer than three steps
- **THEN** the Claude binding SHALL NOT render a task list at all

### Requirement: opencode-todowrite-full-replacement

On each progress event, the opencode binding SHALL call `todowrite` with the full `todos` array, replacing the entire list: completed steps SHALL carry state `completed`, the first incomplete step SHALL carry `in_progress`, and all remaining steps SHALL carry `pending`, per the deterministic state derivation of `coordinator-progress-ownership` (plan order plus the marked set); the priority field SHALL be filled with a constant for every entry.

#### Scenario: opencode replaces the full array

- **WHEN** a progress event reports step ids on opencode
- **THEN** the binding SHALL emit one `todowrite` call whose full array reflects the marked set with `completed`, the leading unmarked step `in_progress`, the rest `pending`, and the constant priority

#### Scenario: opencode renders below-threshold plans

- **WHEN** the declared plan has fewer than three steps
- **THEN** the opencode binding SHALL NOT call `todowrite` at all

### Requirement: one-shared-semantic-policy

Both harnesses SHALL follow the same neutral semantic policy for the task list — `sai/policies/todo-structure.md` — which owns the list structure, step states, and the minimum-threshold rule; each binding SHALL map that policy to its own tool mechanism, mirroring the per-harness tool mapping precedent of `sai/policies/remember.md:10-13`.

#### Scenario: both harnesses share the policy

- **WHEN** a progress event is handled on either harness
- **THEN** the list SHALL comply with `sai/policies/todo-structure.md` and SHALL differ only in the harness's native tool call

### Requirement: neutral-installed-binding

The progress emission SHALL be implemented in the per-harness binding sources for the existing spec, design, and implementation-planning workers and for the review, security, performance, and accessibility audit workers. The Claude Code and opencode sources SHALL install through the corresponding neutral binding destinations using the existing install-manifest projection strategy; adding audit progress rendering SHALL NOT create harness-specific destination divergence or change the shared neutral policy location.

#### Scenario: audit bindings install neutrally

- **WHEN** the install manifest is applied
- **THEN** each harness's review, security, performance, and accessibility worker binding SHALL install to its corresponding neutral binding destination
- **AND** the destination strategy SHALL remain mirrored between Claude Code and opencode

#### Scenario: audit bindings reference the shared policy

- **WHEN** an audit binding renders a progress event
- **THEN** it SHALL follow `sai/policies/todo-structure.md` for list structure, state derivation, threshold, and terminal reconciliation
- **AND** it SHALL not restate or fork those neutral rules

#### Scenario: audit binding ownership stays coordinator-only

- **WHEN** an audit worker reports completed progress steps
- **THEN** the Claude Code task update or opencode `todowrite` call SHALL originate from the coordinator session
- **AND** the worker subagent SHALL emit only the canonical progress event

### Requirement: task-list-emission-coordinator-only

The task-list tool call SHALL originate exclusively from the coordinator session and SHALL NOT originate from a worker subagent: opencode disables `todowrite` for subagents by default and the worker runs as a subagent, so moving emission to the worker breaks opencode support. The invariant SHALL be recorded in the neutral policy `sai/policies/todo-structure.md`, which every binding references; the opencode binding SHALL additionally carry the harness-specific reason.

#### Scenario: worker never emits the tool call

- **WHEN** a worker reports completed plan steps
- **THEN** the task-list tool call SHALL be emitted by the coordinator session and SHALL NOT be emitted by the worker

#### Scenario: opencode subagent restriction

- **WHEN** a progress event is handled on opencode
- **THEN** the `todowrite` call SHALL come from the coordinator — the active primary agent, where the tool is available — and SHALL NOT come from the worker subagent, where the tool is disabled by default
