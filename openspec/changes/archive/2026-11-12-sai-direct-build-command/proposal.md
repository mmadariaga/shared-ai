> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

Direct Build was reachable only through the interactive `/sai-explore` route picker, so the outcome benchmark could not launch it headless or start the plan route and the Direct Build route from the same block. This change adds a non-interactive `/sai-direct-build` command that runs the Direct Build route from a verified block file on Claude Code and opencode, and ends with the closing literal `Direct build done.` that the benchmark reads to classify the Direct Build route.

## What Changes

- New command `/sai-direct-build --block-file <path> --block-hash <sha256>`, with mirrored wrappers `commands/claude/sai-direct-build.md` and `commands/opencode/sai-direct-build.md` that fetch the harness fetch skill and `sai/commands/direct-build/coordinator.md` and forward `command_name: direct-build` with `arguments_value`.
- New coordinator card `sai/commands/direct-build/coordinator.md`:
  - drops `--fast-track` and `--supervised` silently, requires exactly one `--block-file` and one `--block-hash` and nothing else, and otherwise ends with `Cannot start /sai-direct-build: pass --block-file <path> and --block-hash <sha256> (the pair that sai-state block --export returns).`, writing nothing;
  - verifies the block with `ready-to-propose.js verify-file`; a missing, unreadable, unsafe, or mismatched file ends the run with `Cannot start /sai-direct-build: the block file does not verify against --block-hash ({problem}).`, writing nothing and dispatching nothing; a block without a `Change name` line ends the run the same way;
  - follows `sai/commands/explore/direct-build-coordinator.md` as its run, acting as the card's block provider with the verified pair, with no `sai-state` store, route state, slice machine, or explore Resume, and skipping the backlog implementation start;
  - pre-authorizes exactly one local commit (the archived change), records no change telemetry, and never pushes;
  - escalates through the native picker under the obstacle policy; an unanswered or dismissed escalation ends with the stop report and no closing literal;
  - disposes every worker and helper before the closing report and prints `Direct build done.` as the last line only when the archive worker returned a clean `completed` result and the archive commit is confirmed.
- New capability profile `direct-build-command` in `sai/install-manifest.json` (a mutation coordinator with temp-only writes, task stop, the `safe-operations` and `fetch` skills, `transfer.js` shell access, and delegation to the executor, the explorer, `sai-direct-build-worker`, `sai-backfill-worker`, and `sai-archive-worker`), assigned to `sai-direct-build`.
- Model customization: `bin/model-customization.js` lists `command:sai-direct-build` (context Large, difficulty ↑↑↑) after `sai-build` in the implementation phase group, and every default preset under `sai/presets/` carries a `command:sai-direct-build` entry equal to its `sai-build` entry; `docs/models.md` shows the new orchestrator row.
- Documentation: new page `docs/commands/sai-direct-build.md`, a row in `README.md` and `docs/on-demand-commands.md`, and `AGENTS.md` rows and a `### Direct Build command (/sai-direct-build)` section.
- The outcome benchmark's Direct Build route now launches an existing command whose closing literal matches the literal the runner reads (`Direct build done.`); the runner code itself is unchanged.
- Tests: new `test/direct-build-command.test.js`; `test/command-launcher-card.test.js`, `test/claude-default-preset-alignment.test.js`, `test/model-customization-menu.test.js`, and `fixtures/thin-command-wrappers-baseline.json` updated for the new wrapper and preset role.
- Scope drift (implemented, not named in the intent statement): the model-customization entries and default preset entries for the new command, and the documentation rows and pages above.

## Capabilities

### New Capabilities

- `direct-build-command`: run the Direct Build route unattended from a verified `--block-file` and `--block-hash` pair, with one local commit and the closing literal `Direct build done.`.

### Modified Capabilities

- `outcome-benchmark`: the Direct Build route launches the `/sai-direct-build` command and is classified by the closing literal that command prints.
- `stored-block-dispatch`: `/sai-direct-build` is the one exception to taking blocks only from `sai-state`; its verified caller-supplied pair serves every dispatch of its run.
- `block-integrity-verification`: the `/sai-direct-build` coordinator verifies its `--block-file` and `--block-hash` pair with `verify-file` before any work.
- `contract-tool-capabilities`: twenty-seven command-requirement assignments, twenty-two of them SAI commands, with `sai-direct-build` assigned the `direct-build-command` profile.
- `claude-default-preset-alignment`: 36 Claude Code preset roles (16 command roles), the new reference preset hash, and 43 generated opencode entries with their new fingerprint.
- `model-customization-menu`: `command:sai-direct-build` as a customization target between `sai-build` and `sai-3-implement`.

## Impact

New files:

- `commands/claude/sai-direct-build.md`
- `commands/opencode/sai-direct-build.md`
- `sai/commands/direct-build/coordinator.md`
- `docs/commands/sai-direct-build.md`
- `test/direct-build-command.test.js`

Modified files:

- `AGENTS.md`
- `README.md`
- `bin/model-customization.js`
- `docs/models.md`
- `docs/on-demand-commands.md`
- `fixtures/thin-command-wrappers-baseline.json`
- `sai/install-manifest.json`
- `sai/presets/claude/[sai-default]-OPUS.json`
- `sai/presets/opencode/[sai-default]-claude+oGo-Opus+Deepseek.json`
- `sai/presets/opencode/[sai-default]-oAI-LUNA.json`
- `sai/presets/opencode/[sai-default]-oAI-SOL.json`
- `sai/presets/opencode/[sai-default]-oGo-Deepseek.json`
- `test/claude-default-preset-alignment.test.js`
- `test/command-launcher-card.test.js`
- `test/model-customization-menu.test.js`

Known limitations: none reported; the functional review found no findings.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill
