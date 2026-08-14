# apply-step-delegation Specification

## Purpose
Defines how apply Steps are dispatched to scoped execution workers.

## Requirements
### Requirement: Coordinator dispatches each Step to a managed worker

During `sai-4-apply`, the main thread SHALL act as a coordinator: for each Step in `implementation.md` it SHALL identify the next unchecked Step and dispatch a managed Step-execution worker to execute that Step. The dispatch outcome depends on the Step's testability, contract availability, and divisibility, per the routing decision tree of `apply-step-routing-tree`: a **non-testable** Step (no RED block) with at least one production file is dispatched to exactly one GREEN worker (GREEN direct); a **non-testable** Step with no production file is dispatched to one RED worker under the green-exception; a **Split-Routed** Step (RED block + Step Contract + production file) is split into two ordered dispatches — a blind RED worker then a GREEN worker — per `apply-test-impl-split`; a production-free RED-carrying Step is dispatched to one RED worker under the green-exception; and a RED-carrying Step with no Step Contract STOPS the run without dispatching. In all dispatched cases the coordinator itself SHALL NOT perform the read-before-write reads, RED-test runs, or GREEN iteration of the Step — those happen inside the dispatched worker(s) so their output never enters the coordinator's context.

#### Scenario: Coordinator reaches the next unchecked Step
- **WHEN** the coordinator finishes one Step and looks for the next work
- **THEN** it locates the next Step in `implementation.md` whose checkboxes are not all `[x]` and dispatches a managed worker to execute that Step: one GREEN worker for a non-testable Step with a production surface, one RED worker under the green-exception for any production-free Step (testable or non-testable), a RED worker then a GREEN worker for a Split-Routed Step, or a STOP with no dispatch for a RED-carrying Step with no Step Contract

#### Scenario: Coordinator does not absorb execution noise
- **WHEN** a Step requires reading files before writing, running a RED test, or iterating on GREEN
- **THEN** those operations are performed by the dispatched worker(s), and only the compact worker report (not the raw file dumps, tracebacks, or iteration logs) returns to the coordinator

### Requirement: Worker receives the Step text plus execution rules

When dispatching a worker, the coordinator SHALL provide the material that worker needs and nothing that would reopen the mirroring channel. The dispatch SHALL include a dispatch-kind-specific `Allowed files` list derived from the current Step's plan-level file metadata. This list is shareable plan-derived input; the pre-dispatch baseline and any recovery assessment remain coordinator-only.

Every dispatch kind SHALL carry the shared rule set: the dispatch's `Allowed files` list (plan-derived, injected per kind), the declared scratch rules, the read-before-write rule, and the prohibitions (no git operation or commit, no checkbox marking or `implementation.md` edit, no acting on a STOP & COMMIT marker, no `openspec` command, no loading skills, no reading change artifacts, and the report-completeness rule for field 8). Each kind SHALL additionally carry its dispatch-specific execution rule:

- For a **GREEN-direct dispatch** (non-testable Step with a production surface), the coordinator SHALL provide exactly the full text of the Step, the shared rule set (including the Step's plan-level files as the `Allowed files` list), and any technical learnings it deems relevant (per `apply-technical-learnings-memory`). The GREEN worker SHALL execute the Step's implementation body without authoring tests.
- For a **blind RED-worker dispatch**, the coordinator SHALL provide that Step's `interfaces.md` section, the injected testing context, the shared rule set, the blindness rule (never read the GREEN implementation body or production source to derive assertions), the RED phase contract (stubs expose the required symbol with null/empty/wrong values), and the RED verification rule (valid RED / passes / wrong-failure classification). The allowed-file list SHALL contain only plan-authorized test files and explicitly permitted RED/interface stub files; it SHALL exclude production files.
- For a **GREEN-worker dispatch** (split Step), the coordinator SHALL provide exactly the full GREEN implementation body, the shared rule set, the no-test-file-edits rule (absolute prohibition), and the GREEN iteration rule (bounded, confined to non-test files, GREEN-conflict STOP when unpassable). The allowed-file list SHALL contain only plan-authorized production files; it SHALL exclude tests and declared interfaces.
- For a **green-exception RED-worker dispatch** (production-free Step, testable or non-testable), the coordinator SHALL provide that Step's `interfaces.md` section (when a Step Contract is available), the injected testing context, the shared rule set, the blindness rule, the RED phase contract, and the green-exception mandate (author or execute the tests, leave them green, report GREEN = pass, terminal). The allowed-file list SHALL contain only plan-authorized test and stub paths; it SHALL exclude production files.

For all dispatch kinds, the coordinator SHALL inject the exact declared scratch path `.tmp/{change-name}/` using its own change-name argument. The scratch path SHALL be separate from and excluded from the `Allowed files` list. A worker MAY create temporary files only below that path and MAY remove its contents and directory before a clean return. A worker SHALL NOT be required to preserve the path when returning STOP or failure; coordinator cleanup SHALL sweep the path after every dispatch outcome, including non-clean outcomes. A worker SHALL NOT remove the `.tmp/` parent. Scratch paths SHALL NOT be treated as feature outputs or included in the worker report's `Files modified` field.

#### Scenario: GREEN-direct dispatch receives its plan scope and scratch rules
- **WHEN** the coordinator dispatches a non-testable Step through the GREEN-direct path whose plan-level files are `src/a.ts` and `tests/a.test.ts`
- **THEN** the dispatch includes `Allowed files` containing exactly those plan-level files, separately declares `.tmp/{change-name}/` as scratch, and does not include the pre-dispatch baseline or recovery assessment

#### Scenario: Blind RED worker receives only testing paths
- **WHEN** a Split-Routed Step is dispatched to the blind RED worker with plan-authorized test and RED/interface-stub paths plus production paths
- **THEN** the dispatch's `Allowed files` list contains only the authorized test and stub paths, contains no production path, and separately declares `.tmp/{change-name}/` as scratch without exposing the GREEN implementation

#### Scenario: GREEN worker receives only production paths
- **WHEN** a Split-Routed Step is dispatched to the GREEN worker with plan-authorized production, test, and interface paths
- **THEN** the dispatch's `Allowed files` list contains only the authorized production paths, excludes tests and declared interfaces, and separately declares `.tmp/{change-name}/` as scratch

#### Scenario: Green-exception RED worker receives testing paths and green mandate
- **WHEN** a production-free RED Step is dispatched under the green-exception
- **THEN** the dispatch's `Allowed files` list contains only plan-authorized test and stub paths, and the RED worker is instructed to leave the tests green and report GREEN = pass

#### Scenario: Clean dispatch removes its scratch before reporting
- **WHEN** a worker uses `.tmp/{change-name}/` for temporary scaffolding and completes the dispatch without STOP or failure
- **THEN** it may remove the scratch contents and directory before returning, field 8 reports only non-scratch paths, and the coordinator still performs its unconditional backstop sweep

#### Scenario: Non-clean dispatch has no worker preservation obligation
- **WHEN** a worker reaches STOP, fails, or cannot return a normal report after using `.tmp/{change-name}/`
- **THEN** it does not claim the scratch paths in field 8, does not remove the `.tmp/` parent, and leaves cleanup of the declared per-change path to the coordinator's unconditional sweep

#### Scenario: Split-routed dispatches do not share surviving scratch
- **WHEN** a blind RED-worker dispatch returns before the GREEN-worker dispatch of the same Step
- **THEN** the coordinator sweeps the RED worker's exact per-change scratch path before the GREEN-worker dispatch starts, so scratch cannot act as a cross-dispatch communication channel

#### Scenario: Worker does not remove the scratch parent
- **WHEN** a dispatch uses `.tmp/{change-name}/` while `.tmp/` is pre-existing or contains another path
- **THEN** the worker removes or leaves only the exact per-change scratch directory and leaves `.tmp/` for the coordinator's parent-lifecycle decision

#### Scenario: Scratch is not a feature output
- **WHEN** a dispatch creates scratch alongside a production output
- **THEN** `Files modified` contains only the non-scratch feature output and excludes every path below `.tmp/{change-name}/`

### Requirement: RED-carrying Steps route per the decision tree

When the coordinator reaches a Step whose body contains a RED block, the Step SHALL route per the decision tree of `apply-step-routing-tree` — never to a generic single dispatch. Two exceptional RED shapes are recognized (in addition to the split flow, which routes per `apply-test-impl-split`), each with its own routing:

- **Contract-absent**: no `## Step N` contract is available — either `interfaces.md` does not exist, or it exists but has no `## Step N` for the Step's integer. The run STOPS; nothing is dispatched and nothing is written. The previous traced fall-back to a single dispatch is removed.
- **No-production-surface**: the Step's plan-level file scope contains no production file — test-only, interfaces-only, or any other production-free scope. The Step routes to the RED worker under the green-exception, which authors the tests and leaves them green.

A Step that triggers contract absence SHALL halt before any dispatch. A Step that triggers the no-production shape SHALL dispatch the RED worker under the green-exception. Neither shape dispatches a blind RED worker or a GREEN worker; neither shape prints the previous "routing to a single dispatch" trace lines.

#### Scenario: Contract is unavailable for a RED-carrying Step
- **WHEN** the coordinator reaches a Step with a RED block whose `## Step N` contract is unavailable (whole-file or per-Step absence)
- **THEN** the run STOPS and no worker is dispatched for that Step

#### Scenario: File scope holds no production files for a RED-carrying Step
- **WHEN** the coordinator reaches a Step with a RED block whose plan-level file scope contains no production file (test-only, interfaces-only, or any other production-free scope)
- **THEN** it dispatches the RED worker under the green-exception, which authors the tests and leaves them green

#### Scenario: No fall-back trace lines are printed
- **WHEN** a RED-carrying Step routes through either absence shape
- **THEN** no "routing to a single dispatch" trace line is printed; the contract-absent shape halts and the no-production shape dispatches the green-exception RED worker

#### Scenario: Split-eligible Step routes to the two-worker flow
- **WHEN** the coordinator routes a Step to the split flow because all three routing parts hold
- **THEN** it dispatches the blind RED worker first and the GREEN worker second, per the split contract
