# sai-agents-index-document Specification

## Purpose
TBD

## Requirements

### Requirement: Single canonical source
The SAI_AGENTS.md orientation index exists at exactly one canonical repository location: `sai/SAI_AGENTS.md`. Exactly one manifest projection — id `sai-agents-index` — installs an orientation index, sourcing `sai/SAI_AGENTS.md` with destination path `SAI_AGENTS.md`; this uniqueness is decidable against `sai/install-manifest.json`.

#### Scenario: Manifest shows exactly one install source
- **WHEN** `sai/install-manifest.json` is inspected for projections that install an orientation index
- **THEN** exactly one such projection exists, with id `sai-agents-index`, source `sai/SAI_AGENTS.md`, and destination path `SAI_AGENTS.md`

### Requirement: One entry per SAI documentation surface
The orientation index contains exactly one entry for each of the four SAI documentation surfaces: `GLOSSARY.md`, `SAI_LEARNINGS.md`, the ADR index, and the DDR index. Each entry states the artifact's canonical location, its purpose, the pipeline phase that writes it, and a pointer to the artifact's canonical format file.

#### Scenario: All four surfaces indexed
- **WHEN** the orientation index is read
- **THEN** it contains one entry for `GLOSSARY.md`, one for `SAI_LEARNINGS.md`, one for the ADR index, and one for the DDR index, each carrying the canonical location, purpose, writer, and a pointer to the canonical format file

#### Scenario: Per-family indexes stay distinct
- **WHEN** the ADR and DDR entries are compared
- **THEN** they are separate entries, each pointing at its own family's index location (`docs/adr/0000-INDEX.md` and `docs/ddr/0000-INDEX.md`) and its own family's template

#### Scenario: Entry points at the canonical format file
- **WHEN** an agent follows an entry's format pointer from the installed index
- **THEN** the pointer is a path relative to the installed location that resolves to the artifact's canonical format file with a plain file open and no fetch resolver, never an inline restatement of the format

#### Scenario: Source-copy pointers are installed-relative
- **WHEN** the repository source file `sai/SAI_AGENTS.md` is read at its source location
- **THEN** its pointers are the same installed-relative strings as the installed copy, which are expected not to resolve from the source path — the source path is not the resolution context

#### Scenario: Content test pins the surface set
- **WHEN** the repository test suite runs
- **THEN** a content test asserts the orientation index contains exactly one entry for each of the four surfaces and no entry for any other artifact, and that every format pointer resolves against a simulated install layout — the source file placed at a harness root with the `sai/` tree as its sibling — never against the test's own directory

### Requirement: Conditional-presence wording
Each entry describes what the artifact is and what its presence means using conditional-presence wording of the form "if this file exists, it means ...". No entry implies that the artifact must exist in every project, and the absence of an artifact is never described as an error.

#### Scenario: Per-project absence is not an error
- **WHEN** a project has no `GLOSSARY.md` or no `SAI_LEARNINGS.md`
- **THEN** the orientation index still reads coherently, describing each artifact conditionally without requiring its presence

### Requirement: No normative rules restated
The orientation index contains no normative rule from the canonical format policies. An entry may state what the artifact is for in at most one sentence — the budget covers the purpose statement only, and the entry's conditional-presence clause (per the conditional-presence wording requirement) is separate and does not count against it; an entry may never state file structure, section order, ordering behavior, or append/supersede behavior. The governing criterion: a change to any canonical format policy requires no change to the orientation index.

#### Scenario: Format rule lives only in the policy file
- **WHEN** a canonical format policy changes a rule
- **THEN** no change to the orientation index is required, because the index never restated the rule

### Requirement: Harness-neutral content
The orientation index names no harness and uses no resolver-dependent notation: every format pointer is a relative path resolvable by a plain file reader, never fetch-style `@` syntax. The identical file serves every supported harness without variation.

#### Scenario: Single file serves both installs
- **WHEN** the orientation index is installed on either supported harness
- **THEN** the identical file content is installed, because the file names no harness and references no harness-specific path

#### Scenario: Ambient agent resolves every pointer
- **WHEN** an ambient agent that has loaded no fetch resolver reads the installed index
- **THEN** every format pointer opens the referenced file with a plain file read, because the pointers are relative to the index's own directory

#### Scenario: Content test asserts harness neutrality
- **WHEN** the repository test suite runs
- **THEN** a content test asserts the orientation index names no harness
