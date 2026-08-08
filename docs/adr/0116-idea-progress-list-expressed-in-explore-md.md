# ADR 0116: The idea progress list is expressed entirely in `sai/instructions/explore.md` — the sole edit target

## Status

Accepted

## Context

`sai-explore` gains a chat-scoped idea progress list — a rendering feature with no file surface: the list is held in conversation only, is never written to any file, artifact, change directory, or configuration, and is never derived from repository state. The entire contract therefore has to live somewhere in the instruction surface, and the choice of where shapes the change's blast radius and its harness parity. The change follows the scope-confined-to-explore.md pattern with precedent in the `explore-post-crystallization-review-loop` and `explore-crystallization-block` capabilities, but that pattern was not itself recorded as a decision; a future reader would otherwise ask why a rendering feature is entirely inside one instruction file, and why no wrapper, policy, skill, schema, or harness configuration carries any part of it.

## Decision

The entire idea-list contract — the item catalog, the render contract, and the marking rules — lives inside `sai/instructions/explore.md` as a new top-level item (item 11), with hook prose at the slicing assessment (item 4), the crystallization protocols (items 5/6), the manual post-crystallization review loop (item 9), and the supervised pipeline (item 10). No wrapper (`commands/`), policy, skill, schema, `AGENTS.md`, or harness configuration is modified. The explore coordinator is read-only (per `explore-context-isolation`); the list adds no writes, consistent with that contract.

## Alternatives Considered

| Option | Pro | Con |
|---|---|---|
| Express the list in `sai/instructions/explore.md` (chosen) | Co-locates the behavior with the mode that owns it; follows the established explore-only precedent; keeps harness parity by construction | Concentrates more behavior in one large instruction file |
| A dedicated instruction file for the list | Isolates the contract from `explore.md` | Adds indirection for strictly in-session state that no other surface reads or writes |
| Wrapper-level task-list tooling | Harness-native rendering | Breaks the no-declared-plan semantics (design Decision 2) and harness parity; opencode has no per-command tool-restriction field |
| A shared policy file | Reuses the policy layer | The list is explore-mode behavior, not policy; the neutral task-list policy deliberately does not govern it |

## Consequences

- All list behavior is co-located with the mode that owns it; relocating it later to a separate surface is a coordinated multi-hook edit (items 4/5/6/9/10 hooks plus the contract item).
- The change modifies exactly one file, keeping the proposal's Impact surface and the archive diff minimal.
- Harness parity is preserved by construction: the plain-text render contract lives in the neutral instruction, and no harness-specific surface carries any part of the list.
- Read-only discipline is preserved: the list adds no writes and no repository-state reads, consistent with the explore context-isolation contract.

## Provenance

User — the proposal Impact constrains the change to `sai/instructions/explore.md` (explicit decision "consistent with the prior explore-only change pattern"); the design records it as Decision 6 with the `adr` family marker.

## Related

- `openspec/changes/explore-idea-progress-plan/` — proposal, design (D1–D6), and the two capability deltas.
- `openspec/specs/explore-post-crystallization-review-loop/spec.md` — the scope-confined-to-explore.md pattern precedent.
