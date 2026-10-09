# implement-planning-evidence Specification

## Purpose
TBD - created by archiving change implement-gap-driven-research. Update Purpose after archive.

## Requirements

### Requirement: The planner starts from the supplied material and reads only what its Steps need

The `/sai-3-implement` step library SHALL define the supplied material as the change artifacts (`proposal.md`, `specs/**`, `design.md`, `tasks.md`, `interfaces.md`) plus what `tasks.md` lists under `## Required Documentation` and `## Implementation Context`, and SHALL state cost control as the reason to start there: `/sai-2-design` already researched the project. The Required Documentation list SHALL be a starting point for reading, not a boundary. The planner SHALL read from it only what its Steps need. A file that `tasks.md` or `interfaces.md` names as affected by a Step SHALL count as supplied material and SHALL be read directly.

#### Scenario: Entry no Step needs is skipped

- **WHEN** a Required Documentation entry is marked context-only or is irrelevant to every Step
- **THEN** the planner does not read it

#### Scenario: Affected file is read directly

- **WHEN** `tasks.md` or `interfaces.md` names a file as affected by a Step and Required Documentation does not list it
- **THEN** the planner reads that file directly as supplied material, without an explorer dispatch

#### Scenario: Listed URL is read directly

- **WHEN** a URL listed under Required Documentation is relevant to a Step
- **THEN** the planner reads it directly

### Requirement: A planning gap is researched through one explorer path

A gap SHALL be evidence indispensable to plan one specific Step that is missing from the supplied material or contradictory within it. The planner SHALL close a gap with a `budget-explorer` dispatch (the `budget-explorer` agent on Claude Code, the `explore` keyword on opencode) whose goal names the Step and the gap, and SHALL end the research as soon as that gap is resolved. Looking for web documentation that is not listed SHALL be gap research. A listed entry that no longer exists on disk SHALL be a gap only when a Step needs it.

#### Scenario: Gap is researched through the explorer

- **WHEN** a convention a Step needs for code generation is not settled by the supplied material
- **THEN** the planner dispatches a `budget-explorer` whose goal names that Step and that gap

#### Scenario: No gap means no research

- **WHEN** the supplied material is enough to plan every Step
- **THEN** the planner dispatches no explorer

#### Scenario: Missing listed document nobody needs

- **WHEN** a listed document is missing from disk and no Step needs it
- **THEN** the planner treats it as no gap and continues

#### Scenario: Unlisted web documentation

- **WHEN** a Step needs web documentation that Required Documentation does not list
- **THEN** the planner looks for it through the explorer as gap research

### Requirement: An unresolved gap becomes a question to the user

When the explorer reaches its ceiling or does not find the evidence, the planner SHALL NOT substitute its own repository reading and SHALL NOT invent the evidence. It SHALL return `needs_input` with a question that names the Step and the gap. The question SHALL use the ordinary `needs_input` shape with no additional payload field.

#### Scenario: Explorer does not find the evidence

- **WHEN** the explorer returns without the evidence a Step needs
- **THEN** the planner returns `needs_input` with a question that names the Step and the gap

#### Scenario: Unresolved-gap question validates as ordinary input

- **WHEN** the payload validator receives a post-resolution `needs_input` whose question names a Step and its gap with ordered options
- **THEN** it accepts the payload as an ordinary terminal input

### Requirement: Research never authorizes departing from specs or interfaces

When the explorer shows that `design.md`, `tasks.md`, or `interfaces.md` contradict the real code, the planner SHALL follow the existing defective-`sai-2` route of the plan-generation step. Research SHALL NOT authorize departing from specs or interfaces.

#### Scenario: Research exposes a design contradiction

- **WHEN** an explorer result shows that `interfaces.md` contradicts the real code
- **THEN** the planner follows the defective-`sai-2` route instead of planning against its own finding

### Requirement: The terminal summary names every researched gap

The planner SHALL name every researched gap in its terminal `summary`, one line per gap in the form `Researched gap: Step N — <gap>`. When the supplied material was enough, the summary SHALL carry no such line.

#### Scenario: Researched gap is traced

- **WHEN** the planner researched one gap for Step 3 and completes
- **THEN** its terminal `summary` carries one `Researched gap: Step 3 — <gap>` line

#### Scenario: No research leaves no trace line

- **WHEN** the planner completes without dispatching an explorer
- **THEN** its terminal `summary` carries no `Researched gap:` line

### Requirement: Gap research needs no coordinator authorization in any mode

The implementation coordinator SHALL present every worker `needs_input` through the ordinary native-picker route and SHALL carry no lookup-authorization branch. Its replacement reconstruction fields SHALL be `resolved_change_name` when already known, the ordered `opaque_input_history`, the fixed durable-artifact reconstruction instruction, the worker's `active_step_id`, and `fast_track_active`, with no lookup history. Gap research SHALL follow the same rule with and without fast-track, in `/sai-build`, and on a re-run over an existing `implementation.md`.

#### Scenario: Research runs without an approval round-trip

- **WHEN** the planner finds a gap in a standalone run without fast-track
- **THEN** it dispatches the explorer without requesting a coordinator decision

#### Scenario: Re-run follows the same rule

- **WHEN** `implementation.md` existed at the start of the run and a new Step has a gap
- **THEN** the planner researches it through the same `budget-explorer` path and uses no separate research subagent

#### Scenario: Replacement carries no lookup history

- **WHEN** the coordinator reconstructs a replacement implementation worker
- **THEN** the reconstruction carries no lookup history and the replacement researches the gaps it needs again

### Requirement: The research rule lives in one file

The Planning Evidence rule SHALL live in `sai/commands/implement/steps/common.md`. `steps/documentation-review.md` and `steps/plan-generation.md` SHALL reference it and SHALL NOT restate it. The `documentation-review` step SHALL keep its step id.

#### Scenario: Step files defer to the rule

- **WHEN** the planner runs the `documentation-review` or `plan-generation` step
- **THEN** the step file directs it to the Planning Evidence rule in `steps/common.md`
