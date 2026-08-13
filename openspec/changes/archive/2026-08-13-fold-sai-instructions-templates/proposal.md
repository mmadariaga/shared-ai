**Complexity**: high

## Why

The `sai/instructions/` tree duplicates the command grouping already present under `sai/commands/`, forcing maintainers to discover command behavior and its instruction/template dependencies in separate top-level locations. Co-locating command-owned instructions and templates makes each command self-contained while preserving the two shared/canonical surfaces and updating the fetch contract atomically.

## What Changes

- **BREAKING** Move each command-owned instruction from `sai/instructions/` into its command directory and remove the former instruction tree; commands with multiple instruction files use distinct neighboring destinations.
- Move command-owned output templates into their command directories as `{artifact}.template.md` files.
- Move the shared `change-overview.md` instruction to the `sai/` root and move the canonical ADR/DDR index templates to `sai/adr-index.template.md` and `sai/ddr-index.template.md`.
- Update every maintained fetch directive, installer projection, documentation surface, ADR/spec contract, and literal-string test to the new paths in one atomic change.
- Preserve instruction content, template content, generated artifact contracts, harness parity, and historical records unless a path reference is an active contract that must be updated.

## Capabilities

### New Capabilities

- `instructions-fold`: Co-locate command instructions and command-owned templates, retain shared/canonical exceptions at their designated `sai/` locations, and remove the obsolete top-level instruction tree.

### Modified Capabilities

- `wrapper-fetch-paths`: Replace the `@sai/instructions/` instruction namespace with command-local and root-level fetch paths while preserving namespace disambiguation and both harnesses.
- `docs-sync`: Update maintained documentation and ADR/spec references to the folded source layout and ensure no active fetch contract points at the removed paths.
- `instruction-output-templates`: Move the existing six output-template contracts and two index-template contracts to their folded destinations while retaining content and parity rules.
- `orchestration-source-layout`: Replace the maintained source-layout inventory and recursive projection contract with the folded command-local and root-exception layout.
- `artifact-only-scope`: Keep the proposal/spec phase limited to the change artifact directory and permitted glossary metadata; the folded source changes belong to the later implementation phase.

## Impact

- `sai/commands/` command cards and co-located instruction/template files.
- `sai/change-overview.md`, `sai/adr-index.template.md`, and `sai/ddr-index.template.md`.
- `sai/install-manifest.json` and both harness projections.
- `docs/adr/0003-fetch-path-convention-commands-sai.md` and maintained ADR indexes.
- `openspec/specs/wrapper-fetch-paths/spec.md` and `openspec/specs/docs-sync/spec.md`.
- Literal-path tests covering coordinator/worker invocation, fetch resolution, template parity, index parity, and installation projections.
- `AGENTS.md`, `README.md`, `INSTALL.claude.md`, `INSTALL.opencode.md`, and `sai/SAI_AGENTS.md`.

## Proposal Research Documentation

**Local files**: `sai/instructions/spec.propose.md`; `sai/instructions/change-overview.md`; `sai/instructions/_templates/*`; `sai/commands/`; `sai/install-manifest.json`; `docs/adr/0003-fetch-path-convention-commands-sai.md`; `docs/adr/0004-source-layout-and-install-path-restructure.md`; `openspec/specs/wrapper-fetch-paths/spec.md`; `openspec/specs/docs-sync/spec.md`; `openspec/specs/instruction-output-templates/spec.md`; `openspec/specs/adr-index-maintenance/spec.md`; `test/spec-coordinator-worker.test.js`; `test/install-manifest.test.js`; `test/report-template-parity.test.js`; `test/index-template-parity.test.js`; `test/doctor-fetch-resolution.test.js`; `AGENTS.md`; `README.md`.

**External URLs**: None.

## Additional Notes

- `sai/instructions/spec.propose.md` is the representative 1:1 move to `sai/commands/spec/instructions.md`.
- The archive command is the explicit multi-instruction exception: `sai/instructions/archive.md` moves to `sai/commands/archive/instructions.md`, while `sai/instructions/archive-commit-gate.md` moves to `sai/commands/archive/archive-commit-gate.instructions.md`; both fetches remain ordered and distinct.
- `sai/instructions/change-overview.md` is shared and therefore moves to the `sai/` root rather than a command directory.
- Command-owned templates use the neighboring `.template.md` suffix; ADR/DDR index templates have no command owner and remain at the `sai/` root.
- The change is intentionally spec-only at this phase: no implementation source, configuration, installer code, or tests are modified until the proposal and specs are approved.
