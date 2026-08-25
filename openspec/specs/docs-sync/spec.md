## ADDED Requirements

### Requirement: agents-md-structure-table
`AGENTS.md` structure table SHALL list `sai/commands/` (command cards carrying command-local `instructions.md` and co-located `.template.md` files), the root exceptions `sai/change-overview.md`, `sai/adr-index.template.md`, and `sai/ddr-index.template.md`, `commands/claude/`, `commands/opencode/`, and `configs/` as the canonical source-layout names. The structure table SHALL NOT list a maintained `sai/instructions/` tree. All previous path references (`commands/sai/`, `instructions/sai/`, `claude/commands/`, `opencode/commands/`, `opencode/opencode.jsonc`) SHALL be replaced with their new equivalents.

#### Scenario: structure table reflects the folded layout
- **WHEN** `AGENTS.md` is read
- **THEN** the structure table SHALL NOT contain `sai/instructions/`, `commands/sai/`, `instructions/sai/`, `claude/commands/`, `opencode/commands/`, or `opencode/opencode.jsonc` as directory/file names

#### Scenario: folded paths present in table
- **WHEN** `AGENTS.md` is read
- **THEN** the structure table SHALL contain entries for `sai/commands/`, the command-local instruction/template pattern, the three root exceptions (`sai/change-overview.md`, `sai/adr-index.template.md`, `sai/ddr-index.template.md`), `commands/claude/`, `commands/opencode/`, and `configs/`

### Requirement: agents-md-fetch-convention-section

The maintained fetch-convention documentation in `AGENTS.md`, `README.md`, installation guides, and `sai/SAI_AGENTS.md` SHALL describe `@sai/commands/{name}/instructions.md` for command-owned instructions, neighboring command `.template.md` paths for command-owned templates, and the `@sai/` root paths for shared/canonical exceptions. Active references to `@sai/instructions/` for moved content SHALL be removed. Historical ADR/change records MAY retain their original references when they are explicitly historical.

#### Scenario: maintained documentation shows folded paths

- **WHEN** a maintainer reads the maintained source-layout or fetch-convention documentation
- **THEN** it identifies command-local instruction/template paths and the root exception paths, with no active moved-content reference to `@sai/instructions/`

#### Scenario: historical references remain traceable

- **WHEN** an archived ADR or archived change record contains the former instruction path
- **THEN** the record is not rewritten solely to erase history, provided active documentation and runtime contracts use the folded paths

### Requirement: adr-0003-amended

`docs/adr/0003-fetch-path-convention-commands-sai.md` SHALL be amended to state that `@sai/commands/<name>.md` remains the canonical command-card fetch path and that command-owned instructions/templates now use the folded `@sai/commands/<name>/...` paths, while `@sai/change-overview.md` and the root index template paths document the shared/canonical exceptions. The original decision history SHALL remain traceable in an amendment section.

#### Scenario: ADR 0003 records the folded decision

- **WHEN** ADR 0003 is read after the fold
- **THEN** its current Decision/Rationale sections describe the command-card and folded instruction/template namespaces, and its historical pre-fold convention remains documented

### Requirement: literal-contract-tests-are-updated

Maintained literal-string tests that assert instruction, template, index, fetch-resolution, installation, or coordinator/worker paths SHALL be updated atomically to the folded paths, while preserving their existing ordering, single-fetch, byte-equivalence, parity, and missing-target assertions.

#### Scenario: coordinator worker test asserts current load order

- **WHEN** `test/spec-coordinator-worker.test.js` checks the spec invocation load order
- **THEN** it asserts the current load order and that neither `@sai/instructions/spec.propose.md` nor `@sai/commands/spec/instructions.md` is referenced or exists

#### Scenario: archive literal paths cover both instruction files

- **WHEN** the archive command fetch-path assertions are read
- **THEN** they assert the ordered pair `@sai/commands/archive/instructions.md` and `@sai/commands/archive/archive-commit-gate.instructions.md`, with no stale archive instruction paths

#### Scenario: installation and parity tests assert folded destinations

- **WHEN** installation, fetch-resolution, report-template, or index-template tests run
- **THEN** they inspect the folded source/projection paths and preserve the existing two-harness and content-parity guarantees

### Requirement: no-dangling-maintained-paths

The folded migration SHALL leave no dangling active fetch, documentation, manifest, or test reference to a removed `sai/instructions/` file or `_templates/` path. A repository-wide active-reference check SHALL distinguish historical archived records from maintained runtime and contract surfaces.

#### Scenario: active reference scan is clean

- **WHEN** maintained sources, tests, specifications, and installation guidance are scanned after the migration
- **THEN** every non-historical folded path resolves to an existing file and no removed instruction/template path is referenced as active

## MODIFIED Requirements

## REMOVED Requirements
