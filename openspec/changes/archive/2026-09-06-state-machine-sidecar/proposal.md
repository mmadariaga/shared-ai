**Complexity**: high (3 capabilities, 23 requirements)

## Why

Conversational explore state (stage progression, agreement tracking) lives in unstructured chat context where transitions depend on LLM judgment. Moving the `explore-stage` machine onto a validating sidecar service makes transitions deterministic, testable, and reusable as later machines migrate onto the same platform.

## What Changes

- Add a deterministic Node sidecar (`sai-state`) that owns session-scoped state for SAI flows, starting with the `explore-stage` machine as the first hosted PoC.
- One sidecar per explore session keyed by `chatId` with a single writer (main session only); in-memory authoritative state with conversation-carried snapshots for crash recovery.
- Uniform multi-machine envelope with a code machine registry; routing by `machineId@version` pinned at session start; no cross-machine guards in PoC scope.
- Every transition returns a pointer-only `next` (`{follow, hint}`) to the step file the caller must fetch; the service never renders.
- Loopback HTTP transport on `127.0.0.1` with ephemeral port + token discovery via `$TMPDIR/sai-state/<chatId>.json` plus stdout announce; exit via pipe EOF (primary), parent poll + explicit `close` (secondary); no idle TTL.
- Idempotent `emit` via `eventId` with a closed error vocabulary; rejections return the current state's pointer.

## Capabilities

### New Capabilities

- `sidecar-session-lifecycle`: per-session sidecar ownership keyed by `chatId` — spawn, discovery (session file + stdout announce), health-check, crash respawn + `restore`, version-mismatch respawn, stale-file overwrite, and close/exit (pipe EOF primary, parent poll secondary, explicit `close`).
- `machine-registry-envelope`: generic platform envelope and code machine registry (`initialState`, `transition`, `project`) — `machineId@version` routing pinned at session start, idempotent `emit`, closed error vocabulary, current-state pointer on rejection, no cross-machine guards.
- `explore-stage-machine`: first hosted machine absorbing explore stage-progression and Closure State rules — deterministic transitions, projection as pure function, pointer-only `next` with path interpolation, panel-ownership and marking hooks respected by the caller.

### Modified Capabilities

- None. No existing capability's spec-level behavior changes; explore's `Result Loop`, `Closure State` ownership, and intent classifiers stay out of this PoC (E8).

## Impact

- New runtime surface: single stdlib-only Node bin (`sai-state`, Node ≥22) distributed via the current `npx` channel; one Node process per explore session (spawn cost + idle MBs accepted for full isolation).
- Repo integration points (future consumers, not behavior changes here): `sai/commands/explore/steps/common.md` stage-progression rules absorbed by the machine definition; `sai/commands/explore/steps/idea-list.md` panel ownership/marking hooks respected by the projection caller; `sai/orchestration/command-runner.md` `Active step:` pointer mechanism generalized by the `next` field.
- No persistence layer: no sqlite, no durable store; crash loses live state, recovery via respawn + `restore` from the last conversation-carried snapshot.
- Full parity requirement: identical behavior on Windows and POSIX (loopback TCP, `TMPDIR`, PID polling) for opencode + Claude Code with no harness-specific transport; harness `@`-path resolution stays caller-side.
- Open harness question carried forward: background processes surviving across turns in both harnesses (Model B feasibility premise).

## Proposal Research Documentation

**Local files**:
- `package.json` — runtime baseline (engines declaration, bin distribution channel)
- `sai/tools/` — deterministic Node tool pattern (flag-driven subcommands, JSON output, managed mirrored copies)
- `sai/commands/explore/steps/common.md` — Closure State and stage-progression rules being absorbed
- `sai/commands/explore/steps/idea-list.md` — panel ownership and marking hooks the projection must respect
- `sai/orchestration/command-runner.md` — existing `Active step:` pointer mechanism the `next` field generalizes
- `GLOSSARY.md` — canonical domain terms (Closure State, Pre-Crystallization Stage TODO, Idea Progress List, Progress Event, Result Emission Time)

**External URLs**:
- None. No external APIs, SDKs, or web sources consulted; stdlib-only constraint makes web lookup inapplicable.

## Additional Notes

- Model decisions: per-session sidecar (Model B) over per-turn ephemeral (Model A) for real in-memory continuity without per-turn discovery cost, and over single shared daemon (Model C) because near-zero writer contention makes shared-daemon arbitration, version skew, and namespaces pure overhead before the hypothesis is proven.
- Session file is a client-side discovery copy (port + token), never the server's store; liveness watches the parent process, never user activity — no clock-based killing of live sessions.
- Orphan cleanup is hygiene-only (pipe EOF, parent poll, explicit close); lingering orphans are harmless by construction.
- Edge cases carried to specs: E1 concurrent explores isolated by `chatId`; E2 context compaction via session-file discovery; E3 mid-chat crash respawn + `restore` + one retry; E4 version mismatch kills and respawns, never mixes protocols; E5 stale session file declared dead by token health-check, fresh spawn overwrites; E6 Windows + POSIX from one codebase; E7 abandoned chats die via pipe EOF or parent poll; E9 full opencode + Claude Code parity for spawn, use, and close.
- Name note: `sai-state` / state-machine sidecar is a new platform term; it must not be confused with the retired owner-hash dotfile sense of "sidecar" found during research.
- Overview language: None.
