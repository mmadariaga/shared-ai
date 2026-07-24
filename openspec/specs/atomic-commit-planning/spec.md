## ADDED Requirements

### Requirement: Buildable commit boundaries

Every step in `tasks.md` MUST represent a state where the repository compiles, typechecks, and builds successfully. No step SHALL be planned as a commit point if it would leave the repository in a state where a full typecheck or build fails.

#### Scenario: Step passes full typecheck and build

- **WHEN** a step is designated as a commit point in `tasks.md`
- **THEN** the set of files listed under "Files Affected" for that step, combined with all previously committed files, SHALL constitute a codebase that compiles and typechecks without errors

#### Scenario: Step cannot be verified as buildable

- **WHEN** the full typecheck or build cannot be confirmed to pass at a given step boundary
- **THEN** that step SHALL NOT be designated as a commit point; it MUST be merged with subsequent steps until a buildable boundary is reached

### Requirement: Atomic grouping of contract-breaking changes

When a step changes a function signature, removes an exported symbol, renames a public API, or alters any contract that other files depend on, the step MUST include all files that reference that contract — callers, consumers, and re-exporters — in the same "Files Affected" list.

Such a change SHALL NOT be planned as a standalone step that relies on a later step to fix broken references.

#### Scenario: Signature change with callers

- **WHEN** a step modifies a function signature (parameter types, return type, parameter count)
- **THEN** the same step MUST list every file that calls or imports that function under "Files Affected"
- **AND** the resulting snapshot MUST typecheck without errors

#### Scenario: Export removal

- **WHEN** a step removes an exported symbol (function, class, type, constant)
- **THEN** every file that imports that symbol MUST either be updated to remove the import or switch to a replacement in the same step

#### Scenario: API rename

- **WHEN** a step renames a public API or module path
- **THEN** all consumers of the old name MUST be migrated to the new name within the same step

### Requirement: No reliance on lint as a build proxy

Lint tools (e.g. Biome, ESLint) SHALL NOT be treated as sufficient evidence that a commit boundary is safe. Lint operates per-file and does not typecheck cross-file references.

A commit boundary is only valid if a full typecheck and build would pass against the exact file snapshot being committed.

#### Scenario: Lint passes but typecheck would fail

- **WHEN** lint passes on the files in a planned step
- **BUT** a cross-file type error exists (e.g. a caller passes arguments that no longer match an updated signature)
- **THEN** that step SHALL NOT be a commit point; it MUST be merged with the steps that resolve the type error

### Requirement: Commit boundary verification checklist

Before finalizing any step as a commit point in `tasks.md`, the sai-2-design agent SHALL verify all of the following against the planned file snapshot:

- No calls to functions with outdated signatures
- No imports of removed or renamed symbols
- No references to APIs that have been relocated or deleted
- No missing implementations of interfaces or abstract contracts introduced in this or a prior step in the same batch
- No test compilation unit left uncompilable — test projects, test assemblies, and test source sets are subject to every item above exactly as production code is

The checklist SHALL reason over **all** compilation units in the repository snapshot, not production code alone. A step that changes a signature, removes an exported symbol, or renames a public API SHALL treat existing test files that reference that contract as affected files, on the same terms as production callers. Such test files SHALL be listed under the step's `**Files Affected**`.

A step whose snapshot leaves any test compilation unit unbuildable SHALL NOT be designated a commit boundary, even when all production code compiles.

A commit boundary SHALL NOT leave the test suite failing. Both failure modes a step introduces — tests that no longer **compile** and tests that compile but whose **assertions** no longer hold — SHALL be resolved within the same step. The checklist item above is the structural half of that obligation; the assertion half is not weaker, merely not expressible as a compilation check.

The `compile` / `runtime` distinction declared per step by the `tasks-existing-test-impact` capability is therefore NOT a boundary-validity discriminator: both modes block the boundary until resolved. The distinction carries **effort and ordering** information for the implementation phase — structural breakage is mechanical and bulk-fixable, assertion breakage requires per-test judgment — and SHALL NOT be read as licensing a commit with a red suite.

#### Scenario: Checklist passes

- **WHEN** all checklist items are satisfied for a given step's file snapshot, including every test compilation unit
- **THEN** the step MAY be designated as a commit point

#### Scenario: Checklist fails on any item

- **WHEN** any checklist item fails
- **THEN** the step MUST be expanded or merged with adjacent steps until the checklist passes for the combined snapshot

#### Scenario: Production compiles but test project does not

- **WHEN** a step changes a function signature and all production callers are updated within that step
- **BUT** existing test files still call the old signature and would fail to compile
- **THEN** the step SHALL NOT be designated a commit boundary
- **AND** those test files MUST be listed under the step's `**Files Affected**` and updated within the same step

#### Scenario: Test assertions break but tests still compile

- **WHEN** a step changes behavior such that existing tests compile but their assertions no longer hold
- **THEN** the step is NOT a valid commit boundary until those assertions are updated within the same step
- **AND** the affected tests are declared with failure mode `runtime`, which records the effort involved and does NOT exempt them from the boundary

#### Scenario: Removed export referenced only by tests

- **WHEN** a step removes an exported symbol that no production file imports but existing test files do
- **THEN** those test files are treated as affected files exactly as production callers would be
- **AND** the step is not a valid commit boundary until they are updated within it
