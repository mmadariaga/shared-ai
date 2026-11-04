# ADR 0206: opencode dispatches subagents in the background through the v2 `subagent` tool

<!-- adr-index: amends 0185 -->

## Status

Accepted. Amends ADR 0185: its dual `subagent_depth` and opencode v1 compatibility decision is retired. ADR 0172d, ADR 0185, and archived changes stay unedited.

## Context

ADR 0185 kept a dual `subagent_depth` configuration (top-level and `experimental`) and its doctor and installer checks "for v1 compatibility", and the opencode bindings and budget skills kept describing the opencode v1 `task` tool: `task(subagent_type: …, prompt: …)` to create, `task(task_id: …, prompt: …)` to continue, synchronous by default with no background mode.

opencode v2 exposes a `subagent` tool instead. An agent that reads the v1 text must translate each call, and a continuation written in the documented v1 shape failed with `agent: Missing key`. The opencode 2.2.5 bundle gives the v2 shape: `subagent(agent, description, prompt, sessionID?, background?)`, where a continuation passes the same `agent` as the creation plus the captured `sessionID`. With `background: true` opencode delivers a completion notification to the parent conversation, like Claude Code does. The same bundle reads the depth from `experimental.subagent_depth` alone, so a top-level `subagent_depth` gives the doctor a false pass.

Verified only in the opencode 2.2.5 bundle; the 2.2.0 minimum is declared by the user.

## Decision

1. **opencode v1 support is retired.** Every opencode instruction creates and continues subagents with the v2 `subagent` tool: create with `subagent(agent: …, description: …, prompt: …, background: true)` and continue with `subagent(agent: <agent used at creation>, description: …, sessionID: <captured sessionID>, prompt: …, background: true)`. A continuation without `agent` is invalid. The `description` is a fixed role label (`{{phase}} worker` for routed workers, the agent name for the budget agents).
2. **Every opencode dispatch runs in the background**, so both harnesses share the same dispatch semantics: a dispatcher continues a subagent only after its completion notification has arrived, never sleeps or polls, tracks parallel subagents by their own `sessionID`, and a worker that dispatches its own helper waits for the helper's notification within its own turn.
3. **Dispose interrupts the worker session through the session API** (`api/session/:sessionID/interrupt`) with the captured `sessionID`, after the outstanding-shell removal and before the `dispose` message fallback.
4. **The doctor requires `experimental.subagent_depth` >= 2 and opencode 2.2.0 or later.** A top-level `subagent_depth` neither satisfies nor fails the check. The version check runs `opencode --version` only when the opencode harness is checked: below 2.2.0 is an error naming the installed and the minimum version; an absent binary or an unparseable output is a warning that the version is unverified. The installer keeps ensuring `experimental.subagent_depth` and neither writes nor removes a top-level key.
5. **Amends ADR 0185.** Its decision 6 (dual `subagent_depth` for v1 compatibility) and its v1/v2 note no longer hold; its sibling-dispatch decision stands.

## Alternatives Considered

- **Document both v1 and v2 calls with a version choice** — rejected: keeps v1 working but adds version-specific text to every opencode binding.
- **A generic rule naming the inputs without fixed syntax** — rejected: it survives API changes but is the ambiguity that forced per-call translation.
- **Keep synchronous opencode dispatch** — rejected: smaller change, but the two harnesses keep different dispatch semantics.
- **Declare the minimum version only in documentation** — rejected: avoids running an external binary, but an older install fails silently.

## Consequences

- opencode v1 users and opencode v2 releases before 2.2.0 lose support.
- The `subagent` signature and background mode were verified only in the opencode 2.2.5 bundle.
- The doctor depends on the `opencode` binary for the version check and only warns when it is absent or its output cannot be parsed.
- Two opencode behaviors stay unconfirmed and are avoided by design: a continuation sent to a running subagent, and cancellation of background children when the parent aborts. No automatic cancellation of a hung child is assumed on either harness.

## Related

- ADR 0185 — amended: dual `subagent_depth` and v1 compatibility retired.
- ADR 0172d — sibling worker dispatch, unchanged.
- ADR 0188 — ready handshake and live subagents per role, unchanged.
- `sai/orchestration/workers/bindings/opencode/standalone-worker-template.md`
- `bin/doctor.js`

## Provenance

Change `opencode-v2-subagent-only`, decision "Support only opencode v2".
