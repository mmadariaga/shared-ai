# step-pointer-task-disclosure Specification

## Purpose
TBD - created by archiving change step-pointer-with-task. Update Purpose after archive.

## Requirements

### Requirement: Segment-start reset supplies the first filed step pointer

A coordinator or supervising surface that declares a `step_machine` SHALL retain the `stage` and `next` fields that its segment-start `sai-state reset <id> <machineId>` returns for the machine's first filed step, the first step whose `follow` is a file. It SHALL obtain that pointer without any additional `sai-state` call or emit.

#### Scenario: reset names the first filed step

- **WHEN** a coordinator runs the segment-start `reset <id> spec-standalone@1`
- **THEN** it retains `stage: research` and the `research` step file as `next.follow` for the task disclosure, with no other `sai-state` verb invoked

### Requirement: Task disclosure opens with the first filed step pointer

Every coordinator whose adapter declares a `step_machine` (spec, design, implement, review, security, performance, and accessibility) SHALL send the post-ready task-disclosure continuation with the pointer line `Active step: <stage> — follow <next.follow>` for the first filed step as its first line, followed by the task exactly as the adapter defines it. The first filed step SHALL be `research` for spec and design, `collapse-implemented-steps` for implement, `establish-diff-scope` for review, `discover-module-map` for security, `map-stack-hot-paths` for performance, and `map-ui-framework` for accessibility. The two-phase handshake SHALL stay unchanged: the initial dispatch carries no task content and no pointer.

#### Scenario: review disclosure carries the establish-diff-scope pointer

- **WHEN** the review worker returns `event: ready`
- **THEN** the task-disclosure continuation's first line is the `Active step:` pointer for `establish-diff-scope`, and the task follows it

#### Scenario: the initial dispatch carries no pointer

- **WHEN** a step-machine coordinator dispatches its worker
- **THEN** the dispatch carries only the ready prompt and base instructions, and the pointer first appears in the task-disclosure continuation

### Requirement: Worker runs the fileless first step inline and reports both ids

A step-machine worker SHALL treat the task-disclosure line before the task as its first pointer. It SHALL run the fileless first step from its worker contract plus `steps/common.md` and SHALL pass that step before any subagent dispatch, research, or artifact write. It SHALL then follow the disclosed pointer and return one progress event that carries the first step id and the first filed step id together, in plan order. The worker SHALL NOT call `sai-state`, SHALL load no step file other than the one the pointer names, and SHALL NOT merge or rename steps.

#### Scenario: security reports scope and discovery together

- **WHEN** the security worker resolves its scope and completes the module map named by the disclosed pointer
- **THEN** its first progress event carries `resolve-security-scope` and `discover-module-map` together

### Requirement: A first event with only the first id returns the same pointer

When the first progress event after reset carries only the machine's first step id, the machine SHALL mark that id and return the first filed step's pointer again with no error, and the coordinator SHALL send that pointer on the progress continuation as usual. A first event carrying the first two ids SHALL advance the machine to the third step.

#### Scenario: single-id first event re-sends the pointer

- **WHEN** the first progress emit on `review-standalone@1` carries only `resolve-change`
- **THEN** the emit succeeds without an error and its `next` equals the `establish-diff-scope` pointer the reset returned

#### Scenario: two-id first event advances

- **WHEN** the first progress emit on a step machine carries its first two step ids
- **THEN** the machine's `stage` is the third step and `next` names that step's file

### Requirement: A failing or early-closing first step does not follow the pointer

When the fileless first step fails on prerequisites, change resolution, or scope resolution, the worker SHALL return its terminal status before any research, SHALL NOT follow the disclosed pointer, and SHALL emit no progress event. When the first step ends the run with a terminal outcome of its own, the worker SHALL report only the step ids it completed and return that outcome without following the pointer.

#### Scenario: resolution failure returns before research

- **WHEN** change resolution fails in the spec worker's `prereqs-and-change` step
- **THEN** the worker returns its terminal status with no progress event and without loading the `research` step file

#### Scenario: no-UI accessibility scope closes early

- **WHEN** the accessibility worker's scope resolution finds no UI files
- **THEN** it reports only `resolve-accessibility-scope` and returns its Not Applicable `completed` outcome without following the `map-ui-framework` pointer

### Requirement: Replacement before the first progress event resumes at the first filed step

A coordinator that reconstructs a replacement worker before any progress event has arrived SHALL set `active_step_id` to the first filed step from the `reset` response. The replacement's first continuation SHALL carry that step's pointer line, never the fileless first step and never a `none` pointer. After a progress event, `active_step_id` SHALL be the `stage` of the latest progress emit.

#### Scenario: early replacement receives the first filed pointer

- **WHEN** the spec worker's continuation fails before its first progress event and a replacement is reconstructed
- **THEN** the reconstruction carries `active_step_id: research` and the replacement's first continuation carries the `research` pointer line

### Requirement: Design discloses research in both variants and seeds the variant on the combined emit

The `design-standalone@1` machine SHALL name `research` as its first filed step in both the opted-in and the unopted variant, so the disclosed pointer never depends on the variant. The design coordinator's first progress emit, which normally carries `prereqs-resolution` and `research` together, SHALL carry `--with-overview true|false`. A design-phase retry SHALL start from a reset machine and seed the variant again on its first emit. The `--overview-lang` to boolean mapping SHALL stay unchanged for standalone design. The supervised Explore Plan (unattended) design adapter SHALL always seed `--with-overview false`, including on a retry and regardless of `overview_language`.

#### Scenario: combined first emit seeds the variant

- **WHEN** the design coordinator pipes a first progress event carrying `prereqs-resolution` and `research` with `--with-overview true`
- **THEN** the machine adopts the opted-in plan and its next pointer names `design`

#### Scenario: retry reseeds after reset

- **WHEN** a design-phase retry resets `design-standalone@1` and its first progress emit passes `--with-overview false`
- **THEN** the machine adopts the unopted plan for the retry

#### Scenario: supervised adapter seeds the unopted variant

- **WHEN** the supervised Explore Plan (unattended) adapter emits the first design progress event with a selected `overview_language`
- **THEN** the emit passes `--with-overview false` and the machine adopts the unopted plan

### Requirement: Chained and supervised surfaces disclose the first pointer

The `/sai-build` implement segment SHALL open its own post-ready task disclosure with the `collapse-implemented-steps` pointer returned by its `reset <id> implement-standalone@1`, alongside the explicit `fast_track_active=true`. The `/sai-explore` supervised pipeline SHALL open the spec worker's task disclosure with the `research` pointer from `reset <id> spec-standalone@1`. It SHALL open the chained design worker's task disclosure with the `research` pointer from `reset <id> design-standalone@1`, including on a design-phase retry after a new reset.

#### Scenario: chained implement segment

- **WHEN** `/sai-build` activates its implement segment and the worker returns `event: ready`
- **THEN** the task disclosure opens with the `collapse-implemented-steps` pointer line and carries `fast_track_active=true` separate from `arguments_value`

#### Scenario: supervised spec dispatch

- **WHEN** the supervised pipeline's spec worker returns `event: ready`
- **THEN** the task disclosure opens with the `research` pointer line, and a replacement before the first progress event resumes at `research`

### Requirement: The first-pointer rule is single-sourced and phase-neutral

The first-pointer rule SHALL be stated once, with no per-phase exception, in three places: `sai/orchestration/command-runner.md` § Step-gated pointer delivery (coordinator side), `sai/policies/stage-machine.md` § Step machines, and `sai/orchestration/worker-core.md` § Step-machine task disclosure (worker side). Phase coordinators and workers SHALL reference it; the `steps/common.md` files of spec, design, implement, security, performance, and accessibility SHALL also reference it, while the review worker references it from its worker contract and `sai/commands/review/steps/common.md` does not repeat it. The step ids and step files of the seven machines SHALL stay unchanged, including `prereqs-and-change` and `prereqs-resolution`.

#### Scenario: step ids are unchanged

- **WHEN** the seven step machines are loaded after this change
- **THEN** each keeps its prior step list and its first step still maps to `follow: none`
