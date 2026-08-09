# ADR 0120: Concurrent three-child FIFO supervision for the headless Orca runtime

## Status

Accepted

## Context

The Orca headless contract (`orca serve --json`) emits one compact newline-delimited JSON record on stdout when ready — `type: orca_server_ready`, `schemaVersion: 1`, with a nested `pairing` object that carries secret offer material (the `orca://pair?code=...` URL and device credential). The container must capture readiness atomically, derive the pairing offer into an owner-only file, never leak pairing secrets into logs, supervise the display (Xvfb) as a first-class child, react deterministically to whichever managed process fails first, and distinguish intentional termination from unexpected child exits — including premature exits with status 0.

## Decision

The runtime is built around a FIFO and three separately tracked managed children: Xvfb, the server (`/opt/orca/AppRun serve --port <n> --pairing-address <a> --json`, stdout redirected to the FIFO, stderr to the container logs), and a dedicated Node.js JSON consumer (`/opt/orca/scripts/orca-json-consumer.js`, reading the FIFO) — no `pipefail` pipeline, no shell/regex JSON parsing, no `eval`, no free-form command string. Each child is launched with `setsid <binary> <fixed args...>` so the setsid leader `exec`s the actual binary and the recorded PID/PGID identify the real processes. The entrypoint supervises all three concurrently (`wait -n`) under an explicit shutdown-state flag: external SIGTERM/SIGINT sets the flag before any child is signaled; outside shutdown, the first-exit reactions are deterministic (consumer first → terminate server and Xvfb, return the consumer's status; Xvfb first → terminate server and consumer, return Xvfb's status; server first → bounded 10 s drain window for the consumer to EOF, then server status, else consumer status, else the documented runtime-failure code `70` (EX_SOFTWARE) for any premature zero-status exit). In shutdown state, first-exit reactions are suppressed, TERM is sent to each managed PGID, a 10 s wait is followed by KILL of any survivor, all children are reaped, and the shutdown precedence applies (server status when non-zero, otherwise consumer status). The signal logic refuses any PGID equal to the entrypoint's own process group. PID/start-identity files (`/run/orca/orca.pid`, `/run/orca/xvfb.pid`, atomic create-new) back a health check that rejects PID reuse. Test-only overrides (`ORCA_SERVE_BIN`, `ORCA_XVFB_BIN`, `ORCA_CONSUMER_BIN`) take effect only under `ORCA_TEST_MODE=1`; production startup rejects a non-default hook.

## Alternatives Considered

| Option | Pro | Con |
|---|---|---|
| FIFO + `setsid` concurrent supervision of three tracked children (chosen) | Deterministic reaction to whichever child fails first — including the display; explicit shutdown state; precise PID/PGID signal handles; zero-status premature exits never look like success | Most complex runtime surface of the change |
| `pipefail` pipeline (`orca serve | consumer`) | Familiar | `pipefail` returns only the rightmost non-zero status (a consumer failure can mask the server's status) and exposes no server PID for signal forwarding |
| Parsing human-readable output | Simple | Fragile across releases; risks leaking pairing material into logs |
| Shell/regex JSON parsing inside the entrypoint | No Node dependency | Unsafe on adversarial or malformed input; hard to test in isolation — the dedicated Node consumer is independently testable and uses the Node runtime already in the image |
| `PIPESTATUS` interpretation without tracked children | No new topology | Still lacks a precise PID/process-group handle for signals |
| Free-form `ORCA_SERVE_CMD` string | Flexible | Requires `eval` or an extra shell; the recorded PID could identify a wrapper rather than the actual server |
| Ungated test hooks | Simpler harness | An unrestricted runtime input would let a production Compose override replace the server, display, or consumer while process identity and readiness treat the replacement as Orca |
| Supervising only the server and consumer | Smaller entrypoint | An Xvfb exit while both remain alive would keep reporting a live server without a display |
| Supervising without a shutdown state | Smaller entrypoint | During SIGTERM handling a child that exits before the others would be misclassified as a premature failure; a premature essential-child exit with status 0 would otherwise exit the container successfully |
| Supervising only for server exit, evaluating the consumer afterward | Simpler loop | A consumer that fails on startup data while the long-running server continues would hang the entrypoint indefinitely |
| Implicit shell job groups for signaling | Minimal code | Background jobs in a non-interactive shell do not guarantee distinct groups; a shared group could include the entrypoint |
| `pgrep`-based health check | Simple | Can match a stale or unrelated process |

## Consequences

- The full lifecycle contract holds: stop terminates the complete process tree, premature failures map to documented statuses (including `70` for zero-status premature exits), and intentional termination is never misclassified.
- The consumer gates on `schemaVersion` (pinned to 1 against the committed release) and fails clearly on malformed, unsupported, or missing-field records without claiming readiness; unknown additional fields are ignored for forward compatibility.
- The health check is PID-reuse safe via start identities and fails closed without a current readiness record.
- A committed fault-injection harness (`fake-orca.sh`, fake Xvfb, fake consumer, `run-tests.sh` host + `--docker` modes) verifies every path repeatably.

## Provenance

User — the design records it as Decision 6 with the `adr` family marker; all three ADR/DDR criteria are evaluated and hold in `design.md`.

## Related

- `openspec/changes/add-orca-agent-container/` — proposal, design (D6), and the six capability deltas.
- `docs/adr/0117-orca-appimage-build-time-extraction.md` — the fixed production command `/opt/orca/AppRun serve`.
- `docs/adr/0118-orca-environment-nonroot-service-user.md` — the non-root runtime that this supervision runs as.
