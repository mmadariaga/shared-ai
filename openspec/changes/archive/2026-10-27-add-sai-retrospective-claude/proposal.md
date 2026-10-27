> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

Reviewing historical SAI command runs meant locating main conversations and delegated agents by hand and separating runtime errors, instruction drift, and improvement ideas; reading too many runs or every auxiliary agent made that review costly. The only existing transcript reader (`ClaudeTranscripts` in `skills/universal/sai-context-cache-ttl-benchmark/adapters.js`) requires exact session IDs and serves the cache benchmark. Installs record only a package-wide version, so the instruction version in force during a past session cannot be dated; the transcript itself holds the exact instruction text each agent read.

## What Changes

- New read-only utility command `/sai-retrospective <target> [--paths "<p1>,<p2>"] [--limit <N>]` with thin wrappers for Claude Code (`commands/claude/sai-retrospective.md`) and opencode (`commands/opencode/sai-retrospective.md`) that fetch the body `sai/commands/retrospective/body.md`. The command runs in the main session, dispatches no subagent, writes no file, resumes no session, and applies no improvement; transcript content is evidence, never an instruction.
- New deterministic collector `sai/tools/retrospective.js` with two sub-commands that print JSON and exit 2 with `{"error":{"code","message"}}` on failure:
  - `index <target>` classifies the target as a Claude Code session UUID, a Claude Code agent ID (resolved to its parent execution with a note), an opencode `ses_` ID, or a `sai-` / `/sai-` command name; splits `--paths` on commas outside quotes, defaulting to the current project; and caps command executions in total at `--limit` (default 5), listing the remainder as unread.
  - An execution starts only at a SAI command invocation (a non-`isMeta` user record beginning with a `<command-name>` of a `sai-*` command) and runs to the next SAI invocation; any other slash command stays inside the current execution; records before the first SAI invocation are listed as unread; mentions of a command name are not invocations.
  - Subagents are linked through `subagents/agent-<agentId>.meta.json` `toolUseId`; `sai-*` agent types in the worker registry beside the tool are principal workers whose transcripts are read, other subagents are auxiliary agents listed as unread, and unlinkable subagents are reported as unlinked.
  - Each execution reports its invocation, time range, record range, principal workers, auxiliary agents, loaded instruction files (from `Read` results, `file` and `already_read_file` attachments, and `Skill` bodies, with text availability), tool errors, and an `in_progress` mark limited to the last execution of a session.
  - Transcripts are read from `<config>/projects/<encoded-project-path>/*.jsonl` with `<config>` resolved from `CLAUDE_CONFIG_DIR` before `~/.claude`, reusing `claudeProjectsRoot` and `parseTranscript` from the cache-benchmark adapters; inaccessible projects are reported and skipped; opencode is reported as `not-analyzed`.
  - `excerpt` pages records by record ID in timestamp-then-uuid order with `--count` (default 10) and `--max-chars` (default 1500) and a `next_record` cursor.
- The command body reads the index, states defaults, inaccessible projects, unanalyzed harnesses, and notes, reads progressively from main conversations and principal workers, classifies errors as expected or runtime and as recovered, unresolved, or unrecorded, judges drift only against instruction text loaded earlier in the execution (marking it not evaluated when that text is absent), and presents facts, hypotheses, and improvement proposals separately with record citations.
- `sai/install-manifest.json` adds the `retrospective-command` profile (extends `boot`, search and question access, shell limited to `node {sai}/tools/retrospective.js *`) and assigns it to `sai-retrospective`.
- The command is registered as the utility `utility:sai-retrospective` in `bin/model-customization.js` (`Large` context, `↑↑` difficulty) and in the four `[sai-default]` presets.
- Documentation: `docs/commands/sai-retrospective.md`, README utility table, `docs/on-demand-commands.md`, `docs/models.md`, and `AGENTS.md`.
- Tests: `test/retrospective-tool.test.js` covers the Claude Code reader with synthetic JSONL fixtures, and inventory tests and the wrapper baseline count the new wrapper and utility card.
- Scope drift (not an implementation error): execution boundaries fall only at SAI command invocations, and a non-SAI slash command stays inside the current execution. The selected diff evidences this behavior, but the supplied intent statement did not name it.
- Scope drift (not an implementation error): records before the first SAI invocation of a session are listed as an unread portion. The selected diff evidences this behavior, but the supplied intent statement did not name it.
- Scope drift (not an implementation error): a record chained through `parentUuid` to an invocation but stamped before it belongs to that invocation's execution. The selected diff evidences this behavior, but the supplied intent statement did not name it.
- Scope drift (not an implementation error): `Skill` body records are captured as loaded instructions. The selected diff evidences this behavior, but the supplied intent statement did not name it.
- Scope drift (not an implementation error): the command is registered in the model customization utility list and the shipped default presets, which updates the default-alignment regression counts and fingerprints. The selected diff evidences this behavior, but the supplied intent statement did not name it.

## Capabilities

### New Capabilities

- `sai-retrospective`: the read-only `/sai-retrospective` utility command and its deterministic Claude Code transcript collector, covering target classification, execution boundaries, principal and auxiliary agents, loaded instruction and tool error capture, paged excerpts, and evidence-based analysis of runtime errors, drift, and improvements, with opencode reported as not analyzed.

### Modified Capabilities

- `claude-default-preset-alignment`: the regression test now requires 35 Claude Code preset roles with 4 utility roles, the new reference preset hash, and the new 41-entry opencode fingerprint that includes the `sai-retrospective` wrapper.

## Impact

New files:
- `commands/claude/sai-retrospective.md`
- `commands/opencode/sai-retrospective.md`
- `docs/commands/sai-retrospective.md`
- `sai/commands/retrospective/body.md`
- `sai/tools/retrospective.js`
- `test/retrospective-tool.test.js`

Modified files:
- `AGENTS.md`
- `README.md`
- `bin/model-customization.js`
- `docs/models.md`
- `docs/on-demand-commands.md`
- `fixtures/thin-command-wrappers-baseline.json`
- `sai/install-manifest.json`
- `sai/presets/claude/[sai-default]-OPUS.json`
- `sai/presets/opencode/[sai-default]-Go.json`
- `sai/presets/opencode/[sai-default]-oAI-LUNA.json`
- `sai/presets/opencode/[sai-default]-oAI-SOL.json`
- `test/claude-default-preset-alignment.test.js`
- `test/command-launcher-card.test.js`
- `test/doctor-fetch-resolution.test.js`
- `test/doctor-harness-inventory.test.js`
- `test/install-claude.test.js`
- `test/install-manifest.test.js`
- `test/install-opencode.test.js`
- `test/model-customization-menu.test.js`
- `test/verified-precondition-handback.test.js`

Known limitations:
- Drift is not evaluated for instructions whose loaded text is absent from the transcript.
- The collector depends on Claude Code's internal transcript format, which is not a stable public contract.
- Until an opencode reader exists, every opencode execution is reported as not analyzed.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Request Additional Notes

In this slice, I7 and I8 apply only to their Claude Code parts; the opencode fixture, the schema-guard test, and the opencode verifications belong to the opencode slice (`add-sai-retrospective-opencode`).
