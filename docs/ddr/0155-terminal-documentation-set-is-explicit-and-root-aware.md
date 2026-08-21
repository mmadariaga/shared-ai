# DDR 0155: Terminal documentation set is explicit and root-aware

## Status

Accepted

## Context

The apply run has two different staging responsibilities. A Step commit is constrained by worker report field 8, while the terminal documentation commit must expose documentation written or changed at terminal time without capturing OpenSpec artifacts or unrelated working-tree paths. Root `SAI_LEARNINGS.md` and `GLOSSARY.md` have canonical locations that must not be replaced by change-folder fallbacks.

## Decision

The terminal documentation set is a closed, terminal-state-derived set: changed paths under `docs/**`, root `SAI_LEARNINGS.md` only when written by the current promotion pass, and changed root `GLOSSARY.md` whether tracked or untracked. The coordinator previews that set and all excluded working-tree paths without mutating the index, then stages exactly the eligible paths after authorization. OpenSpec artifacts, `implementation.md`, unrelated paths, and per-Step field-8 add-lists remain outside the terminal set.

## Alternatives Considered

| Option | Pro | Con |
|---|---|---|
| Reuse each Step's field-8 add-list | Already available at the Step gate | Omits terminal documentation created outside a Step |
| Stage the whole working tree | Short implementation | Captures OpenSpec artifacts and unrelated user work |
| Compare only against a run-start baseline | Excludes older visible documentation changes | Violates terminal-state visibility for pre-existing work |
| Use an explicit root-aware terminal set (chosen) | Auditable, bounded, and compatible with both staging boundaries | Requires a separate terminal preview and path calculation |

## Consequences

- A terminal documentation commit is proposed independently of whether promotion produced a qualifying learning.
- The preview can show eligible documentation and excluded working-tree paths before the authorization decision.
- Root location rules for `SAI_LEARNINGS.md` and `GLOSSARY.md` remain mechanically enforceable.
- The terminal path contract must remain separate from changed-files reporting and Step commits.

## Provenance

codebase-forced — `openspec/changes/restore-apply-documentation-commit/design.md`, Decision 2.
