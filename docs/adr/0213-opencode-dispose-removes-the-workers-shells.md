# ADR 0213: opencode dispose removes the worker's shells

<!-- adr-index: amends 0210; refs 0202 -->

## Status

Accepted. Amends ADR 0210: its opencode stop call (`shell.remove` of the outstanding shell, then `session.interrupt`) is replaced. ADR 0202 and archived changes stay unedited.

## Context

ADR 0210 made dispose unconditional and named the opencode stop call as `shell.remove` of the outstanding shell of the worker's session followed by `session.interrupt` through the session API. ADR 0202 had left the opencode stop unverified. Checked on opencode v2.2.6, that call cannot be run as written:

- `opencode api GET "/api/shell?location[directory]=<dir>"` lists shells with `id`, `status`, `pid`, and `metadata.sessionID`, and `opencode api DELETE "/api/shell/<id>?location[directory]=<dir>"` returns 204 and the process dies. The removed shell reaches its owning session as an error with `Shell.NotFoundError`.
- `POST /api/session/<child sessionID>/interrupt` returns 404 `SessionNotFoundError` for a child session, and aimed at the caller's own session it aborts the tool call that is running.
- No `OPENCODE_*` variable carries the server URL or credentials.
- The `--param` form of `opencode api` is silently ignored by the server, which then acts on its default directory instead of the one named.

A coordinator has no tool that finds a subagent's shell: the shell id changes at every arm, and the worker cannot be asked to report it.

## Decision

1. **Removing the subagent's shell ends its armed wait.** The cache-warm wait runs as a shell of the worker's session, so removing every running shell of that session ends the wait together with the worker's other commands. Dispose needs no `dispose` message first, and `session.interrupt` leaves the stop call.
2. **A SAI tool owns the procedure.** `sai/tools/dispose-shells.js --session <sessionID> --cwd <project-root>` lists the shells of the project directory through the `opencode api` CLI, keeps those with status `running` whose `metadata.sessionID` is the worker's session, removes each, and lists again. It always uses the raw method-and-path form with the directory inline and URL-encoded, never `--param`. The `opencode` CLI discovers the server and authenticates by itself, so the tool handles no secret. The coordinator finds the shell by the filter, so the worker takes no part.
3. **The result is checked, not assumed.** A shell counts as removed only when the second listing no longer shows it. The tool prints one JSON object with `removed`, `failed`, and a status of `removed`, `none` (no running shell, no notice), `failed` (a shell is still listed), or `unavailable` (the CLI is absent or the server did not answer); it exits 0 for `removed` and `none`, 1 for `failed` and `unavailable`, and 2 for a usage error.
4. **The `dispose` message is the fallback.** On `failed` or `unavailable`, `worker-lifecycle.md` has the coordinator print a one-line notice and send `dispose`; from then on the agent answers every wake with `ok` and arms nothing. The run's outcome does not change. Claude Code keeps `TaskStop`.
5. **No new shell grant.** The tool sits in `sai/tools`, which the `sai-tools` projection installs for both harnesses, and the coordinator profiles that dispose workers already hold the shell grants that cover it.

## Alternatives Considered

- **The worker reports its background shell id to the coordinator** — rejected: it is a prose rule of the kind ADR 0212 removes, and the id changes at every arm.
- **Store the wait's pid in the chain record and kill it by pid** — rejected: the coordinator would need the worker's chain id, again through prose.
- **Call the opencode server with `curl` and the password from its registration file** — rejected: it handles a secret by hand.
- **Grant `opencode api get/delete /api/shell...` directly and describe the procedure in `worker-lifecycle.md`** — rejected: the tool keeps the filter and the URL encoding testable and out of prose.

## Consequences

- On opencode, dispose removes every running shell of the worker, not only its wait.
- A server that cannot be reached still ends the worker's warming, through the `dispose` message, at the cost of one reply to each later wake until `max`.
- The tool's tests stub the `opencode` CLI; the listing shape (`data`, `status`, `metadata.sessionID`) is verified against v2.2.6 and read tolerantly.
- The `session.interrupt` API call no longer appears in any SAI instruction.

## Provenance

Change `tool-owned-cache-warming`, decision "opencode dispose removes the worker's shells".
