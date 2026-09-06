> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

The prose status-panel algorithm in `sai/commands/status/body.md` is a pure read-plus-decision-table with no judgement, yet it is paid for in tokens on every invocation and re-interpreted by the model each time. Moving this logic to a deterministic Node tool eliminates token overhead and ensures the panel derivation is never out of sync with the decision table. The extraction pattern was already proven in three other tools: `sai/tools/worktree.js`, `sai/tools/change-picker.js`, and `sai/tools/prereqs.js`.

## What Changes

Extracted the status-panel rendering algorithm from `sai/commands/status/body.md` (Steps A–E) into two new tools:

- **`sai/tools/status.js`** — A new deterministic tool that replaces the prose algorithm. It has two sub-commands:
  - `panel <name>` — Renders the status panel for a single change by invoking `openspec status`, reading `.openspec.yaml`, and applying the decision table to determine artifact presence, specs approval, and the Next hint.
  - `bulk` — Renders the status table for all changes by invoking `openspec list --json`, then parallelizing `openspec status` calls for each change and deriving each row identically to the single-change panel.

- **`sai/tools/openspec-yaml.js`** — A shared utility module for reading `.openspec.yaml` by regex (zero external dependencies), extracting `approval.specs.approved_at`, `overview.state`, and `backfilled` status. This module is reusable by the status tool and the linter.

Thinned `sai/commands/status/body.md` from 70 lines (Steps A–E algorithm) to 48 lines (prerequisites, picker invocation, tool dispatch, output relay). The command now has no decision logic or prose derivation; it simply invokes the tool and relays its output.

Added comprehensive behavior tests in `test/status-tool.test.js` covering all 10 edge cases (E1–E10) and the decision table resolution (Step E). Tests verify the tool's deterministic behavior for archived changes, YAML parsing, overview state conjunction, Not Applicable audits, implementation progress counting, and Next hint resolution.

Modified `test/change-overview-contract.test.js` to reference the new tool location (`sai/tools/status.js` instead of `sai/commands/status/body.md`).

## Capabilities

### New Capabilities

**`thin-command-surface`** — Reduce the status command to a thin wrapper: prerequisites, picker dispatch, tool invocation with `--json` flag, and output relay. Remove all decision logic and prose-based derivation from the command file.

### Modified Capabilities

**`sai-status-progress-panel`** — The single-change panel rendering is now deterministically derived by the `sai/tools/status.js` tool rather than by prose in the command body. All requirements remain: the 11 artifacts in canonical order, interfaces exemption, overview state read from `.openspec.yaml` with conjunction logic (current only when metadata current AND file done), Not Applicable audit detection, specs approval state from `.openspec.yaml` with three-state rendering (approved, present-but-unapproved, absent), implementation progress counted as checked/total, and Next hint resolved by decision table. The tool adds explicit handling of the two overview inconsistency directions (current metadata with missing file, and file present with non-current metadata), both rendering as problem states.

**`sai-status-archive-aware`** — Archive detection is now performed deterministically by the tool, parsing the `YYYY-MM-DD-{name}` directory name to extract the date without invoking the CLI on a non-live change name. The closed-status display and checkbox-skip behavior remain unchanged.

**`bulk-status-table`** — Bulk table rendering is now handled by the tool with parallelized per-change `openspec status` calls for improved performance. Partial failures are handled gracefully: a change whose status gathering fails is marked with an ERROR flag in its row, and the table continues rendering remaining rows. All existing semantics remain: one row per active change, cells reuse single-change panel derivation, implementation progress shown as checked/total, Next hint resolved by the same algorithm, and read-only constraint. The tool adds a graceful message for empty change lists and a legend explaining cell symbols.

## Impact

### New Files
- `sai/tools/status.js` — 737 lines, the deterministic status-panel and status-bulk engine
- `sai/tools/openspec-yaml.js` — 86 lines, shared YAML reader for other tools
- `test/status-tool.test.js` — 542 lines (25 tests), behavior tests for the status tool (E1–E10 edge cases, decision table resolution, integration tests)

### Modified Files
- `sai/commands/status/body.md` — Reduced from 70 lines (prose algorithm) to 48 lines (task template with prerequisites, picker, tool invocation)
- `test/change-overview-contract.test.js` — Updated artifact reference from `sai/commands/status/body.md` to `sai/tools/status.js`

### Test Results
`test/status-tool.test.js` defines 25 tests, all passing. The full test suite sits at exactly the 8 pre-existing baseline failures, none of which relate to this change.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill
