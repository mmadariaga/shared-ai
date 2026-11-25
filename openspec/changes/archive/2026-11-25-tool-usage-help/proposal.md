> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

When an agent invoked a deterministic SAI tool with a wrong argument, it rarely got an example of the correct call: only `commit` printed one. Many agent-facing tools had no `--help`, several reported a usage error as a JSON object without the correct invocation form, three of them (`validate-backfill-drafts`, `backfill-no-specs`, `new-change-branch`) exited 1 on a usage error, the same code as a domain failure, no tool scoped its help to one subcommand, and the precedence of `--help` over argument validation differed between tools. The agent then reconstructed the invocation from prose in policies and command cards, which cost a failed turn plus a research pass.

## What Changes

- New shared renderer `sai/tools/usage.js`: it detects `--help` (or `-h`) in any position of `argv`, recognizes the subcommand from a tool's declaration, validates a call against the declaration (unknown flag, missing value, unaccepted positional, invalid enum or pattern value, unknown or missing subcommand), renders the text block (optional cause, `Usage:` lines, optional notes, `Examples:`), renders the `{usage, examples}` fields that JSON tools merge into their existing objects, and lints a declaration (every entry has a usage line and an example, and every example is accepted by the declaration and calls its own subcommand).
- The 36 agent-facing tools (`commit`, `to-pr`, `to-backlog`, `from-backlog`, `from-next-backlog-item`, `file-manifest`, `check-delta-headers`, `scenario-coverage`, `test-select`, `validate-backfill-drafts`, `backfill-no-specs`, `worker-report-validator`, `risk-signals`, `change-document`, `change-telemetry`, `decision-records`, `tool-access`, `prereqs`, `change-picker`, `transfer`, `temp-root`, `dispose-shells`, `project-settings`, `archive-plan`, `check-cited-paths`, `lint`, `merge`, `worktree`, `review-delta`, `slice-path-scope`, `no-commit-guard`, `status`, `opencode-dispatch`, `new-change-branch`, `retrospective`, and `bin/sai-state.js`) each declare an exported `USAGE` constant beside their parser, as a map of subcommand to `{usage, examples}` (one general entry for a tool without subcommands), and run the shared guard at their entry point before any work.
- `--help` and `<subcommand> --help` exit 0, validate no argument, and print the general block or only the recognized subcommand's block.
- A wrong invocation exits 2 with no side effect and names the offending argument, followed by the `Usage:` line and examples of the recognized subcommand (or the general block, listing every subcommand, when none is recognized, including a call with no arguments).
- Text tools print the block to stderr on an error and to stdout on `--help`; JSON tools keep every existing key and value of their usage-error object on stdout and add `usage` and `examples`, and answer `--help` with a JSON object that carries `usage` and `examples` (`temp-root` and `transfer` keep their existing `--help` keys).
- `validate-backfill-drafts`, `backfill-no-specs`, and `new-change-branch` exit 2 on a usage error; their domain failures keep exit 1. Tools that printed usage to stdout on a bare call now print it to their error channel.
- `bin/sai-state.js` loads `usage.js` through the same repository/installed two-location lookup it uses for its other helpers, exits 2 naming the tried paths when neither exists, and keeps the exact wording of its existing verb-parser messages, followed by the usage block of the verb; `emit` declares one usage line per invocation shape.
- `sai/tools/commit.js` and `sai/tools/check-delta-headers.js` gained a `require.main === module` guard so their declarations can be required without running them.
- New `test/tool-usage.test.js` walks the 36 tools and fails when a tool has no usage declaration, when a subcommand its parser accepts has none, or when an example uses an undeclared subcommand or flag; it also checks `--help`, the bare-call usage error, and the JSON key preservation. Four existing tests were updated: the `backfill-no-specs` unknown-subcommand exit code (now 2), the `transfer` help read from its JSON `usage` field, the `merge` usage text, and the `sai-state` test layouts that now include `usage.js`.
- The `sai/tools/` row of `AGENTS.md` names `usage.js` and the help contract (`<tool> [<subcommand>] --help`, exit 2 on usage errors).

## Capabilities

### New Capabilities

- `agent-tool-usage-help`: the usage-help and usage-error contract of the agent-facing deterministic tools, rendered from per-tool usage declarations by the shared `sai/tools/usage.js`.

### Modified Capabilities

None

## Impact

- New files: `sai/tools/usage.js`, `test/tool-usage.test.js`.
- Modified tools: `bin/sai-state.js`, `sai/tools/archive-plan.js`, `sai/tools/backfill-no-specs.js`, `sai/tools/change-document.js`, `sai/tools/change-picker.js`, `sai/tools/change-telemetry.js`, `sai/tools/check-cited-paths.js`, `sai/tools/check-delta-headers.js`, `sai/tools/commit.js`, `sai/tools/decision-records.js`, `sai/tools/dispose-shells.js`, `sai/tools/file-manifest.js`, `sai/tools/from-backlog.js`, `sai/tools/from-next-backlog-item.js`, `sai/tools/lint.js`, `sai/tools/merge.js`, `sai/tools/new-change-branch.js`, `sai/tools/no-commit-guard.js`, `sai/tools/opencode-dispatch.js`, `sai/tools/prereqs.js`, `sai/tools/project-settings.js`, `sai/tools/retrospective.js`, `sai/tools/review-delta.js`, `sai/tools/risk-signals.js`, `sai/tools/scenario-coverage.js`, `sai/tools/slice-path-scope.js`, `sai/tools/status.js`, `sai/tools/temp-root.js`, `sai/tools/test-select.js`, `sai/tools/to-backlog.js`, `sai/tools/to-pr.js`, `sai/tools/tool-access.js`, `sai/tools/transfer.js`, `sai/tools/validate-backfill-drafts.js`, `sai/tools/worker-report-validator.js`, `sai/tools/worktree.js`.
- Modified tests: `test/backfill-no-specs.test.js`, `test/budget-report-delivery.test.js`, `test/merge-pre-launch-simulation.test.js`, `test/sai-state-progress-emit.test.js`.
- Modified documentation: `AGENTS.md` (`sai/tools/` row).
- `sai/install-manifest.json` is unchanged: the existing `sai-tools` projection installs `usage.js` for Claude Code and opencode.
- Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill
