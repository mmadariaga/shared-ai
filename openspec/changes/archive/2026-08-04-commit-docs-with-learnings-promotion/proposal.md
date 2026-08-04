**Complexity**: medium (1 capability, 6 requirements, 2 primary implementation paths)

## Why

The terminal commit proposed by `/sai-4-apply` currently stages only `SAI_LEARNINGS.md`, leaving ADRs and the ADR index written under `docs/` without an apply commit. It also makes the commit conditional on a qualifying learning promotion, so documentation-only runs can leave generated docs behind and force manual cleanup.

## What Changes

- Reframe the terminal commit as the run's documentation commit, with promoted learnings as one possible contributor.
- Stage only `docs/**` and `SAI_LEARNINGS.md` under the same authorization gate; never stage OpenSpec change artifacts or sweep the whole working tree.
- Trigger the terminal commit when `docs/**` has working-tree changes or the promotion pass wrote `SAI_LEARNINGS.md`, even when no learning was promoted.
- Print a terminal file visibility listing before proposing this commit.
- Keep per-Step commits field-8-only, and preserve the promotion pass ordering, classification, bootstrap, and halted-run rules.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `sai-learnings-promotion`: widen and independently trigger the terminal documentation commit while preserving the existing promotion behavior and per-Step staging boundary.

## Impact

- `sai/instructions/apply.md`: update the learnings-promotion commit gate, add the sibling terminal documentation commit subsection, and adapt the terminal pre-commit disclosure.
- `openspec/specs/sai-learnings-promotion/spec.md`: revise the commit, visibility-report, and add-list requirements for the widened terminal commit.
- `docs/**`: existing ADR and ADR-index outputs become eligible for the terminal documentation commit; no docs content is changed by this proposal.
- `SAI_LEARNINGS.md`: remains the root promotion artifact and is committed together with eligible docs when the terminal gate fires.

## Proposal Research Documentation

**Local files**:

- `sai/instructions/apply.md` — learnings promotion, pre-commit visibility, and STOP & COMMIT workflow
- `openspec/specs/sai-learnings-promotion/spec.md` — current promotion requirements
- `openspec/specs/adr-index-maintenance/spec.md` — ADR and index creation timing and paths
- `sai/policies/commit-rules.md` — commit classification and authorization constraints
- `sai/policies/sai-learnings-format.md` — promotion artifact format and supersede rules
- `openspec/specs/apply/spec.md` — coordinator and commit-gate behavior
- `openspec/specs/commit-auth-gate/spec.md` — native authorization semantics
- `GLOSSARY.md` — repository terminology

**External URLs**: None.

## Additional Notes

- The terminal commit must not include `openspec/changes/{change-name}/`, including `implementation.md`.
- Per-Step commits continue to stage exactly the paths supplied by the relevant subagent report field 8.
- A run that halts before the Final sweep still performs no promotion or terminal documentation commit.
- The terminal gate must make repo-wide `docs/**` changes visible before authorization so unrelated in-flight documentation changes are not hidden.
- The delta deliberately removes the two stale promotion-commit requirement names and adds correctly named terminal-documentation requirements, avoiding a permanently contradictory merged base spec. The existing promotion-gate requirement remains MODIFIED because its independent authorization behavior still applies to the widened terminal commit.
- Terminal eligibility is intentionally evaluated from the working-tree state at the terminal pass rather than a run-start baseline, so pre-existing uncommitted `docs/**` changes are included and made visible by the mandatory listing.
