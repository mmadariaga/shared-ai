**Complexity**: medium (2 modified capabilities, 8 requirements, 3 affected paths)

## Why

The `/sai-archive` post-archive commit gate currently lists amend first with no recommendation, pushing the destructive history-rewriting option to the top of the picker. Creating a new commit is the safe and usual outcome of an archive run, so it becomes the first, Recommended option, and `--fast-track` follows by auto-selecting the new commit instead of amend.

## What Changes

- The three-option archive commit gate is reordered to: **1. Create a new commit (Recommended)**, **2. Amend the latest commit**, **3. Do nothing**.
- The new-commit option carries the `Recommended` marker; the "No option carries a Recommended marker" statement and its scenario are removed from the capability.
- `--fast-track` auto-selects the new-commit option. Because a new commit is never destructive, the pushed-HEAD guard, the do-nothing fallback, and the `amend skipped because HEAD is already pushed` line are removed from the unattended path.
- A shared empty-index guard runs after staging and before the amend/new-commit action: an index left empty by the two-path staging produces no amend (no pointless HEAD rewrite) and no commit, and prints the single diagnostic line `[sai-archive] no commit: staging left the index empty`.
- The interactive amend option keeps the pushed-HEAD guard fully in force as option 2.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `sai-archive-commit-gate`: option order and the `Recommended` marker, the fast-track auto-selection target, and the shared empty-index guard after staging.
- `sai-fast-track-flag`: item 3 of `sai-archive`'s fast-track opt-out set, rewritten from auto-select-amend to auto-select-new-commit.

## Impact

- `sai/instructions/archive-commit-gate.md` — the gate instruction: option order, `Recommended` marker, fast-track branch rewrite, empty-index guard.
- `openspec/specs/sai-archive-commit-gate/spec.md` — main spec updated on archive delta-spec sync.
- `openspec/specs/sai-fast-track-flag/spec.md` — main spec updated on archive delta-spec sync.
- No code, no new dependencies, no **BREAKING** change. Other commands' fast-track opt-out sets are untouched.

## Proposal Research Documentation

**Local files**:
- `sai/instructions/archive-commit-gate.md` — gate presentation (17-31), amend path (34-54), fast-track branch (77-92).
- `openspec/specs/sai-archive-commit-gate/spec.md` — option-order requirement (9-27), fast-track requirement (105-117).
- `openspec/specs/sai-fast-track-flag/spec.md` — item 3 of the opt-out set (27), commit-gate scenarios (66-74), opt-out-set scenario (154).
- `sai/instructions/commit.md` — steps 1-5 (79-89) reused by the new-commit path; step 6 (authorization) is deliberately not used by the gate.
- `sai/instructions/archive.md` — archive fast-track handling; does not reference the commit gate.
- `GLOSSARY.md` — no new domain terms; commit/gate/amend/fast-track are not glossary terms.

**External URLs**: None.

## Additional Notes

- The new-commit path needs no new machinery: `commit.md` explicitly does not stage, the gate already stages the two literal paths, and the picker selection counts as the per-invocation authorization — so fast-track reuses the existing option verbatim.
- The empty-index guard is placed once, immediately after `git add` and before the amend or new-commit action, and fires before `sai/instructions/commit.md` steps 1–5 are applied (so step 1's `No staged changes` stop is never reached). It covers both commit options and both the interactive and fast-track paths: with an empty index `git commit --amend --no-edit` still succeeds and rewrites HEAD with an identical tree, producing a pointless SHA. It prints one diagnostic line when it fires.
- Staging stays exactly `openspec/specs` and `openspec/changes/archive`; never `git add -A`.
- The gate still does not adopt the `commit-auth-gate` option set and never sets or reads the session commit-authorization flag.
- The skip rule (no changes in `git status` skips the gate entirely) and ask-first-stage-after behavior are unchanged.
