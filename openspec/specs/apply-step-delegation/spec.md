# apply-step-delegation Specification

## Purpose
Defines how apply Steps are dispatched to scoped execution workers.

## Requirements
### Requirement: Coordinator dispatches each Step to a subagent

During `sai-4-apply`, the main thread SHALL act as a coordinator: for each Step in `implementation.md` it SHALL identify the next unchecked Step and dispatch a subagent to execute that Step. The number of dispatches depends on the Step's testability: a **non-testable** Step (no RED block) is dispatched to exactly one subagent, while a **testable** Step (with a RED block) is split into two ordered dispatches — a test-writer then an implementation subagent — per `apply-test-impl-split`. In all cases the coordinator itself SHALL NOT perform the read-before-write reads, RED-test runs, or GREEN iteration of the Step — those happen inside the subagent(s) so their output never enters the coordinator's context.

#### Scenario: Coordinator reaches the next unchecked Step
- **WHEN** the coordinator finishes one Step and looks for the next work
- **THEN** it locates the next Step in `implementation.md` whose checkboxes are not all `[x]` and dispatches a subagent to execute that Step: one subagent for a non-testable Step, or a test-writer followed by an implementation subagent for a testable Step

#### Scenario: Coordinator does not absorb execution noise
- **WHEN** a Step requires reading files before writing, running a RED test, or iterating on GREEN
- **THEN** those operations are performed by the subagent(s), and only the subagent's compact report (not the raw file dumps, tracebacks, or iteration logs) returns to the coordinator

### Requirement: Subagent receives the Step text plus execution rules

When dispatching a subagent, the coordinator SHALL provide the material that subagent needs and nothing that would reopen the mirroring channel. The prompt SHALL include a dispatch-kind-specific `Allowed files` list derived from the current Step's plan-level file metadata. This list is shareable plan-derived input; the pre-dispatch baseline and any recovery assessment remain coordinator-only.

- For a **single dispatch**, the coordinator SHALL provide exactly the full text of the Step, the following rules (including the Step's plan-level files as the `Allowed files` list and the declared scratch rules), and any technical learnings it deems relevant (per `apply-technical-learnings-memory`). The subagent SHALL execute the Step's implementation body.
- For a **blind test-writer dispatch**, the coordinator SHALL provide that Step's `interfaces.md` section, the injected testing context, the following rules, the dispatch's `Allowed files` list, and any relevant technical learnings. The allowed-file list SHALL contain only plan-authorized test files and explicitly permitted RED/interface stub files; it SHALL exclude production files.
- For an **implementation dispatch**, the coordinator SHALL provide exactly the full GREEN implementation body, the following rules (including the read-before-write rule, the dispatch's `Allowed files` list, and the declared scratch rules), and any relevant technical learnings. The allowed-file list SHALL contain only plan-authorized production files; it SHALL exclude tests and declared interfaces.

For all three dispatch kinds, the coordinator SHALL inject the exact declared scratch path `.tmp/{change-name}/` using its own change-name argument. The scratch path SHALL be separate from and excluded from the `Allowed files` list. A subagent MAY create temporary files only below that path and MAY remove its contents and directory before a clean return. A subagent SHALL NOT be required to preserve the path when returning STOP or failure; coordinator cleanup SHALL sweep the path after every dispatch outcome, including non-clean outcomes. A subagent SHALL NOT remove the `.tmp/` parent. Scratch paths SHALL NOT be treated as feature outputs or included in the Subagent Report's `Files modified` field.

#### Scenario: Single dispatch receives its plan scope and scratch rules
- **WHEN** the coordinator dispatches a Step through the single-dispatch path whose plan-level files are `src/a.ts` and `tests/a.test.ts`
- **THEN** the prompt includes `Allowed files` containing exactly those plan-level files, separately declares `.tmp/{change-name}/` as scratch, and does not include the pre-dispatch baseline or recovery assessment

#### Scenario: Blind test-writer receives only testing paths
- **WHEN** a Split-Routed Step is dispatched to the blind test-writer with plan-authorized test and RED/interface-stub paths plus production paths
- **THEN** the prompt's `Allowed files` list contains only the authorized test and stub paths, contains no production path, and separately declares `.tmp/{change-name}/` as scratch without exposing the GREEN implementation

#### Scenario: Implementation dispatch receives only production paths
- **WHEN** a Split-Routed Step is dispatched to the implementation subagent with plan-authorized production, test, and interface paths
- **THEN** the prompt's `Allowed files` list contains only the authorized production paths, excludes tests and declared interfaces, and separately declares `.tmp/{change-name}/` as scratch

#### Scenario: Clean dispatch removes its scratch before reporting
- **WHEN** a subagent uses `.tmp/{change-name}/` for temporary scaffolding and completes the dispatch without STOP or failure
- **THEN** it may remove the scratch contents and directory before returning, field 8 reports only non-scratch paths, and the coordinator still performs its unconditional backstop sweep

#### Scenario: Non-clean dispatch has no worker preservation obligation
- **WHEN** a subagent reaches STOP, fails, or cannot return a normal report after using `.tmp/{change-name}/`
- **THEN** it does not claim the scratch paths in field 8, does not remove the `.tmp/` parent, and leaves cleanup of the declared per-change path to the coordinator's unconditional sweep

#### Scenario: Split-routed dispatches do not share surviving scratch
- **WHEN** a blind test-writer dispatch returns before the implementation dispatch of the same Step
- **THEN** the coordinator sweeps the writer's exact per-change scratch path before the implementation dispatch starts, so scratch cannot act as a cross-dispatch communication channel

#### Scenario: Worker does not remove the scratch parent
- **WHEN** a dispatch uses `.tmp/{change-name}/` while `.tmp/` is pre-existing or contains another path
- **THEN** the worker removes or leaves only the exact per-change scratch directory and leaves `.tmp/` for the coordinator's parent-lifecycle decision

#### Scenario: Scratch is not a feature output
- **WHEN** a dispatch creates scratch alongside a production output
- **THEN** `Files modified` contains only the non-scratch feature output and excludes every path below `.tmp/{change-name}/`
