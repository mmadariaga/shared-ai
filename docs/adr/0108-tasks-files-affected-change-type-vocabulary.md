# ADR 0108: Tasks files-affected entries carry a closed four-letter change-type vocabulary

## Status

Accepted

## Context

The `**Files Affected**` sub-field of every `tasks.md` step was a bare
comma-separated path list, so a plan that creates five files and one that
modifies three were visually identical. The change type lived only in the
step's `**What Will Be Done**` prose, where it was unreliable at file level
("Add the audit-append bullet" is a modification while "Add step-up
primitives" is five new files). The sai-workflow schema already
half-recognized the distinction ("to be modified or created") without
requiring it and without covering deletion. The `/sai-2-design` instruction
emits the format and its routing derivation consumes the paths; `/sai-3-implement`
reads the paths when expanding steps; the `/sai-4-apply` plan cross-check
matches the declared paths against git status.

## Decision

`**Files Affected**` is a closed, total four-letter change-type vocabulary —
`A` (created), `M` (modified), `D` (deleted), `R` (moved/renamed) — emitted
one entry per line, each token followed by exactly one space and the
project-root-relative path; an `R` entry carries `R <source path> -> <destination path>`.
Each token is derived from the file's existence at the repository state
immediately before that step's commit, never from the step title or prose
verb. Every consumer strips the leading token before interpreting the path;
the routing derivation contributes only the destination path of an `R` entry,
so a single-file move never flips a step's layer or discipline tokens.

## Alternatives Considered

- Verbose words (`add`/`modify`/`delete`/`move`): self-documenting but
  verbose and inconsistent with git's `A`/`M`/`D`/`R` status letters, which
  the audience already knows.
- Keep the comma-list and add a separate per-file verb column: invents a
  sixth `## Step N` sub-field and splits the change type from its path.

## Consequences

The per-file change type is machine-readable at the `**Files Affected`** level,
one entry per line, with a documented derivation rule that removes the
prose-verb ambiguity. Consumers that strip an arbitrary leading token keep
working unchanged (`/sai-4-apply` plan cross-check, `tasks-routing-metadata`,
`atomic-commit-planning`); adding a fifth letter later is additive and
non-breaking. Archived `tasks.md` files are exempt; the wording of
`sai/instructions/apply.md:386` and `openspec/specs/apply-pre-commit-file-report/spec.md`
stays misaligned by accepted trade-off (Decision 7).

## Provenance

User decision recorded in the `declare-file-change-type-in-tasks` design
(Decision 1).
