# accessibility-phase-coordinator Specification

## Purpose
TBD

## Requirements

### Requirement: Routed accessibility entrypoints use a terminal-only coordinator

The Claude Code and opencode `/sai-8-accessibility` entrypoints SHALL invoke an accessibility coordinator and their matching harness-specific accessibility-worker binding. The coordinator SHALL own lifecycle routing and terminal presentation only. GitHub Copilot SHALL remain on its existing inline accessibility path without requiring a routed worker or binding.

#### Scenario: Routed harness starts accessibility
- **WHEN** Claude Code or opencode invokes `/sai-8-accessibility`
- **THEN** the wrapper enters the accessibility coordinator and matching accessibility-worker binding
- **AND** it does not execute the inline accessibility instruction as the coordinator's technical workflow

#### Scenario: Copilot starts accessibility
- **WHEN** GitHub Copilot invokes `/sai-8-accessibility`
- **THEN** its existing inline accessibility prompt remains the execution path
- **AND** no routed accessibility worker or binding is required

### Requirement: Accessibility invocation arguments remain worker-owned

The coordinator SHALL preserve the complete accessibility invocation argument string in the harness-defined original envelope, including the existing argument contract: one required change-name positional, optional `--full` or `--path {dir}` scope flag, optional `--runtime` flag, and optional trailing parent-branch value. It SHALL not parse, normalize, resolve, or discard those values before dispatch.

#### Scenario: Routed accessibility receives scope and runtime arguments
- **WHEN** a routed invocation includes a change name, an explicit scope, `--runtime`, or an optional parent branch
- **THEN** the worker receives the complete original argument string
- **AND** the coordinator does not reinterpret `--runtime` or remove any positional value

### Requirement: Accessibility coordinator performs no technical I/O

The accessibility coordinator SHALL NOT run prerequisites, resolve a change, read or write change artifacts, inspect git or UI source, determine a parent branch, scope a diff, delegate research, run accessibility tools, authorize browser commands, or make accessibility findings. All such operations SHALL belong exclusively to the accessibility worker.

#### Scenario: Technical accessibility work is requested
- **WHEN** an accessibility invocation requires repository, artifact, git, diff, source, browser, or WCAG information
- **THEN** the coordinator delegates the work to the accessibility worker
- **AND** it performs no equivalent technical operation itself

### Requirement: Accessibility lifecycle results preserve the terminal boundary

The coordinator SHALL validate every worker result against the closed worker lifecycle shapes. It SHALL preserve the ordered duplicate-free `changed_files` union across input, same-worker continuation, and at most one replacement recovery. It SHALL present worker-authored `needs_input` questions and ordered options through the native picker for Claude Code or opencode, forward only the selected value through the active binding, print a completed summary without recomposing it, print the exact existing stop message `Accessibility audit done.`, and stop without technical recovery or a further phase.

#### Scenario: Worker requests runtime authorization
- **WHEN** the worker returns `needs_input` for a runtime command
- **THEN** the coordinator presents the exact worker-authored question and ordered options through the active harness picker
- **AND** it forwards only the selected value through the active binding without executing the command itself

#### Scenario: Worker completes accessibility
- **WHEN** the worker returns `completed`
- **THEN** the coordinator prints the worker-authored summary and invocation-scoped changed-file union
- **AND** it prints `Accessibility audit done.` and stops

#### Scenario: Worker reports repeated paths
- **WHEN** continuation or replacement recovery reports the same artifact path more than once
- **THEN** the terminal changed-file union contains that path once in first-seen order

#### Scenario: Worker fails or is cancelled
- **WHEN** the worker returns `failed` or `cancelled`
- **THEN** the coordinator prints the supplied blocking or clean-stop summary and changed-file union
- **AND** it stops without performing technical recovery

### Requirement: Accessibility progress uses payload-derived stamps

The accessibility coordinator SHALL validate `emitted_on`-bearing lifecycle results and render completed-step stamps from worker payloads without executing UI, runtime, scanner, artifact, or wall-clock operations. While its static `step_pointer_map` is in force, every progress-event continuation SHALL be exactly two lines — today's protocol continuation line followed by the deterministic `Active step:` pointer line derived from the map — continuations that are not progress-event continuations SHALL carry no pointer line, and the declared `replacement_reconstruction_fields` SHALL include the departing worker's `active_step_id`.

#### Scenario: Accessibility progress returns

- **WHEN** the accessibility worker reports progress
- **THEN** the coordinator renders the payload-derived stamp and forwards the protocol continuation followed by the pointer line naming the next unmarked accessibility step

#### Scenario: Replacement reconstruction carries the active step

- **WHEN** a departing accessibility worker is replaced mid-run during one recovery
- **THEN** the reconstruction fields include that worker's `active_step_id`
- **AND** the replacement's first continuation carries the correct pointer line for that active step
