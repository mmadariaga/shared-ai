## Why

When a `sai-*` command that consumes an OpenSpec change name (`sai-2-design`, `sai-3-implement`, `sai-4-apply`, `sai-5-review`, `sai-6-security`, `sai-7-performance`, `sai-8-accessibility`, `sai-archive`, `sai-pr`, `sai-backfill`) is invoked without one, the missing-name case currently surfaces as a raw OpenSpec CLI error mid-command, forcing the user to retype the name and breaking flow. A shared picker step lets the user pick from active changes up front, keeping momentum and forcing explicit confirmation of which change is about to be worked on.

## What Changes

- Add a new shared instruction `sai/instructions/change-picker.md` that, given an empty `$ARGUMENTS`, lists active changes via `openspec list --json` and resolves to a single chosen change name:
  - 0 changes → friendly STOP with a hint to run `/sai-1-spec`.
  - 1 change → explicit y/n confirmation (no auto-select).
  - N changes → numbered picker; invalid input is rejected and re-prompted.
- Wire the picker into every change-consuming `sai-*` command body (`sai-2-design`, `sai-3-implement`, `sai-4-apply`, `sai-5-review`, `sai-6-security`, `sai-7-performance`, `sai-8-accessibility`, `sai-archive`, `sai-pr`, `sai-backfill`) in `sai/commands/`: when `$ARGUMENTS` is empty, fetch and run the picker before any other processing, and substitute the result for `$ARGUMENTS` for the remainder of the command exactly as if the user had typed it.
- Document the picker as a shared instruction in `AGENTS.md`'s "How to modify this repo" section.
- `sai-1-spec` is explicitly out of scope — it creates a new change rather than consuming an existing name, so it has nothing to pick from.

## Capabilities

### New Capabilities
- `change-picker`: shared instruction that lists active OpenSpec changes and resolves a single confirmed change name when the invoking command was not given one.

### Modified Capabilities
- (none — the ten consuming commands change their invocation flow, not their spec-level output contracts; no existing capability spec describes command-invocation behavior for these commands, so this is captured entirely by the new `change-picker` capability plus command-body wiring, which is implementation not spec-owned behavior)

## Impact

- **New file**: `sai/instructions/change-picker.md`.
- **Modified files**: `sai/commands/sai-2-design.md`, `sai/commands/sai-3-implement.md`, `sai/commands/sai-4-apply.md`, `sai/commands/sai-5-review.md`, `sai/commands/sai-6-security.md`, `sai/commands/sai-7-performance.md`, `sai/commands/sai-8-accessibility.md`, `sai/commands/sai-archive.md`, `sai/commands/sai-pr.md`, `sai/commands/sai-backfill.md`.
- **Not modified**: `commands/claude/sai-*.md` and `commands/opencode/sai-*.md` thin wrappers (they only fetch the `sai/commands/` body, which is where the picker call is inserted).
- **Not modified**: `sai-1-spec.md` (creates changes, doesn't consume a name).
- **Documentation**: `AGENTS.md` "How to modify this repo" section gets a short paragraph noting the picker is a shared instruction (mirror discipline applies: one edit to `change-picker.md` propagates to all ten consumers, no per-command duplication).
- **Dependency**: uses `openspec list --json` only — no new external dependency.
- **Backward compatibility**: when a change name is provided in `$ARGUMENTS`, the picker step is skipped entirely — zero behavior change for the existing flow.

## Proposal Research Documentation

**Local files**:
- `AGENTS.md` — repo structure, wrapper/instruction conventions, mirror discipline, "How to modify this repo" section.
- `sai/commands/sai-1-spec.md`, `sai/commands/sai-2-design.md`, `sai/commands/sai-4-apply.md`, `sai/commands/sai-archive.md`, `sai/commands/sai-backfill.md` — current command body structure (`## Prerequisite checks` → `## Load behaviors` → `## Load instructions` → `## Run` → `## Completion`) and the `**User's request:** $ARGUMENTS` convention.
- `sai/instructions/prereqs.md` — pattern for a shared, fetched instruction consumed identically by multiple commands.
- `openspec/config.yaml` — confirmed `schema: sai-workflow`.

**External URLs**: none.

## Additional Notes

- Verified with `openspec list --json` that the CLI already returns exactly the fields needed for the picker (`name`, `status`, etc.) with no extra flags required.
- All ten consuming command bodies have now been read directly (`sai-2-design`, `sai-3-implement`, `sai-4-apply`, `sai-5-review`, `sai-6-security`, `sai-7-performance`, `sai-8-accessibility`, `sai-archive`, `sai-pr`, `sai-backfill`). Eight of them (`sai-2-design`, `sai-5-review`, `sai-6-security`, `sai-7-performance`, `sai-8-accessibility`, `sai-archive`, `sai-pr`, `sai-backfill`) share the identical body shape: `## Prerequisite checks` → `## Load behaviors` → `## Load instructions` → `## Run` (`**User's request:** $ARGUMENTS`, except `sai-8-accessibility` which labels it `**User's accessibility audit request:** $ARGUMENTS`). For these, the picker instruction should be fetched as the first step under `## Load instructions` so a confirmed name is available before any other processing runs.
- Two commands deviate and need special placement, confirmed by direct reading:
  - `sai-3-implement.md` has no `## Load instructions`/`## Run` of its own — it has `## Prerequisite checks` (which includes an "Also verify" block checking `openspec/changes/{change-name}/proposal.md` and `design.md` exist, i.e. it already references `{change-name}` directly) followed by `## Load behaviors` and then `## Invoke implementation`, which fetches `sai/instructions/implement-invocation.md` and runs its own Load/Run/Completion. Because the "Also verify" prereq checks consume `{change-name}` directly, the picker MUST run before those checks — i.e. as the very first step, ahead of `## Prerequisite checks` — not merely ahead of `## Load instructions`. `implement-invocation.md` itself is also fetched by the "continue now" branch of `sai-2-design` with an already-resolved name in scope, so the picker must NOT be embedded inside `implement-invocation.md` — it belongs only in `sai-3-implement.md`'s own body, before its prereq checks.
  - `sai-4-apply.md` has the same pattern: its "Also verify" block checks `openspec/changes/{change-name}/implementation.md` directly inside `## Prerequisite checks`. Same conclusion: the picker must run before `## Prerequisite checks`, not just before `## Load instructions`.
  - All other eight commands have no per-command "Also verify" block referencing `{change-name}` in their prereqs, so inserting the picker at the top of `## Load instructions` (after the universal `sai/instructions/prereqs.md` checks) is sufficient for them.
- Open questions the design phase must resolve (non-normative gotchas, not spec-level requirements — the `change-picker` spec intentionally states behavior, not mechanics):
  - Single-change confirmation: what happens on input that is neither yes nor no (e.g. "asdf")? The multi-change picker's requirement already says "reject and re-prompt"; the single-change path should behave symmetrically, but the exact accepted token set (`y`/`n`, `yes`/`no`, case sensitivity, language) is unresolved.
  - Multi-change picker: the requirement says "reject and re-prompt" with no retry cap — design should decide whether to bound retries (e.g. stop after N invalid attempts) or allow unbounded re-prompting.
  - `$ARGUMENTS` substitution mechanics: how the resolved name is threaded into the rest of a fetched-markdown TASK block is an orchestration detail for the design phase, not a spec-level concern.
