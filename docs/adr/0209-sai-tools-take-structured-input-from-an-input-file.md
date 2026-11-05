# ADR 0209: SAI tools take structured input from an input file

<!-- adr-index: amends 0207 -->

## Status

Accepted. Amends ADR 0207: its file delivery for Ready to Propose block sets extends to all structured tool input. ADR 0207 stays unedited.

## Context

Structured input (JSON events, reports, commit messages, selections, issue text) reached SAI tools on stdin, through `echo` pipes, quoted heredocs, or here-strings. A POC under a `node <tool> *`-only shell rule (verdict C3) showed that no stdin form works with JSON on both harnesses:

- Claude Code 2.1.318 denied a heredoc whose JSON body has a brace next to a quote character ("brace with quote character").
- opencode 2.2.5 denied the `echo` pipe, and corrupted heredoc JSON (10 bytes received for 8 sent).

ADR 0207 already moved block sets to files written with the native write tool into a `transfer.js open` directory. Every other structured input still used stdin.

## Decision

1. **Every tool accepts `--input-file <path>`.** Every SAI tool that reads structured input on stdin (`bin/sai-state.js` `emit`, `--progress` and `--ready-to-propose`, `worker-report-validator.js`, `validate-backfill-drafts.js`, `tool-access.js`, `ready-to-propose.js`, `commit.js apply`, `from-backlog.js`, `from-next-backlog-item.js`, `to-backlog.js`, `to-pr.js`, `new-change-branch.js`, `transfer.js put`, `merge.js`, and `sai-cache-warmer/wait.js`) reads it through the shared reader `sai/tools/input-reader.js`. The flag wins over stdin, the tool receives the file's bytes exactly, and a missing, unreadable, or empty file is a usage error (exit 2) that names the path and changes no state. Stdin stays accepted.
2. **Instructions prescribe the input file only.** An agent writes the input with the native file-write tool into a directory from `transfer.js open --harness <claude|opencode>`, outside the repository, one unique file per call, and passes its path with `--input-file`.
3. **Profiles that hand structured input get a scoped write.** The capability registry gains `write: "temp"`, compiled to the `Write` tool plus an `Edit(//<SAI temp root>/**)` path rule in the Claude Code allowed tools (Claude Code ignores path rules named `Write(...)`; `Edit(...)` covers the `Write` tool) and to an `edit` rule on `<SAI temp root>/*` for opencode. The coordinator, commit, backlog, branch, and cache-warmer commands and the read-only workers receive it, with `transfer.js open` where their shell is a pattern list.
4. **The budget-explorer keeps no write.** Its only structured input is the cache-warming wait, so `wait.js warm` takes an argv form (`--interval <n> --max <n> [--chain <id>]` to arm, `--state <token>` to re-arm) and its output carries an opaque base64url `state_token`. Nothing is typed as JSON and no file is written.

## Alternatives Considered

- **Prescribe heredoc everywhere** — rejected: Claude Code denies heredocs whose body has a brace next to a quote, which every JSON payload has.
- **Allow `echo` in every profile** — rejected: opencode denies the pipe regardless of segment grants.
- **Pass JSON as a command argument** — rejected: the same brace-and-quote shape the Claude Code heuristic flags; not tested.

## Consequences

- Every structured call costs one native write plus the tool call.
- Two input paths (file and stdin) exist until older instructions are gone.
- The scoped write cannot be path-limited for subagent `tools` on Claude Code, because an agent's `tools` list takes tool names only. That is why the explorer keeps no write and uses the argv form of the wait.
- `slice-path-scope.js` keeps plain path lines on stdin.

## Provenance

Change `structured-input-file-delivery`, decision "SAI tools take structured input from an input file".
