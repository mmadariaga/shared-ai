## ADDED Requirements

### Requirement: Step 5 SHALL preserve a prior `implementation.md` on re-run instead of regenerating it from `<plan_template>`

When `openspec/changes/{change-name}/implementation.md` already exists at the start of `/sai-3-implement` (i.e. Step 1 ran and the applied-steps set is non-empty), Step 5 of `sai/instructions/implement.md` SHALL build its output by preserving the prior file rather than generating a fresh plan from `<plan_template>`. The `<plan_template>` generation path applies ONLY on a first run.

#### Scenario: re-run preserves rather than regenerates

- **WHEN** `implementation.md` exists and Step 1 collapsed at least one step to `*(already applied)*`
- **THEN** Step 5 produces its output by preserving the prior file's existing steps and appending to it
- **AND** Step 5 does NOT regenerate the existing steps from `<plan_template>`

#### Scenario: first run still generates from template

- **WHEN** no `implementation.md` exists before `/sai-3-implement` runs
- **THEN** Step 5 generates the full plan from `<plan_template>` exactly as before, with no preservation behavior applied

### Requirement: Compacted `*(already applied)*` steps SHALL be preserved byte-for-byte

On re-run, every step Step 1 collapsed to a heading followed by `*(already applied)*` SHALL be copied into the new `implementation.md` byte-for-byte, including the exact marker line. Step 5 MUST NOT rewrite, re-expand, re-word, re-number, or re-order a compacted step, and MUST NOT add commit references or timestamps to the marker.

#### Scenario: collapsed heading copied verbatim

- **WHEN** a prior step appears as its heading line followed by `*(already applied)*`
- **THEN** that heading and marker line appear unchanged in the regenerated `implementation.md`
- **AND** no code blocks, checklists, commit refs, or timestamps are added to it

#### Scenario: compacted step is never re-opened

- **WHEN** Step 5 processes the prior file
- **THEN** no step already collapsed to `*(already applied)*` is expanded back into code blocks or checklists

### Requirement: Audit-derived steps SHALL be appended after the last existing step

For each audit artifact that exists in `openspec/changes/{change-name}/` (`review.md`, `security.md`, `performance.md`, `accessibility.md`), Step 5 SHALL append exactly one new step at the end of `implementation.md`, numbered strictly after the highest existing `#### Step N:` number found in the prior file. Each appended step is dedicated to a single artifact and MUST NOT be merged into an existing step.

#### Scenario: one appended step per existing audit artifact

- **WHEN** `review.md` and `security.md` exist and the prior file's highest step number is 6
- **THEN** Step 5 appends `#### Step 7: Address review findings` and `#### Step 8: Address security findings` at the end
- **AND** no audit findings are merged into the preserved steps

#### Scenario: numbering follows the last existing step despite orphans

- **WHEN** the prior file contains out-of-order or orphan step headings whose highest number is N
- **THEN** the first appended audit step is numbered N+1

#### Scenario: no audit artifacts means no appended steps

- **WHEN** none of `review.md`, `security.md`, `performance.md`, `accessibility.md` exist
- **THEN** Step 5 appends no audit-derived steps and preserves the prior file as-is

### Requirement: Review findings naming a compacted step SHALL become new appended steps, not re-openings

When an audit artifact's finding references an already-compacted step, Step 5 SHALL address it as a new step at the end of `implementation.md` that references the original step number in its text. Step 5 SHALL NOT re-open or modify the compacted step the finding names.

#### Scenario: finding against an applied step is appended

- **WHEN** `review.md` reports a problem with `Step 3`, which Step 1 already collapsed to `*(already applied)*`
- **THEN** Step 5 adds a new step at the end whose text references Step 3
- **AND** the original Step 3 remains `*(already applied)*`, unchanged

### Requirement: `tasks.md` drift SHALL NOT alter preserved steps

Differences between `tasks.md` and the prior `implementation.md` are out of scope for Step 5's re-run behavior. Orphan headings in `implementation.md` (steps no longer present in `tasks.md`) SHALL be preserved as-is — never deleted, renamed, or remapped to current `tasks.md` steps.

#### Scenario: orphan step preserved

- **WHEN** the prior `implementation.md` contains a step that no longer corresponds to any `tasks.md` step
- **THEN** that step is preserved unchanged in the regenerated file, not deleted or remapped
