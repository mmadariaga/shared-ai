# Design: budget-subagent-skill

## Context

`budget-executor` provides a cheap shell-command subagent binding (General+haiku, no tool-call cap, raw output allowed). It covers discrete commands that return exit codes and log streams.

There is no equivalent binding for general-purpose task delegation — cases where the caller hands off a multi-step task (file reads, searches, writes, code analysis) and needs a concise structured outcome, not raw command output.

`budget-subagent` fills this gap. It follows the same cost-discipline pattern as `budget-executor` but is scoped to tasks: structured completion report, soft tool-call cap, no raw dumps.

The project already has an established pattern for platform-specific skill variants:
- `skills/claude/<name>/SKILL.md` — hardcodes Claude Code binding parameters
- `skills/opencode/<name>/SKILL.md` — resolves model from `opencode.jsonc` config
- Install tools copy the appropriate variant to the platform's skill directory under the generic name
- The universal loader fetches by generic name, resolving to whichever variant was installed

## Goals / Non-Goals

**Goals**
- New `skills/claude/budget-subagent/SKILL.md` binding (General, model: haiku, ~30-call soft cap, structured report)
- New `skills/opencode/budget-subagent/SKILL.md` binding (subagent agent keyword, model from config)
- `configs/opencode.jsonc` gains a `"subagent"` entry under `"agent"`, parallel to `"executor"`
- `skills/universal/budget/SKILL.md` loader updated to include `budget-subagent` as the 4th skill
- `INSTALL.claude.md` and `INSTALL.opencode.md` gain copy steps for `budget-subagent` after existing `budget-executor` steps
- `bin/install-flow.js` `installClaude()` and `installOpencode()` gain a `copyWithWarn` call for `budget-subagent`; `copyOpencodeConfig()` gains a `subagent` block in its printed snippet

**Non-Goals**
- No changes to `budget-executor` behavior or files
- No universal `skills/universal/budget-subagent/SKILL.md` — platform variants are installed under the generic name (same as executor)
- No new test helper infrastructure — existing `copyWithWarn` pattern is sufficient

## Decisions

### 1. Behavioral rules authored once, copied to both platform files

**Decision**: The Universal Behavior section (6 rules) is identical in both Claude and Opencode SKILL.md files. The only differing section is the platform binding.

- **Hard to reverse**: No. The files are independent; divergence would be detected at review.
- **Surprising without context**: Mild — a reader might expect a shared universal variant to exist. The proposal explicitly explains why there isn't one (the platform install copies the right variant under the generic name).
- **Real trade-off**: Yes. Alternative: a `skills/universal/budget-subagent/SKILL.md` loaded by platform-specific shims. This would avoid duplication but adds a third file and a fetch layer for no runtime benefit. The executor precedent confirms the copy-in-place pattern is the project convention.

**Chosen approach**: Copy behavioral rules into both platform files, document that they must be kept in sync.

### 2. Soft cap of ~30 tool calls (vs. no cap for budget-executor)

**Decision**: `budget-subagent` uses a soft cap of ~30 tool calls; `budget-executor` has no cap.

- **Hard to reverse**: No. The cap is guidance in skill text, not a harness enforcement.
- **Surprising without context**: Yes. Why does one sibling have a cap and the other doesn't?
- **Real trade-off**: Yes. Executor runs discrete shell commands — each invocation is bounded by the command itself. Tasks can involve unbounded multi-step work (read N files, search M times). Without a ceiling the subagent can drift. The 30-call figure comes from the proposal notes and aligns with the `budget-explorer` audit cap.

**Alternatives considered**:
- No cap (same as executor): rejected — task subagents can loop on multi-file work indefinitely.
- Hard cap (harness-enforced): not possible — `subagent_type: General` has no harness cap parameter.

**Chosen approach**: Soft behavioral cap (~30 calls), stop with `status: partial` and list remaining work.

### 3. `status: partial` as a distinct completion state

**Decision**: The structured report has three states: `success | partial | failed`. `partial` means "some steps done, at least one not."

- **Hard to reverse**: Low — the report format is defined in the skill text and can be updated.
- **Surprising without context**: No — `partial` is self-explanatory.
- **Real trade-off**: Yes. Alternative: only `success` / `failed`. But a task that reads 4 of 5 files and hits the cap is neither a success nor a failure; collapsing it to `failed` would force the caller to re-run everything. `partial` lets the caller resume from where the subagent stopped.

### 4. Permission-block-aborts is behavioral, not harness-enforced

**Decision**: The `permission-block-aborts` requirement is expressed as a behavioral rule in the skill text. The harness does not enforce it; the subagent is instructed to self-report and abort.

- This is the same enforcement model as all other skill rules — skill text = instruction, not constraint.
- A subagent that silently hangs on a permission prompt violates the skill contract. In practice, Claude Code's Agent tool surfaces unresolved permission prompts to the caller; the rule prevents the subagent from retrying.

### 5. Opencode agent keyword: `budget` (not `subagent`)

**Decision**: The Opencode config key and agent keyword use `budget`, not the spec-proposed `subagent`.

- **Hard to reverse**: Low — the key lives in user config files; each existing user must update their `opencode.jsonc` manually when the keyword changes.
- **Surprising without context**: Yes — the spec says `subagent`, the first implementation used `cheap`, and the final name is `budget`. A reader following the spec would use the wrong key.
- **Real trade-off**: Yes. Three candidates were evaluated:
  - `subagent` (spec default): describes the mechanism, not the cost tier; creates no connection to the sibling skills
  - `cheap`: short but not aligned with the `budget-*` skill family; negative connotation
  - `budget`: consistent with `budget-explorer`, `budget-executor`, `budget-subagent` naming; clearly communicates the cost tier without denigrating the model quality

**Chosen approach**: `budget` — matches the skill family naming convention and aligns with the cost-discipline framing used throughout the README.

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| Behavioral rules diverge between Claude and Opencode files over time | Keep both files in the same PR; reviewer must diff them against each other |
| Opencode users with existing installs miss the `subagent` config block | `INSTALL.opencode.md` explicitly documents the manual addition; `copyOpencodeConfig()` printed snippet includes the block |
| 30-call soft cap is only behavioral; a misbehaving subagent can ignore it | Acceptable — same limitation applies to all current skills; harness caps not available for General subagents |
| `status: partial` semantics undefined for callers who only check `success`/`failed` | The skill instructs callers to handle all three states; this is a documentation concern, not a runtime risk |

## Migration Plan

1. **New files** — create `skills/claude/budget-subagent/SKILL.md` and `skills/opencode/budget-subagent/SKILL.md`. No existing code touched.
2. **Additive config change** — add `"subagent"` block to `configs/opencode.jsonc`. Existing `"executor"` entry unchanged.
3. **Additive loader change** — add one `Fetch` line to `skills/universal/budget/SKILL.md`. Existing three lines unchanged.
4. **Install doc updates** — insert copy steps in `INSTALL.claude.md` and `INSTALL.opencode.md` after existing `budget-executor` blocks.
5. **Installer script updates** — add `copyWithWarn` calls in `bin/install-flow.js` after existing executor calls.
6. **Test updates** — add `budget-subagent` to skill presence assertions in `test/install-claude.test.js` and `test/install-opencode.test.js`.

**Rollback**: all changes are additive. Reverting means deleting the two new skill files and removing the added lines from 5 existing files. No data migration required.

**Opencode existing users**: must manually add the `"subagent"` block to their `opencode.jsonc`. This is documented in `INSTALL.opencode.md` and surfaced by `copyOpencodeConfig()`.

## Open Questions

_None — all decisions resolved from specs and codebase research._
