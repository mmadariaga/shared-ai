# ADR 0086: Separate worker write journals from the coordinator changed-file union

<!-- adr-index: refs 0075; refs 0076 -->

## Status

Accepted

## Context

Workers know which authorized paths they successfully wrote, while coordinators observe only lifecycle results across notices, continuations, and replacement workers. Inferring changed paths from Git or artifact existence would mix unrelated work and lose session ownership.

## Decision

Each worker session maintains an ordered, duplicate-free write journal and reports its complete current journal as `changed_files` in every notice or result. A replacement worker starts a new journal. The coordinator maintains only an invocation-scoped ordered union of reported journals and never infers entries from Git, artifacts, intent, or continuation identifiers.

## Alternatives Considered

- **Inspect Git in the coordinator** - can find writes, but also includes unrelated concurrent changes.
- **Reconstruct one journal across replacement workers** - appears continuous, but assigns writes to a worker that did not perform them.
- **Use worker journals plus coordinator union** (chosen) - preserves truthful ownership and deterministic first-seen reporting.

## Consequences

- Empty worker journals produce empty `changed_files` even when artifacts already exist.
- Replacement fallback preserves the coordinator union while starting independent write ownership.
- Secondary artifacts such as ADRs and indexes are reported only by the worker that wrote them.

## Related

- `openspec/changes/extract-sai-orchestration-core/design.md` - Decision D7
- `docs/adr/0075-normalized-invocation-envelope-and-lifecycle-payload.md`
- `docs/adr/0076-resume-worker-before-durable-reconstruction.md`
