## Why

Today the only way to see how far an OpenSpec change has progressed is to manually list `openspec/changes/{name}/` and infer state from which `.md` files exist — error-prone (easy to miss `interfaces.md`, confuse `## Not Applicable` with absent, lose track of the specs approval gate key) and high-friction when resuming work. A dedicated read-only `/sai-status` command makes the progress panel discoverable, scriptable, and consistent across all 10 sai-workflow schema artifacts.

## What Changes

- Add a new read-only `/sai-status {change-name}` command that prints a compact progress panel for one OpenSpec change: which of the 10 sai-workflow schema artifacts exist, which audits are present or `## Not Applicable`, the specs approval state, the `implementation.md` checked-vs-total task count, the archive location if archived, and a `Next:` hint suggesting the appropriate `/sai-N-...` command.
- Derive artifact completion from `openspec status --change {name} --json` (the CLI is the single source of truth); fill gaps the CLI does not expose with targeted filesystem reads — `.openspec.yaml` (approval key), `## Not Applicable` audit headings, `implementation.md` `- [x]` count, and archive path.
- Add the body file `sai/commands/sai-status.md` plus three harness wrappers (`commands/claude/sai-status.md`, `commands/opencode/sai-status.md`, `commands/copilot/sai-status.prompt.md`), each restricted to read-only tools per its harness's mechanism.
- Join `sai-status` to the `change-picker.md` consumer list, bringing the documented consumer count from 9 to 10, so an invocation with no change name inherits the existing 0/1/N picker.
- Register the command in `skills/universal/sai-commands/SKILL.md`, `README.md`, and `AGENTS.md`.
- All new files and doc edits ship in one commit (three-harness mirror discipline).

## Capabilities

### New Capabilities
- `sai-status-progress-panel`: `/sai-status {change-name}` prints a compact board-view panel covering the 10 schema artifacts, the specs approval state, the `implementation.md` progress count, and a `Next:` command hint; read-only, no subagent dispatch, no `--fast-track` flag.
- `sai-status-change-picker`: invoked without a change name, `sai-status` inherits `change-picker.md`'s 0/1/N resolution and joins its documented consumer list (9 → 10).
- `sai-status-archive-aware`: the panel renders archived changes with their archive date and a closed-status note, with no checkbox interpretation.

### Modified Capabilities
<!-- None. change-picker.md gains a consumer by addition, which is covered by the new sai-status-change-picker capability; no change-picker requirement changes. -->

## Impact

- **New files**: `sai/commands/sai-status.md`, `commands/claude/sai-status.md`, `commands/opencode/sai-status.md`, `commands/copilot/sai-status.prompt.md`.
- **Edited files**: `sai/instructions/change-picker.md` (add `sai-status` to consumer list), `skills/universal/sai-commands/SKILL.md`, `README.md`, `AGENTS.md`.
- **Untouched**: `bin/install.js` and `bin/install-flow.js` copy `commands/copilot/*.prompt.md` and `sai/commands/*.md` via globs — the new files are picked up automatically.
- **Data sources**: `openspec status --change {name} --json` (CLI) plus targeted reads of `.openspec.yaml`, audit `.md` headings, `implementation.md`, and the archive directory.
- No production/runtime code, no schema change, no new dependency.

## Proposal Research Documentation

**Local files**: `sai/commands/sai-1-spec.md`, `sai/commands/sai-archive.md`, `sai/instructions/prereqs.md`, `sai/instructions/change-picker.md`, `sai/instructions/spec.propose.md`, `sai/instructions/remember.md`, `openspec/config.yaml`, `openspec/schemas/sai-workflow/schema.yaml`, `openspec/specs/sai-design-command/spec.md`, `openspec/specs/change-picker/spec.md`, `commands/claude/sai-archive.md`, `commands/opencode/sai-archive.md`, `commands/copilot/sai-archive.prompt.md`, `skills/universal/sai-commands/SKILL.md`, `AGENTS.md`, `README.md`

**External URLs**: <!-- None consulted -->

## Additional Notes

- The 10 sai-workflow schema artifacts are: `proposal`, `specs`, `design`, `tasks`, `interfaces`, `implementation`, `review`, `security`, `performance`, `accessibility`. `pr.md` is an output of `sai-pr` (`sai/instructions/pr.md`) and is NOT one of the 10 — it never appears as a panel checkbox, only as a candidate `Next:` hint when the relevant gates are met.
- `interfaces.md` is treated as EXEMPT in the panel, mirroring the archive classification (ADR 0023): its absence is never flagged as a problem.
- `## Not Applicable` audits are surfaced as present, mirroring `sai-archive.md`'s Classification Check so the two commands share semantics.
- Wrapper model tier stays at the cheap end (haiku / glm / GPT-5 mini), symmetric to `sai-archive`; the command is pure local I/O (one CLI call plus a handful of file reads — no broad search, no web fetch, no subagent).
- Tool-restriction mechanics differ per harness: Claude Code uses `allowed-tools`, opencode has no per-command tool-restriction frontmatter (read-only is model-discipline-only there, matching `sai-explore`'s current state), Copilot uses `tools:`.
- The specs approval gate key lives in `.openspec.yaml`; the panel reads it but MUST NOT write it.
- Out of scope: refactoring `change-picker.md` (it already supports new consumers by adding a name), unifying artifact-feedback-gate counters, and surfacing `pr.md` as a panel artifact.
