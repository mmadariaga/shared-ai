# coordinator-step-pointers Specification

## Purpose
TBD - created by archiving change spec-step-gated-instructions. Update Purpose after archive.
## Requirements
### Requirement: Spec coordinator declares a static step_pointer_map

The spec coordinator card SHALL declare a static optional `step_pointer_map` for the phase — fully known at dispatch, immutable for the invocation, and never carried in the dispatch envelope or any reconstruction field — mapping every declared progress-plan id to its just-in-time instruction pointer: `prereqs-and-change` to none, and `research`, `proposal`, `specs`, `validation`, and `review` each to their file under `sai/commands/spec/steps/`.

#### Scenario: the map is fully known at dispatch

- **WHEN** the spec coordinator activates
- **THEN** its `step_pointer_map` is already complete and static, with no runtime discovery, extension, or amendment of entries

### Requirement: Progress continuations carry exactly one pointer line

While the map is in force, every progress-event continuation payload the coordinator sends SHALL be exactly two lines: today's protocol continuation line first, then one pointer line `Active step: <id> — follow <path>` whose id and path come from the static map under the shared command runner's deterministic derivation. With every declared step marked, the second line SHALL read exactly `Active step: none — complete remaining work and return your terminal result.`

#### Scenario: validation completion hands over review

- **WHEN** the worker's progress event marks `validation` as complete
- **THEN** the continuation payload carries the protocol continuation line followed by the pointer line naming `review` and its `sai/commands/spec/steps/review.md` path

#### Scenario: fully marked plan yields the exact none-line

- **WHEN** a progress event marks the last previously unmarked declared step, leaving every declared step marked
- **THEN** the continuation's second line reads exactly `Active step: none — complete remaining work and return your terminal result.`

### Requirement: Pointer-less continuations leave the active step unchanged

Artifact-feedback continuations, `continue_after_recovery` continuations, and picker-answer forwarding continuations SHALL carry no pointer line, so the worker's active step file persists across them in the same worker's continuous session.

#### Scenario: forwarded feedback adds no pointer

- **WHEN** the coordinator forwards supplied feedback text to the same worker after an accepted-findings edit round
- **THEN** the continuation carries no `Active step:` line and the worker continues under the step file already active in its session

#### Scenario: recovery diagnosis adds no pointer

- **WHEN** the coordinator forwards the ordered recovery diagnosis with exactly `continue_after_recovery`
- **THEN** the continuation carries no pointer line and recovery proceeds without reopening or renaming any progress step

#### Scenario: forwarded picker answer leaves the step unchanged

- **WHEN** the review coordinator forwards a selected option value to the same worker after a `needs_input` pause
- **THEN** the continuation carries no `Active step:` line and the worker continues under the step file already active in its session

### Requirement: The step-pointer convention covers both routed phases

The static `step_pointer_map` continuation convention SHALL apply to every coordinator card that declares a map (spec, design, security, performance, accessibility). The implement and review coordinators SHALL deliver the same two-line continuation through their declared `step_machine` per `@sai/policies/stage-machine.md` § Step machines. Adapters with neither a static map nor a step machine SHALL keep today's exact continuation behavior.

#### Scenario: undeclared phases remain byte-for-byte unchanged

- **WHEN** a routed phase's adapter declares neither a `step_pointer_map` nor a `step_machine`
- **THEN** its continuations carry no pointer lines and its observable continuation behavior is unchanged

#### Scenario: the audit coordinators declare their maps

- **WHEN** the security, performance, or accessibility coordinator activates
- **THEN** its `step_pointer_map` statically maps all declared audit plan ids in plan order with no runtime discovery or amendment

#### Scenario: implement and review coordinators deliver pointers through their machines

- **WHEN** the implement or review coordinator activates and sends a progress-event continuation
- **THEN** the two-line continuation format is delivered via the declared `step_machine` and the stage-machine.md policy

