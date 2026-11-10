# ADR 0218: Cache warming reuses the live wait through a foreground arm check

<!-- adr-index: amends 0212 -->

## Status

Accepted. Amends ADR 0212: its rule that only the newest wait of a chain stays live was enforced only logically — a new arm bumped the chain's generation while the older wait slept its whole interval and then returned `finished` — and is now enforced by an owner lease and a foreground check, and an ordinary `begin` no longer replaces a wait that is still valid. ADR 0212 itself is not edited, because existing records are never edited in place. The amended protocol is stated in `sai/policies/cache-warming.md`. The rest of ADR 0212 stays in force.

## Context

Waits of one chain overlapped: a new arm only bumped the chain's generation, so the older wait kept sleeping its whole interval and then returned `finished`, costing an extra wake turn per overlap (issue https://github.com/mmadariaga/shared-ai/issues/409). Every end of a background shell that the agent launched, including one killed by another process, notifies the agent on both Claude Code and opencode, so killing the old wait from the new one saves no turn. The overlap therefore had to be prevented before a wait was launched, not repaired after.

## Decision

1. **A foreground `arm --chain <id>` check decides whether a wait is launched.** After each response the agent runs `wait.js arm --chain <id>`, which prints one JSON decision `{launch}`, and it launches a background `warm --chain <id>` only when the answer is `true`. The check reuses the chain's live wait when its owner lease is fresh, the resolved `interval` and `max` match the wait's, no benchmark cutoff mark is newer than its arm, and the setting is not off: it extends that wait's window to now plus `max` and answers `launch: false`. A missing lease, a stale lease, an ended wait, changed timings, a newer cutoff mark, or a chain past its fixed deadline answers `launch: true`. On a fixed-deadline chain the check reuses the live wait and never moves the deadline.
2. **An owner lease names the one wait that owns the chain.** The chain record holds the generation, a random owner token, the last renewal time, the wait's `interval_ms` and `max_ms`, and `closing_ms`; no PID is stored and no process is killed. Every read-modify-write of the record runs under a lock file created exclusively (`wx`) and recovered when the lock is stale, so concurrent arm checks and `warm` calls leave exactly one owner.
3. **A live wait renews its lease every few seconds and retires within one chunk.** It sleeps in chunks of three seconds, renews its lease after each chunk, and re-reads the generation and the window, so it picks up a window the check extended and ends with `finished` within one chunk of losing ownership. A lease that stops renewing counts as dead after a small fixed multiple of the chunk, nine seconds, so a crashed or suspended wait is replaced without any process identity check.
4. **A new owner starts its interval only after the previous lease is released or stale.** A wait that ends clears its lease, so the next check launches a new one; a `warm` that replaces a still-live owner waits until that lease is released or no longer live before its interval begins. A wake re-arm keeps ownership only while its generation is still current.
5. **An ordinary `begin` keeps the live lease, and only a `--fixed-deadline` begin clears it.** The main session's chain follows its harness session id, so every command invocation in the same chat runs `begin`; keeping the lease lets the still-valid live wait keep running and the next check reuse it, while the check still rejects a kept wait whose timings the new identity changed. A fixed-deadline begin clears the lease, the timings, and the window because the hand-off wait needs its own background task id, and the check then launches that wait. This last behavior is a deviation from the first implementation, which cleared the lease on every `begin`; functional review finding M1 required the change.

## Alternatives Considered

- **Kill the previous wait from the new one by verified PID** — rejected: the killed shell still notifies the agent, so no turn is saved, and cross-platform process identity checks are fragile.
- **Self-retirement alone, with no arm check** — rejected: every superseded wait would still cost one wake turn.
- **Arm check alone, with no self-retirement** — rejected: a real replacement would leave the old wait alive for its whole interval.
- **Clearing the chain's lease at every `begin`** — rejected after implementation: every new command invocation in the same chat would retire a valid live wait for an extra `finished` turn, which is the overlap cost this record removes.

## Consequences

- The agent runs one extra foreground call after each response.
- A real replacement still costs one immediate `ok` wake turn for the retired wait.
- A reused wait wakes on its original interval, which can be earlier than a fresh arm would.
- One wait per chain stays alive on both harnesses, and the policy states the check-then-launch protocol once for Claude Code and opencode.

## Provenance

Change `enforce-single-cache-warming-wait`, decision "Reuse a live valid wait through a foreground arm check".
