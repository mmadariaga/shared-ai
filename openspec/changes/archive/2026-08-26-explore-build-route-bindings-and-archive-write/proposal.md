# Build (unattended) route bindings and archive write vehicle

## Why

The Build (unattended) route of `/sai-explore` cannot complete unattended. Two
defects prevent the closed worker lifecycle from functioning:

1. **Bindings never loaded.** `sai/commands/explore/command-bootstrap.md`
   preloads only the `spec-worker` and `design-worker` bindings (for the Plan
   route). The Build route dispatches three more workers —
   `sai-autofast-implement-worker`, `sai-backfill-worker`, `sai-archive-worker`
   — "through its binding", but no binding is fetched anywhere in the explore
   card set. Without the binding text, the envelope leaves without the
   `Worker contract: Fetch …` + `InvocationEnvelope:` framing, so the worker
   returns prose instead of the closed lifecycle payload the coordinator needs.

2. **Archive worker has no write tool.** `sai-archive-worker` holds
   `Read, Glob, Grep, Bash, Skill` (no Write/Edit). Its Build execution
   continuation performs delta-spec sync writes, the archive directory move,
   exact-path staging, and the local commit — all mutations — but the contract
   never names Bash as the write vehicle. The worker stops midway asking for
   permissions it already has.

## What Changes

1. **`sai/commands/explore/steps/pipeline-auto-fast.md`**: fetch the three
   Build-route bindings lazily at their dispatch points — step 1 fetches
   `@sai/orchestration/workers/bindings/autofast-implement-worker.md`, step 3
   fetches `backfill-worker.md`, step 7 fetches `archive-worker.md`.

2. **`sai/commands/explore/command-bootstrap.md`**: document the lazy-fetch
   decision — the Build-route bindings are fetched at dispatch so read-only
   explore sessions pay no context cost.

3. **`sai/commands/archive/worker.md`**: state explicitly in the Build
   execution continuation that Bash is the write vehicle (the worker holds no
   Write/Edit tool), so the worker performs sync writes, moves, staging, and
   the HEREDOC commit through Bash without stopping for permissions.

## Capabilities

### New Capabilities

- None

### Modified Capabilities

- explore-pipeline-supervision
- auto-fast-archive-execution

## Impact

- `sai/commands/explore/steps/pipeline-auto-fast.md` 3 insertions
- `sai/commands/explore/command-bootstrap.md` 2 insertions
- `sai/commands/archive/worker.md` 8 insertions

Out of scope: no wrapper, manifest, worker-matrix, or agent-definition change —
the toolset already includes Bash; only the contract text changes.