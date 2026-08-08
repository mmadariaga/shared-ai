**Complexity**: high (5 capabilities, 20 requirement blocks, 7 affected files, no breaking change)

## Why

Managing parallel worktrees is a recurring manual chore in this repo, whose own layout already encodes the convention (`git worktree list` shows `shared-ai`, `shared-ai.worktree-1`, `shared-ai.worktree-2` with matching `worktree-<n>` branches). The command-file anatomy for a new `/sai-*` is a clean, established extension seam — `sai/install-manifest.json` projects commands and instructions by glob, so no manifest change is required. This change adds `/sai-worktree`, an interactive helper that lists the repository's git worktrees, then loops a selector offering create, delete, and exit.

## What Changes

- Add the `/sai-worktree` command: a guarded menu over a worktree inventory — read state, present closed choices, mutate, re-read state. The selector loop, not any single action, is the primary object.
- `worktree-inventory`: resolve the repository via `git rev-parse --git-common-dir` (never the cwd), run `git worktree prune`, and render every worktree as name / path / branch, marking the main worktree and the one the command is running in.
- `worktree-selector-loop`: present a closed-choice selector (Create / Delete / Exit) through the harness-native picker per the "Closed-choice prompts" rule in `remember.md`; after each action, re-render the inventory and re-show the selector. Only Exit terminates.
- `worktree-creation`: propose `<main-repo-directory-name>.worktree-<n>` where `n` is the first free slot, accept a user-supplied name via the picker's free-text option (validated before any mutation: no path separators or `..`, no existing sibling directory, valid git refname), create the directory as a sibling of the main worktree, and create a branch derived from the current HEAD — `worktree-<n>` for a default name, or the suffix of a custom name after stripping a leading `<main-repo-directory-name>.` prefix (falling back to the whole name when no such prefix is present).
- `worktree-deletion`: offer only deletable worktrees (excluding the main one and the currently active one), surface uncommitted changes and require explicit confirmation before any forced removal, then ask separately whether to delete the branch, warning when it holds unmerged commits.
- Distribution: add `commands/claude/sai-worktree.md` and `commands/opencode/sai-worktree.md`, the shared Isolation-Mode body `sai/commands/sai-worktree.md`, and the instruction `sai/instructions/worktree.md`; register `/sai-worktree` in the sai-commands skill registry table.
- Docs: amend `AGENTS.md` so the OpenSpec-prerequisite exception and the safe-operations wrapper count name `/sai-worktree` alongside `sai-commit`; append the **Worktree Name Triple** term to `GLOSSARY.md`.

No **BREAKING** changes.

## Capabilities

### New Capabilities

- `worktree-inventory`: resolve the repository through the common git directory, prune stale entries, and render every worktree as name / path / branch with the main and current worktrees marked.
- `worktree-selector-loop`: the closed-choice Create / Delete / Exit loop through the harness-native picker, re-rendering the inventory after every action; only Exit terminates.
- `worktree-creation`: default name from the main directory name plus the first free slot, validated free-text override, sibling directory creation, branch derived from the accepted name from the current HEAD.
- `worktree-deletion`: deletable-only targets, uncommitted-work confirmation gating forced removal, separate branch-deletion question with an unmerged-commits warning.
- `worktree-command-distribution`: both harness wrappers, shared body and instruction, registry registration, glob-projections-only installation (no manifest change), and documented omission of the OpenSpec prerequisites.

### Modified Capabilities

None — no existing main spec pins the sai-commands registry, the wrapper anatomy, or the prerequisite-exception set; the `closed-choice-prompts` and `claude-commands-fetch-load` requirements apply as compliance constraints on the new files, unchanged.

## Impact

Affected files — the only files this change modifies:

- `commands/claude/sai-worktree.md` (new)
- `commands/opencode/sai-worktree.md` (new)
- `sai/commands/sai-worktree.md` (new)
- `sai/instructions/worktree.md` (new)
- `skills/universal/sai-commands/SKILL.md` (one appended registry row)
- `AGENTS.md` (amends the prerequisite-check exception sentence and the safe-operations wrapper count)
- `GLOSSARY.md` (appends the term **Worktree Name Triple**, one relationship, and the flagged ambiguity "Worktree vs worktree name triple" — permitted root-glossary update, per the glossary append rules)

No `sai/install-manifest.json` change (the `claude-commands`, `opencode-commands`, `sai-commands`, and `sai-instructions` glob projections carry the new files; if a projection does not pick one up, that is a finding, not a licence to edit the manifest), no `openspec/` reads or writes, no worker bindings or orchestration contracts, no schema or template changes, no INSTALL doc changes, and no harness-specific skill files.

## Proposal Research Documentation

**Local files**: `commands/claude/sai-status.md`; `commands/opencode/sai-status.md`; `sai/commands/sai-commit.md`; `sai/instructions/commit.md`; `skills/universal/sai-commands/SKILL.md`; `sai/install-manifest.json`; `sai/policies/remember.md`; `sai/policies/glossary-format.md`; `sai/instructions/spec.propose.md`; `skills/universal/safe-operations/SKILL.md`; `openspec/config.yaml`; `openspec/specs/closed-choice-prompts/spec.md`; `openspec/specs/claude-commands-fetch-load/spec.md`; `openspec/changes/archive/2026-08-07-pin-report-template-parity/proposal.md`; `GLOSSARY.md`; `AGENTS.md`; `.opencode/skills/openspec-propose/SKILL.md`.

**External URLs**: None.

## Additional Notes

- **The prune tension, resolved.** The envelope's read-only constraint ("no filesystem or git mutation occurs without an explicit user selection") and the inventory's `git worktree prune` step are reconciled by scoping: prune removes only stale administrative bookkeeping for worktrees that are already gone — never a registered worktree, its files, or a branch — and runs inside the inventory render. All user-visible mutations (create, remove, branch delete) remain selection-gated. This scoping is normative in `worktree-selector-loop` requirement "No mutation without a user selection".
- **First non-openspec `/sai-*`.** This is the first command that neither reads nor writes `openspec/`, so the OpenSpec prerequisite checks would block it for no benefit. The omission is deliberate and documented in `AGENTS.md` so it is not later "fixed" back in; the command still loads budget, safe-operations, and remember. `AGENTS.md` currently names `sai-commit` as "the only exception" — that sentence and the safe-operations wrapper count (7) must both be amended.
- **Model choice is design's call.** The wrappers mirror the thinnest existing wrapper (`sai-status`) for frontmatter shape; exact model selection and `allowed-tools` scoping are left to `/sai-2-design`. The claude wrapper must satisfy the `claude-commands-fetch-load` requirement (`Fetch @skills/fetch/SKILL.md` as first body line), and the opencode wrapper uses the opencode fetch path plus `$ARGUMENTS` placement.
- **Numbering semantics.** The default counter takes the first free slot (smallest `n` with neither sibling directory nor branch used), keeping numbering compact and predictable; reusing a freed number means a new `worktree-2` can be confused with a previously deleted one in stale terminal scrollback — an accepted trade-off.
- **Base branch.** New worktrees branch from the current HEAD, not the main branch, matching the convention the repository already exhibits and avoiding an extra question on the dominant path; the resulting base therefore depends on invocation context.
- **Branch suffix derivation and validation.** For a custom name the branch is the suffix after a leading `<main-repo-directory-name>.` prefix, falling back to the whole name — so `<main-repo-directory-name>.worktree-9` still yields branch `worktree-9` and the **Worktree Name Triple** stays derivable from any single name. Custom names are validated before any mutation (no path separators or `..`, no existing sibling directory, valid git refname); refusal mutates nothing and returns to the selector.
- **Branch deletion is never implicit.** Deletion is modeled as two independent reversible decisions — remove the checkout, then (separately) delete the branch — so the default path stays reversible. The unmerged warning uses the main worktree's branch as the merge base; when the main worktree is detached the check is skipped and the prompt states so, and a detached-HEAD deletion target skips the branch question entirely.
- **Zero deletable targets.** `Delete` stays in the fixed selector even when only the main and active worktrees exist — the selector set stays constant across renders. Picking `Delete` in that state reports that no deletable worktrees exist and returns to the selector without presenting a target picker (normative in `worktree-deletion`).
- **Merge is out of scope.** It is the only action that is not a thin wrapper over `git worktree`: it needs a target branch, cannot run from inside the worktree being merged, and can leave the repository half-resolved. The create/delete cycle still ends with a manual merge step outside the tool.
- **No ADR/DDR recommendation.** The naming and loop decisions are either reversible (numbering, HEAD base, branch-from-HEAD) or forced by the repository's existing convention; none meets all three ADR criteria.
