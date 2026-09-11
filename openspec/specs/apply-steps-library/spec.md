# apply-steps-library Specification

## Purpose
TBD - created by archiving change apply-routing-steps-decomposition. Update Purpose after archive.
## Requirements
### Requirement: Step instruction files exist per routing mode and terminal phase

The apply command SHALL provide a step instruction library under `sai/commands/apply/steps/` containing one instruction file per routing decision mode and one for the terminal phase: `routing-green-direct.md`, `routing-green-exception-test-only.md`, `routing-stop-missing-contract.md`, `routing-split-flow.md`, `routing-green-exception-no-production.md`, and `terminal-lifecycle.md`. The routing files contain the five exclusive step routing conditions from the original decision tree; the terminal file contains the final sweep, learnings promotion, terminal documentation evaluation, visibility, authorization, and commit behaviors.

#### Scenario: Routing files are named by mode
- **WHEN** a consumer inspects `sai/commands/apply/steps/` for a routing mode
- **THEN** an instruction file named `routing-{mode}.md` exists in that directory.

#### Scenario: Terminal file contains the terminal phase
- **WHEN** a consumer looks for apply's terminal lifecycle (final sweep, promotion, documentation evaluation, visibility, authorization, commit)
- **THEN** it is found in `sai/commands/apply/steps/terminal-lifecycle.md`.

### Requirement: Routing decisions remain exhaustive and exclusive

The five routing files SHALL preserve the five exclusive routing conditions and outcomes verbatim from the original decision tree: each Step routes to exactly one of GREEN direct, RED green-exception (test-only), STOP (missing contract), split-flow (RED to GREEN), or RED green-exception (production-free). The condition-to-file mapping in `runner.md` SHALL remain a closed table with no fall-back to a default dispatch.

#### Scenario: Routing table maps conditions to files
- **WHEN** the coordinator selects a routing mode
- **THEN** the routing table in `runner.md` directs it to the corresponding step file with the exact condition preserved.

#### Scenario: All five modes are covered
- **WHEN** a Step's RED block, production files, and contract availability are evaluated
- **THEN** exactly one routing file applies, and every combination of those three properties routes to exactly one file.

### Requirement: Terminal lifecycle behaviors are preserved

The terminal-lifecycle file SHALL preserve the complete sequence and logic of apply's coordinator-owned terminal phase: the Final sweep (checkbox verification), exactly one learnings promotion pass (per-run), terminal documentation-set evaluation (eligible set: changed `docs/**`, root `SAI_LEARNINGS.md` if written by promotion, changed `GLOSSARY.md`), visibility listing, authorization gate, exact-path staging (no `git add -A`), and commit, in that order. A run that halts before the Final sweep SHALL perform neither promotion nor terminal evaluation.

#### Scenario: Sweep, promotion, and documentation occur in order
- **WHEN** all Steps complete and verification gates pass
- **THEN** the coordinator performs the Final sweep first, then one learnings promotion pass, then terminal documentation evaluation and visibility listing, with authorization and commit following only if the set is non-empty.

#### Scenario: Terminal paths remain distinct from implementation paths
- **WHEN** the terminal documentation set is evaluated
- **THEN** only changed `docs/**`, root `SAI_LEARNINGS.md` (if promotion wrote it), and changed `GLOSSARY.md` are eligible; `openspec/changes/**` and `implementation.md` remain excluded.

