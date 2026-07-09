# design-interfaces-artifact Specification

## ADDED Requirements

### Requirement: sai-2-design emits interfaces.md

When `sai/instructions/design.md` generates artifacts for a change, the agent SHALL write a per-change artifact `openspec/changes/{name}/interfaces.md` in addition to `design.md` and `tasks.md`. `interfaces.md` SHALL be a separate file — it SHALL NOT be a section of `tasks.md`, `design.md`, or any other artifact.

The concrete public signatures and exact test assertions that `interfaces.md` carries are the "detailed behavior" that `tasks.md`'s conciseness rule excludes; they SHALL live only in `interfaces.md`, never restated into `tasks.md`.

#### Scenario: interfaces.md written alongside design and tasks
- **WHEN** `sai-2-design` completes generation for a change
- **THEN** `openspec/changes/{name}/interfaces.md` exists as a separate file next to `design.md` and `tasks.md`
- **AND** `tasks.md` still contains only its `## Step N` narrative scaffold with no concrete signatures or exact assertions copied into it

#### Scenario: signatures and assertions are not duplicated into tasks.md
- **WHEN** a step introduces a new public signature and its exact test assertions
- **THEN** that signature and those assertions appear in `interfaces.md` only
- **AND** the corresponding `## Step N` section of `tasks.md` references the spec by path without restating the signature or the assertions

### Requirement: interfaces.md is keyed by Step N to tasks.md

`interfaces.md` SHALL be organized as one `## Step N` section per step, using the same integer `Step N` keying as `tasks.md` and `implementation.md`. Each `## Step N` heading in `interfaces.md` SHALL correspond to the `## Step N` of the same number in `tasks.md`.

`interfaces.md` SHALL be regenerated wholesale on every `sai-2-design` run, alongside `design.md` and `tasks.md`, from the same fresh step decomposition. There is NO cross-run preservation path at the design stage (unlike `implement.md`'s re-run preservation of `implementation.md`), so `interfaces.md` keys always reflect the current `tasks.md` and cannot desync from it across re-runs.

#### Scenario: step keys mirror tasks.md at generation
- **WHEN** `tasks.md` defines steps `## Step 1` through `## Step 4`
- **THEN** `interfaces.md` contains a `## Step N` section for each step that introduces or modifies a public interface, using the same integer keys `1..4`

#### Scenario: interfaces.md regenerated wholesale on re-run
- **WHEN** `sai-2-design` is re-run and produces a new `tasks.md` decomposition
- **THEN** `interfaces.md` is regenerated in full from that same fresh decomposition, so its `## Step N` keys always match the current `tasks.md`
- **AND** no `## Step N` section from a prior `interfaces.md` is preserved across the re-run — there is no design-stage preservation path, so orphaned or desynced step sections cannot arise

### Requirement: Each step lists public signatures and exact test assertions

For every `## Step N` in `interfaces.md`, the section SHALL contain two parts:

1. **Interfaces** — the new or modified public interfaces (signatures) introduced in that step: function/method signatures, exported types, class or module public surface. Signatures only — no implementation body.
2. **Test assertions** — the exact assertions that verify that step, each anchored to a `specs/**/*.md` requirement or scenario by path. Each assertion SHALL be concrete enough to be written as a test (expected input → expected output/behavior), and SHALL cite the spec requirement or scenario it verifies.

A step that introduces neither a new/modified public interface nor a testable assertion SHALL be omitted from `interfaces.md` rather than emitted as an empty section.

#### Scenario: step section carries signatures and anchored assertions
- **WHEN** `## Step N` introduces a new public function
- **THEN** the step's Interfaces part lists that function's signature with no body
- **AND** the step's Test assertions part lists the exact assertions verifying it, each citing the `specs/**/*.md` requirement or scenario path it is derived from

#### Scenario: assertions anchored to specs, not to implementation
- **WHEN** an assertion is written for a step
- **THEN** it references a requirement or scenario in `specs/**/*.md` by path
- **AND** it does NOT reference or restate any implementation detail beyond the public signature

#### Scenario: steps with no interface surface are omitted
- **WHEN** a `## Step N` in `tasks.md` introduces no new/modified public interface and no testable assertion (e.g. a pure config or scaffolding step)
- **THEN** `interfaces.md` omits that step entirely rather than emitting an empty `## Step N` section

### Requirement: interfaces.md is consumable without the implementation

`interfaces.md` SHALL be self-contained enough that a reader who sees the signatures and the anchored assertions — but NOT the implementation body — has sufficient information to author the tests for each step. The artifact SHALL NOT depend on reading `implementation.md`, `design.md` decisions, or source code to interpret its assertions.

#### Scenario: test author needs only interfaces.md and specs
- **WHEN** a reader has `interfaces.md` and the `specs/**/*.md` it anchors to, but not the implementation body
- **THEN** every `## Step N` provides the signature under test and the exact assertions to write, with no gap that forces reading the implementation

### Requirement: Testing Strategy and exact assertions have a clear split

`tasks.md`'s per-step `**Testing Strategy**` field and `interfaces.md`'s per-step Test assertions cover testing at two different altitudes, and the split SHALL be explicit so no reader faces two competing sources of truth. `tasks.md`'s `**Testing Strategy**` SHALL remain high-level prose describing the testing *approach* for the step (what kind of test, what surface it exercises). `interfaces.md` SHALL hold the *concrete, exact assertions* (expected input → expected output/behavior) for the step. The exact assertions SHALL NOT be restated into `tasks.md`, and the high-level approach prose SHALL NOT be the authoritative source for assertion values.

#### Scenario: approach in tasks.md, assertions in interfaces.md
- **WHEN** a step is verified by a test
- **THEN** `tasks.md`'s `**Testing Strategy**` for that step describes the approach in prose (e.g. "unit test the parser against malformed input")
- **AND** `interfaces.md`'s Test assertions for the same step list the concrete assertions (exact expected values), anchored to `specs/**/*.md`
- **AND** the exact assertion values appear in `interfaces.md` only, not in `tasks.md`

### Requirement: interfaces.md does not duplicate the testing stack

`interfaces.md` SHALL NOT contain a testing-setup, stack, or testing-context section. The testing stack (framework, versions, test-run conventions) SHALL remain single-sourced in `tasks.md`'s `## Implementation Context`. `interfaces.md` describes WHAT to assert, not the stack used to run the assertions.

#### Scenario: no testing-stack section in interfaces.md
- **WHEN** `sai-2-design` generates `interfaces.md`
- **THEN** the file contains no `## Implementation Context`, testing-setup, or stack section
- **AND** the testing stack remains described only in `tasks.md`'s `## Implementation Context`

### Requirement: interfaces artifact registered but excluded from apply.requires

`openspec/schemas/sai-workflow/schema.yaml` SHALL register an `interfaces` artifact with `id: interfaces`, `generates: interfaces.md`, and `requires: [tasks]`. The `generates` field is mandatory so `openspec` tooling can resolve the artifact to its filename. The `interfaces` artifact SHALL NOT appear in the schema's `apply.requires` list, because no stage consumes it in this slice. `apply.requires` SHALL remain `[tasks, implementation]`.

#### Scenario: interfaces registered in the artifact graph
- **WHEN** the sai-workflow schema is read
- **THEN** it contains an artifact entry with `id: interfaces`, `generates: interfaces.md`, and `requires: [tasks]`

#### Scenario: apply is not gated on interfaces.md
- **WHEN** the schema's `apply.requires` is read
- **THEN** it lists `tasks` and `implementation` only, and does NOT list `interfaces`

### Requirement: No stage consumes interfaces.md in this slice

This slice SHALL NOT wire any consumer to `interfaces.md`. `sai/instructions/implement.md` (`sai-3-implement`) and `sai/instructions/apply.md` (`sai-4-apply`) SHALL be unchanged with respect to reading or acting on `interfaces.md`.

#### Scenario: implement and apply unchanged
- **WHEN** `sai-3-implement` or `sai-4-apply` runs after `interfaces.md` exists
- **THEN** neither reads nor depends on `interfaces.md`; their behavior is identical to before this change
