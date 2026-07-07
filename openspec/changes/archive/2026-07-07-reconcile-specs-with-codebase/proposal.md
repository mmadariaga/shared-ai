## Why

An audit of `openspec/specs/` and the supporting command/skill/README artifacts found four groups of drift accumulated over the last ~10 weeks of model and instruction refactors: 7 specs whose required artifacts no longer exist or are contradicted by current code, 3 active specs whose normative text cites outdated model identifiers and an obsolete wrapper shape, code leftovers across nine files (wrapper descriptions and the command registry still referencing the removed `caveman` skill, a mojibake byte in two descriptions, and a stale sai-2-design handoff description), and an unbacked inline `## No-file-write enforcement` block in all three `sai-explore` wrappers that duplicates content already in `sai/instructions/explore.md`. A separate reconciliation decision — made manually before this change was opened — changed the Claude Code wrapper model frontmatter for `sai-1-spec` and `sai-3-implement` from `claude-opus-4-8` to `claude-sonnet-4-6`; the other five Sonnet phases on Claude Code (`sai-5-review`, `sai-7-performance`, `sai-8-accessibility`, `sai-explore`, `sai-backfill`) were already on `claude-sonnet-4-6` in the previous commit and were not touched by the manual edit. `git status` confirms exactly two modified files (`commands/claude/sai-1-spec.md` and `commands/claude/sai-3-implement.md`); the diff of each is a one-line `model:` change. That manual edit is uncommitted; this change folds it in so the reconciliation lands as one auditable unit. The spec tree is no longer authoritative — leaving it that way means `sai-3-implement` and `sai-5-review` will keep acting on outdated constraints and recommend fixes that contradict what the wrappers actually do.

## What Changes

- Archive 7 stale specs to `openspec/specs/_archived/` (content preserved, identical mechanism to the `archive-completed-specs` change).
- Update 3 active specs to cite the current wrapper shape and model identifiers.
- Remove 2 `caveman` references from `skills/universal/sai-commands/SKILL.md` and 6 `caveman` mentions from the description frontmatter of `sai-archive` (3) and `sai-explore` (3) across all three harnesses (Claude Code, OpenCode, Copilot).
- Fix the mojibake `�` (replacement character) in the description of `commands/claude/sai-archive.md` and `commands/opencode/sai-archive.md` (restored em dash).
- Update the `sai-2-design` wrapper description in Claude Code, OpenCode, and Copilot to say that the wrapper itself asks for and records specs approval, not `/sai-1-spec` (all three harnesses carry the same stale text; mirror discipline).
- Correct the `/budget` row in `skills/universal/sai-commands/SKILL.md` from "all three budget skills" to "all four" (now includes `budget-subagent` per the `budget-universal-loader` spec).
- Remove the inline `## No-file-write enforcement` block from all three `sai-explore` wrappers (Claude Code, OpenCode, Copilot); the rule is already enforced by `sai/instructions/explore.md` (line 3: "No file writes… strictly read-only"), and the inline block is not backed by any spec in `openspec/specs/`.
- Update the Claude Code wrapper `model:` frontmatter field on 2 wrappers (`sai-1-spec` and `sai-3-implement`) from `claude-opus-4-8` to `claude-sonnet-4-6`, the only two wrappers whose model field was changed by the manual edit. The end-state model assignments are: `claude-sonnet-4-6` for `sai-1-spec` (medium), `sai-3-implement` (high), `sai-5-review` (high), `sai-7-performance` (high), `sai-8-accessibility` (high), `sai-explore` (medium), and `sai-backfill` (medium); `claude-opus-4-8` for `sai-2-design` (high) and `sai-6-security` (high); `claude-haiku-4-5` for `sai-4-apply`, `sai-archive`, `sai-commit`, and `sai-pr` (no `effort` field). This is the folded-in manual edit (see Additional Notes).
- Verify the `README.md` model table is consistent with the new wrapper values; the table is already in the new state so no cell edit is required, but the apply phase asserts the table is consistent with the wrappers going forward.

No command body, opencode/copilot model field, skill logic, or installer is touched. The edit surface is: (a) the `description:` field on 9 wrapper files — `caveman` removal in `sai-archive` × 3 harnesses (Claude Code, OpenCode, Copilot) and `sai-explore` × 3 harnesses, mojibake fix in `sai-archive` × 2 harnesses (Claude Code, OpenCode), and `sai-2-design` description rewrite × 3 harnesses (Claude Code, OpenCode, Copilot); (b) the `## No-file-write enforcement` body block removal in `sai-explore` × 3 harnesses; (c) the `model:` frontmatter field on 2 Claude Code wrappers — `sai-1-spec` and `sai-3-implement`, both changed from `claude-opus-4-8` to `claude-sonnet-4-6`. The other 11 Claude Code wrappers (5 Sonnet phases already on Sonnet, 2 Opus-4-8 phases kept on Opus-4-8, 4 Haiku phases kept on Haiku) are not edited by this change — they are verified by the apply phase against the new spec.

## Capabilities

### New Capabilities

- `reconcile-specs-with-codebase`: A single capability that captures every archive, spec edit, code cleanup, and wrapper model alignment required to bring `openspec/specs/` and the documentation into agreement with the current codebase, including folding in the uncommitted manual edit to the Claude Code wrapper model fields.

### Modified Capabilities

- `command-wrappers`: The "model routing preserved per command" requirement cited `claude-opus-4-7` for `sai-1-spec`/`sai-2-design` and "sonnet for `sai-3-implement`"; the new requirement tracks the actual frontmatter across all 13 Claude Code wrappers — `claude-sonnet-4-6` for `sai-1-spec`/`sai-3-implement`/`sai-5-review`/`sai-7-performance`/`sai-8-accessibility`/`sai-explore`/`sai-backfill`, `claude-opus-4-8` for `sai-2-design`/`sai-6-security`, `claude-haiku-4-5` for `sai-4-apply`/`sai-archive`/`sai-commit`/`sai-pr` — and the scenarios are rewritten to assert the new values.
- `model-routing`: The last scenario required the `sai-commands` registry to list `sai-3-implement-low` and `sai-3-implement-high`; both wrappers were removed and forbidden by `command-wrappers` ("single canonical wrapper per command"). The scenario is dropped.
- `thin-wrappers`: The wrapper template mandated a `User input: $ARGUMENTS` line in 11/12 wrappers and forbade `Fetch @skills/` in wrappers; current wrappers have no `User-input` line (it lives in `sai/commands/*.md` bodies) and open with `Fetch @skills/fetch/SKILL.md`. The "after" example also cited the forbidden old path `@commands/sai/sai-archive.md`. The template, file list (which was also missing `sai-backfill.md` from the 12), and "after" example are rewritten to match the current shape, with an additional `active-spec-uses-requirement-format` requirement that retires the free-form sections of the active spec.

## Impact

- `openspec/specs/`: 7 directories moved to `_archived/`, 3 spec files edited in place. No directory creation required (`_archived/` already exists and contains 4 entries).
- `openspec/specs/_archived/`: 7 new subdirectories added.
- `commands/claude/`: frontmatter `description` edits (sai-archive, sai-explore, sai-2-design); `model:` frontmatter field edits on 2 files (sai-1-spec, sai-3-implement — the folded-in manual edit; no `effort:` values change); removal of the `## No-file-write enforcement` block from sai-explore. The apply phase verifies the remaining 11 wrappers are already in their target state.
- `commands/opencode/`: frontmatter `description` edits (sai-archive, sai-2-design); removal of the `## No-file-write enforcement` block from sai-explore. No model/effort edits.
- `commands/copilot/`: frontmatter `description` edits (sai-archive, sai-explore, sai-2-design); removal of the `## No-file-write enforcement` block from sai-explore. No model/effort edits.
- `skills/universal/sai-commands/SKILL.md`: 3 inline text edits (`/sai-explore` row, `/budget` row, one "Why This Matters" bullet).
- `README.md`: no edits — the model table is already consistent with the new wrapper values for all rows.
- No application code, no command body, no opencode/copilot model field, no skill logic, no installer changes.

## Proposal Research Documentation

**Local files** (all read during audit):

- `openspec/specs/explorer-claude/spec.md`, `openspec/specs/explorer-opencode/spec.md`, `openspec/specs/sai-instructions-namespace/spec.md`, `openspec/specs/model-variant-wrappers/spec.md`, `openspec/specs/token-efficient-languages-commands/spec.md`, `openspec/specs/sai-backfill-install-source/spec.md`, `openspec/specs/copilot-harness-instructions/spec.md` (the 7 specs to archive).
- `openspec/specs/command-wrappers/spec.md`, `openspec/specs/model-routing/spec.md`, `openspec/specs/thin-wrappers/spec.md` (the 3 specs to update).
- `openspec/specs/archive-completed-specs/spec.md` (the precedent for the archive mechanism).
- `openspec/specs/source-layout/spec.md`, `openspec/specs/copilot-harness-removal/spec.md`, `openspec/specs/budget-universal-loader/spec.md` (referenced for "current source of truth" assertions).
- `commands/claude/sai-archive.md`, `commands/opencode/sai-archive.md`, `commands/copilot/sai-archive.prompt.md`, `commands/claude/sai-explore.md`, `commands/opencode/sai-explore.md`, `commands/copilot/sai-explore.prompt.md` (frontmatter leftovers, including the `## No-file-write enforcement` block in all three sai-explore files).
- `commands/claude/sai-1-spec.md`, `commands/claude/sai-2-design.md`, `commands/claude/sai-3-implement.md`, `commands/claude/sai-5-review.md`, `commands/claude/sai-6-security.md`, `commands/claude/sai-7-performance.md`, `commands/claude/sai-8-accessibility.md`, `commands/claude/sai-explore.md`, `commands/claude/sai-backfill.md` (model frontmatter reference — Claude Code).
- `commands/opencode/sai-1-spec.md`, `commands/opencode/sai-2-design.md`, `commands/opencode/sai-3-implement.md` (model frontmatter reference — opencode, unchanged).
- `skills/universal/sai-commands/SKILL.md` (registry with `/budget` and caveman leftovers).
- `sai/instructions/explore.md` (the body file that already enforces no-write at line 3).
- `README.md` (model table — already in the new state).
- `sai/commands/sai-1-spec.md`, `sai/commands/sai-2-design.md` (the body files — confirm `$ARGUMENTS` lives there, not in the wrapper).

**File-existence checks**:

- `skills/claude/budget-explorer/SKILL.md` — exists (replaces `~/.claude/sai/instructions/explorer.claude.md`).
- `skills/opencode/budget-explorer/SKILL.md` — exists (replaces `~/.claude/sai/instructions/explorer.opencode.md`).
- `skills/claude/sai-backfill/SKILL.md` — does NOT exist (backfill is now a command at `commands/claude/sai-backfill.md`).
- `commands/opencode/sai-3-implement-low.md`, `commands/opencode/sai-3-implement-high.md` — do NOT exist.
- `commands/claude/token-efficient-languages.md`, `commands/opencode/token-efficient-languages.md` — do NOT exist.
- `bin/install-flow.js` — exists (contradicts `sai-instructions-namespace` install target claim).
- `openspec/specs/_archived/` — exists with 4 entries (`opencode-model-resolution`, `opencode-qwen-version`, `rename-instructions-files`, `sai-1-override-merge`).

**External URLs**: none consulted.

## Additional Notes

- **Folded-in manual edit (wrapper model fields).** Before this change was opened, a manual edit changed two Claude Code wrapper model fields on disk (uncommitted) from `claude-opus-4-8` to `claude-sonnet-4-6`: `sai-1-spec` (effort: medium) and `sai-3-implement` (effort: high). `git status` shows exactly these two files modified; the diff of each is a single-line `model:` change. The other five Sonnet phases on Claude Code (`sai-5-review`, `sai-7-performance`, `sai-8-accessibility`, `sai-explore`, `sai-backfill`) were already on `claude-sonnet-4-6` at HEAD and were not touched by the manual edit. `sai-2-design` and `sai-6-security` kept `claude-opus-4-8` (high); `sai-4-apply`, `sai-archive`, `sai-commit`, and `sai-pr` kept `claude-haiku-4-5`. This change folds the manual edit in so the wrapper update, the spec alignment, the archive moves, and the code cleanups land as one auditable unit — the alternative (commit the wrapper edit separately and regularize it with `/sai-backfill`) was considered and rejected because the manual edit is part of the same drift this change exists to eliminate, and folding it in gives a single commit/PR with a coherent "reconcile specs with codebase" story. The apply phase asserts every wrapper's `model:` and `effort:` fields match the new spec; if a wrapper is somehow not in the expected state, the apply phase updates it (no-op for the 11 wrappers that were already in their target state at HEAD, and a no-op for the 2 manually-edited wrappers that already match the target). The opencode and copilot wrapper model fields are not touched by this change — they keep their current opencode-go/* and `GPT-5* (copilot)` values.
- **Sonnet as the resolved default.** The original audit presented the model conflict as a choice between aligning the spec/README to the wrappers (Opus) or downgrading the wrappers to the spec/README (Sonnet). The manual edit resolved it in favor of Sonnet — the cost-efficient choice — and the spec, the README (already in the new state), and the wrapper frontmatter all converge on it now. The "frontier only where reasoning depth actually matters" pitch in the README's introduction is now consistent with the routed models: Sonnet for the spec, implement, review, and audit phases; Opus-4-8 only for design and security (where the reasoning depth is most justified); Haiku for the cheap mechanical phases (apply, archive, commit, PR). No follow-up is needed for the README's introduction language.
- **No new behavior, no new tests, no migrations.** This is a documentation/spec reconciliation plus a frontmatter model alignment. The capability spec for this change documents the archive moves, spec edits, code cleanups, wrapper model updates, and explore-block removal as a flat list of requirements; the design and tasks phases translate each requirement into concrete file moves/edits. Code generation in `sai-3-implement` is limited to text-level edits (frontmatter descriptions, the two frontmatter `model:` fields, SKILL.md bullets, spec file rewrites, directory moves via `git mv`) and the removal of one redundant block in three explore wrappers.
- **Mirror discipline reminder:** the `mirror discipline` in the canonical wrapper list (per `command-wrappers`) means the three `sai-2-design` descriptions (Claude Code, OpenCode, Copilot) and the six `sai-archive`/`sai-explore` descriptions (three harnesses each) get edited as a coordinated group. The mirror principle is the same one enforced for command additions. The `## No-file-write enforcement` block is also removed from all three sai-explore wrappers in a coordinated edit.
- **No GLOSSARY.md terms introduced.** No new domain vocabulary enters the project through this change — only the canonical names of artifacts already documented elsewhere (`archive-completed-specs`, `command-wrappers`, `model-routing`, `thin-wrappers`, `caveman`, `budget-subagent`).
