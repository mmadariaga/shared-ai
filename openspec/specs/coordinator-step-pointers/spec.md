# coordinator-step-pointers Specification

## Purpose
Define the coordinator-owned step-pointer convention: the declared step machine's `STAGE_FILES` as the routing source, the exactly-two-line progress continuation carrying one `Active step:` pointer, which continuations carry none, and how the convention applies across the routed phases.
## Requirements
### Requirement: Spec coordinator routes steps through its declared step machine

The spec coordinator card SHALL declare `step_machine: spec-standalone@1` and no static `step_pointer_map`. That machine's `STAGE_FILES` mapping — fully known at dispatch, immutable for the invocation, and never carried in the dispatch envelope or any reconstruction field — covers every declared progress-plan id with its just-in-time instruction pointer: `prereqs-and-change` to none, and `research`, `proposal`, `specs`, `validation`, and `review` each to their file under `sai/commands/spec/steps/`.

#### Scenario: the map is fully known at dispatch

- **WHEN** the spec coordinator activates
- **THEN** its machine's `STAGE_FILES` mapping is already complete and static, with no runtime discovery, extension, or amendment of entries

### Requirement: Progress continuations carry exactly one pointer line

While the declared step machine is in force, every progress-event continuation payload the coordinator sends SHALL be exactly two lines: today's protocol continuation line first, then one pointer line `Active step: <id> — follow <path>` whose id and path come from that machine's `STAGE_FILES` mapping under the shared command runner's deterministic derivation. With every declared step marked, the second line SHALL read exactly `Active step: none — complete remaining work and return your terminal result.`

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

### Requirement: The step-pointer convention covers every routed phase

The spec and design coordinators SHALL declare no `step_pointer_map`, and their step ids SHALL be routed by their declared `step_machine` (`spec-standalone@1`, `design-standalone@1`). The implement, review, security, performance, and accessibility coordinators SHALL deliver the same two-line continuation through their declared `step_machine` per `@sai/policies/stage-machine.md` § Step machines. Adapters with neither a static map nor a step machine SHALL keep today's exact continuation behavior.

#### Scenario: undeclared phases remain byte-for-byte unchanged

- **WHEN** a routed phase's adapter declares neither a `step_pointer_map` nor a `step_machine`
- **THEN** its continuations carry no pointer lines and its observable continuation behavior is unchanged

#### Scenario: the audit coordinators declare their step machines

- **WHEN** the accessibility coordinator activates
- **THEN** it declares no `step_pointer_map`, and its audit plan ids are routed by its declared `step_machine: accessibility-standalone@1`

#### Scenario: implement and review coordinators deliver pointers through their machines

- **WHEN** the implement, review, security, performance, or accessibility coordinator activates and sends a progress-event continuation
- **THEN** the two-line continuation format is delivered via the declared `step_machine` and the stage-machine.md policy

