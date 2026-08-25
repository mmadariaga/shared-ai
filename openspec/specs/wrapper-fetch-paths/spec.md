## Purpose

Define the standard fetch path patterns for sai command wrappers and instructions, and document the namespace distinction between `@sai/commands/` and `@commands/` paths.
## Requirements
### Requirement: wrapper-sai-commands-fetch-path
All 15 thin `sai-*` wrapper files at `commands/claude/` and `commands/opencode/` that fetch a sai command card SHALL use `Fetch @sai/commands/{name}/command-bootstrap.md`. The flat path `@sai/commands/<name>.md` and the legacy namespace `@commands/sai/` SHALL NOT appear in any wrapper file. This requirement covers only `sai-*.md` files; `budget.md` is out of scope (it fetches no sai command card and SHALL remain byte-identical per `command-wrapper-body`'s `wrapper-directory-shape-unchanged`).

#### Scenario: claude wrapper fetch path updated
- **WHEN** any file matching `commands/claude/sai-*.md` is read
- **THEN** any Fetch directive pointing to a sai command card SHALL use the pattern `Fetch @sai/commands/{name}/command-bootstrap.md`

#### Scenario: opencode wrapper fetch path updated
- **WHEN** any file matching `commands/opencode/sai-*.md` is read
- **THEN** any Fetch directive pointing to a sai command card SHALL use the pattern `Fetch @sai/commands/{name}/command-bootstrap.md`

#### Scenario: old fetch path absent
- **WHEN** a grep for `@commands/sai/` is run across all wrapper files
- **THEN** zero matches SHALL be found

#### Scenario: flat body path absent
- **WHEN** a grep for `@sai/commands/<name>.md` (a sai-commands fetch not ending in `/command-bootstrap.md`) is run across all wrapper files
- **THEN** zero matches SHALL be found

### Requirement: command-body-instruction-fetch-paths

All maintained SAI command cards that load command-owned instructions SHALL use `Fetch @sai/commands/<name>/instructions.md`, and cards that load command-owned templates SHALL use the matching neighboring `Fetch @sai/commands/<name>/<artifact>.template.md` path. Shared and canonical exceptions SHALL use `Fetch @sai/change-overview.md`, `Fetch @sai/adr-index.template.md`, or `Fetch @sai/ddr-index.template.md` as applicable. The obsolete `@sai/instructions/` namespace SHALL NOT appear in active command cards, invocation cores, or maintained instruction/template fetch directives.
When a command has additional instruction files, each additional file SHALL use its own distinct neighboring `@sai/commands/<name>/<secondary>.instructions.md` path; the archive secondary instruction SHALL use `@sai/commands/archive/archive-commit-gate.instructions.md` and SHALL be fetched after the primary archive instruction.

#### Scenario: archive invocation preserves ordered multi-instruction fetches

- **WHEN** the archive command card loads its instructions
- **THEN** it fetches `@sai/commands/archive/instructions.md` followed by `@sai/commands/archive/archive-commit-gate.instructions.md`, with neither path colliding with the other

#### Scenario: command-local template fetches use neighbors

- **WHEN** an implementation or audit command card loads its output template
- **THEN** it uses the owning command's `.template.md` neighbor and never `@sai/instructions/_templates/`

#### Scenario: root exceptions use root paths

- **WHEN** a maintained caller loads `change-overview.md`, an ADR index template, or a DDR index template
- **THEN** it uses the corresponding `@sai/` root path and no `@sai/instructions/` alias

### Requirement: non-sai-wrapper-fetch-paths-unchanged
Wrapper files that do not fetch SAI command cards SHALL remain unchanged by this capability; the folded instruction-path update SHALL apply only to active SAI command cards and their maintained callers.

#### Scenario: unrelated wrapper remains untouched

- **WHEN** a non-SAI wrapper is compared with its pre-fold content
- **THEN** it is identical, while SAI wrapper fetches continue to use the existing `@sai/commands/<name>.md` command-card namespace

### Requirement: folded-path-resolution-is-harness-neutral

Claude Code and opencode SHALL resolve the folded `@sai/commands/` and `@sai/` paths through their existing harness-specific fetch roots, preserving the distinction between `@sai/commands/...` and `@commands/...` namespaces. The path contract SHALL be documented in both harness fetch mechanisms and represented in their projection tests.

#### Scenario: Claude resolves a folded command instruction

- **WHEN** Claude Code resolves `@sai/commands/spec/steps/common.md`
- **THEN** it reads the installed Claude `sai/commands/spec/steps/common.md` projection

#### Scenario: opencode resolves a folded root template

- **WHEN** opencode resolves `@sai/adr-index.template.md`
- **THEN** it reads the installed opencode `sai/adr-index.template.md` projection and not an unnamespaced command-root file

### Requirement: The fetch skill SHALL explicitly document that `@sai/commands/` and `@commands/` are different namespaces

The disambiguation MUST be present in both the Claude and opencode variants of the fetch skill, with platform-appropriate path prefixes.

#### Scenario: Agent resolves @sai/commands/ path in opencode context
- **WHEN** the opencode fetch skill encounters `@sai/commands/X.md`
- **THEN** it SHALL resolve to `~/.config/opencode/sai/commands/X.md`, not `~/.config/opencode/commands/X.md`
