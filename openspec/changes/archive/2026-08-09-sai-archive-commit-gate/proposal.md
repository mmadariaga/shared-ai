**Complexity**: medium (2 capabilities, 9 requirements)

## Why

`sai-archive` ends with the archive move and summary, leaving the archived change and any synced main specs as uncommitted working-tree changes. A post-archive commit gate gives the user one decision point to capture the archive operation in git — amend the previous commit, create a new commit, or do nothing — with a fast-track default for batched runs.

## What Changes

- `/sai-archive` presents a closed-choice three-option action-selector gate after the archive skill completes (archive move + spec sync + summary): amend the latest commit (`git commit --amend --no-edit`), create a new commit (message composed per `sai/instructions/commit.md` steps 1–5 and `sai/policies/commit-rules.md`), or do nothing (index untouched).
- The gate asks first and stages after: only options 1 and 2 run `git add`, and only exactly `openspec/specs` and `openspec/changes/archive`; no option carries a `Recommended` marker; the gate is skipped when `git status` shows no changes.
- The amend path applies the pushed-HEAD guard (explicit warning + secondary confirmation per `commit-rules`); under `--fast-track` the gate auto-selects amend assuming unpushed HEAD, and falls back to do-nothing with an explanatory line when the guard fires.
- The gate deliberately does NOT adopt the `commit-auth-gate` `yes` / `no` / `Allow on this session` option set, does not set or read the session commit-authorization flag, and offers no session grant.
- `sai-fast-track-flag` main spec: `sai-archive`'s fast-track opt-out set grows from two gates to three (the new commit gate's auto-select-amend).

## Capabilities

### New Capabilities
- `sai-archive-commit-gate`: the post-archive three-option commit gate for `/sai-archive` — options, staging scope, skip rule, pushed-HEAD guard, fast-track auto-amend with do-nothing fallback, and non-adoption of the `commit-auth-gate` option set.

### Modified Capabilities
- `sai-fast-track-flag`: `sai-archive`'s fast-track opt-out set gains the archive commit gate — auto-select amend (unpushed-HEAD assumption) with pushed-HEAD do-nothing fallback — in the two affected requirements.

## Impact

- `sai/instructions/archive-commit-gate.md` — NEW instruction file for the post-skill commit gate (gate presentation, staging scope, pushed-HEAD guard, fast-track branch, message-composition references). The gate is NOT co-located in `sai/instructions/archive.md`, which keeps governing only the pre-skill checks. The new instruction references `sai/instructions/commit.md` steps 1–5 and `sai/policies/commit-rules.md` without restating commit rules.
- `sai/commands/sai-archive.md` — fetches `@sai/instructions/archive-commit-gate.md` AFTER the archive skill fetch, so the gate runs post-skill (archive move + spec sync + summary).
- `openspec/specs/sai-fast-track-flag/spec.md` — main spec updated on sync with the third `sai-archive` opt-out.
- Not touched: the upstream archive skill (never modified), the `commit-auth-gate` capability and its gate contract, the `sai-archive` wrappers (no wrapper shape change), the install manifest (the recursive `sai-instructions` projection auto-covers the new instruction file for both harnesses), and `GLOSSARY.md` (no new domain term — commit-gate and pushed-HEAD-guard vocabulary is already established by `commit-auth-gate`, `commit.md`, and `commit-rules.md`).

## Proposal Research Documentation

**Local files**: `sai/commands/sai-archive.md`; `sai/instructions/archive.md`; `.opencode/skills/openspec-archive-change/SKILL.md`; `sai/instructions/commit.md`; `sai/policies/commit-rules.md`; `openspec/specs/commit-auth-gate/spec.md`; `openspec/specs/sai-fast-track-flag/spec.md`; `docs/ddr/0041-uniform-three-option-gate.md`; `commands/claude/sai-archive.md`; `commands/opencode/sai-archive.md`; `openspec/changes/archive/2026-08-08-terminal-doc-commit-session-auth/specs/sai-fast-track-flag/spec.md` (MODIFIED-delta format precedent)

**External URLs**: none

## Additional Notes

- The gate fires only after the upstream skill's step 6 summary; under `--fast-track` the sync-gate auto-selections complete before the commit gate is evaluated.
- The staging paths are literal: `openspec/specs` and `openspec/changes/archive`; never `git add -A` or a broader sweep.
- Pushed-HEAD detection follows the `commit.md` `--amend` idiom (`git log @{push}..HEAD --oneline` empty, with HEAD matching the push target, means pushed).
- Under `--fast-track` no gate prompt is presented; the amend auto-selection assumes unpushed HEAD, and the guard check still runs.
- The picker selection is the per-invocation authorization for both commit options; no second authorization prompt is presented.
- Exact picker label wording is design-phase detail; the three options and their semantics are normative here.
