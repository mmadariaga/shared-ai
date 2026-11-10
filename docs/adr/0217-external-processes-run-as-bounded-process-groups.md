# ADR 0217: External processes of the backlog and publication tools run as bounded process groups

## Status

Accepted.

## Context

`runProcess` (`sai/tools/backlog-process.js`) bounded each external process of the backlog and publication tools with `spawnSync` and a 120 s timeout. The timeout killed only the direct child, so a grandchild (a git hook, a credential helper, a provider CLI subprocess) outlived the bound while its description promised that no descendant would. Plan publication ran git through its own `execFileSync` wrapper with no bound at all. A tool interrupted with Ctrl-C left the processes it had started running, and a timed-out `git push` or `git commit` was reported as a plain failure although the operation may still have completed.

## Decision

1. **`runProcess` is asynchronous and ends the whole process group.** It resolves with a `spawnSync`-shaped result. Each process starts as the leader of its own process group (`detached` on POSIX), and at the 120 s bound the group ends with `process.kill(-pid)` (`taskkill /T` on Windows) and the promise rejects with `reason: 'process-timeout'`. A process that already exited while a descendant still holds its output pipe counts as finished at the bound. The callers in `to-backlog.js`, `from-backlog.js`, `from-next-backlog-item.js`, `to-pr.js`, the provider adapters reached through `io.run`, and plan publication are asynchronous along their call chains.
2. **The group also ends when the calling tool stops.** While a group is running, `backlog-process.js` ends it when the calling process receives `SIGINT` or `SIGTERM` or exits, because a group started apart from the terminal no longer receives the terminal's interrupt. The handlers exist only while a process runs.
3. **Plan publication uses the same runner for every git call.** `sai/tools/plan-publication.js` has no `execFileSync` wrapper: each git call has the same 120 s bound and group kill, so hook descendants end with it. A timeout ends the operation. After a `commit` timeout the tool reads `HEAD` back and reports the result as `uncertain`, and a `git push` timeout in `to-pr` is read back from the remote and reported the same way. Neither operation is repeated on its own, because a surviving git process may still complete it.

## Alternatives Considered

- **Documenting the grandchild limit of `runProcess`** — rejected: only killing the group keeps the module's promise that no descendant outlives the bound, and it keeps Ctrl-C from leaving processes behind.
- **Adding a `timeout` option to plan publication's own `execFileSync` wrapper** — rejected: that timeout ends only git and leaves hook descendants alive, and it would keep a second, synchronous runner beside `runProcess`.

## Consequences

- The callers of `runProcess`, plan publication included, change to an asynchronous contract, and the CLI entry points set the exit code when the promise settles.
- A git hook or credential prompt that needs more than 120 s ends the operation with an uncertain result for a commit or push, and with a timeout failure for any other call.
- Tests start real process trees to check the group kill and the interrupt handling, and stub `child_process.spawn` where a result is scripted.

## Provenance

Change `harden-external-processes`, decision "`runProcess` becomes asynchronous with a process-group kill instead of documenting the limit".
