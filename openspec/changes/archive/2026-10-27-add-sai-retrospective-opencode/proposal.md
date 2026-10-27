> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

`/sai-retrospective` must cover command runs from both supported harnesses, but its collector read only Claude Code transcripts and reported opencode as not analyzed. opencode v2.2.0 exposes complete session data with parent links only in its local database: its HTTP API returned 404 for `/api/session/{id}/children` and truncated `/api/session/{id}/message` responses at about 262 KB, and `opencode export` is not available in that version.

## What Changes

- `sai/tools/retrospective.js` gains an opencode reader. It opens `opencode.db` in `$XDG_DATA_HOME/opencode` (default `~/.local/share/opencode`) read-only through `node:sqlite` and never uses the opencode HTTP API.
- A schema guard checks every table and column the reader uses (`session_v2`: `id`, `parent_id`, `agent`, `title`, `directory`, `time_created`; `session_message`: `id`, `session_id`, `type`, `seq`, `time_created`, `data`) before any query. A missing database, a runtime without `node:sqlite` (Node earlier than 22.13), a file that cannot be opened read-only, a failed guard, or an SQLite read error reports opencode as `not-analyzed` with the reason and contributes no opencode data, while the Claude Code data is still read.
- opencode executions start at a user record that carries an `InvocationEnvelope` with `command_name`; the envelope name is mapped to the SAI command declared in the registry beside the tool (for example `design` to `sai-2-design`). Records are conversation messages of `session_message` ordered by `seq`, addressed by their message ID.
- Child sessions (`session_v2.parent_id`) are linked to the execution that began at or before their creation, nested children following their parent. A child whose `agent` is a SAI worker in the registry is a principal worker whose records are read; other children are auxiliary agents; children created before the first invocation are unlinked.
- For opencode, loaded instructions are captured from `read` tool results, `skill` tool results (the skill's `SKILL.md` under its base directory), and synthetic read records; tool items whose state is `error` are tool errors. Records whose data is not valid JSON are listed as an `unparseable-records` unread portion.
- `index` with a command target reads both harnesses and merges their executions into one newest-first list, with `--limit` applied to the merged list. An opencode `ses_` target reads only opencode; a child session target resolves to its parent execution with a note. A Claude Code session or agent target reads only Claude Code.
- Every project entry names its harness. A supplied project with no opencode session is reported `inaccessible` for opencode.
- `excerpt` accepts an opencode `ses_` session and, as `--agent`, a `ses_` child session of it, and pages its records by record ID; each opencode record holds its tool calls and their results together (`tool_uses`, `tool_results`). When opencode cannot be read, `excerpt` fails with code `OPENCODE_UNAVAILABLE`.
- The command body, `docs/commands/sai-retrospective.md`, `docs/on-demand-commands.md`, and `AGENTS.md` describe the opencode source, the child session term, the merged selection, and the not-analyzed reasons.
- `test/retrospective-tool.test.js` covers the opencode reader with SQLite databases built in the test (parent and child sessions), including the schema-guard failure path, a non-database file, a runtime without `node:sqlite`, the merged `--limit`, child session targets, opencode excerpts, and an unchanged database file after reading.
- Scope drift (not an implementation error): the opencode invocation envelope name is mapped to the registry's SAI command name. The selected diff evidences this behavior, but the supplied intent statement did not name it.
- Scope drift (not an implementation error): `excerpt` pages opencode sessions and child sessions and fails with `OPENCODE_UNAVAILABLE` when opencode cannot be read. The selected diff evidences this behavior, but the supplied intent statement did not name it.
- Scope drift (not an implementation error): every project entry names its harness, and a project without an opencode session is reported `inaccessible` for opencode. The selected diff evidences this behavior, but the supplied intent statement did not name it.
- Scope drift (not an implementation error): opencode records whose data is not valid JSON are listed as an `unparseable-records` unread portion. The selected diff evidences this behavior, but the supplied intent statement did not name it.

## Capabilities

### New Capabilities

- None

### Modified Capabilities

- `sai-retrospective`: the collector reads opencode executions and their child sessions from the local opencode database (read-only, behind a schema guard) and merges them with Claude Code executions under one `--limit`; opencode is reported as not analyzed only when its data cannot be read.

## Impact

Modified files:
- `AGENTS.md`
- `docs/commands/sai-retrospective.md`
- `docs/on-demand-commands.md`
- `sai/commands/retrospective/body.md`
- `sai/tools/retrospective.js`
- `test/retrospective-tool.test.js`

Known limitations:
- The collector depends on opencode's internal database schema; a schema change disables opencode analysis until the guard and reader are updated.
- Accepted deviation from I4: the reader uses opencode's current tables `session_v2` and `session_message` instead of the planned `session`, `message`, and `part`, which in opencode v2.2.0 hold only sessions up to 2026-07-09.
- `package.json` keeps `node >=22`; a runtime earlier than Node 22.13 lacks `node:sqlite` and reports opencode as not analyzed instead of raising the minimum version.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Request Additional Notes

In this slice, I7 and I8 apply to their opencode parts; the Claude Code parts were delivered by `add-sai-retrospective-claude`. The issue origin travels on this final slice so the issue closes only when both harnesses are covered.
