# audit-store-serialization Specification

## Purpose
TBD - created by archiving change fix-sai-state-concurrent-emit-merge. Update Purpose after archive.
## Requirements
### Requirement: Meta-review serializes store access in fixed order

The composition SHALL keep parallel worker dispatch and run store operations against the same session `id` one-writer-at-a-time in fixed order security, then performance, then accessibility, while keeping artifact writes concurrent through disjoint artifacts.

#### Scenario: Three-audit batch serializes store operations while dispatching in parallel

- **WHEN** security, performance, and accessibility segments activate together on one session id
- **THEN** the composition SHALL dispatch their workers in parallel and serialize their store operations in security performance accessibility order

### Requirement: Single session file with accepted non-atomic window

The store SHALL keep a single session file carrying `stateByMachine` with per-machine `rev` and SHALL NOT create per-machine files, while documenting that read-then-write is not atomic and the residual window is accepted because serialization removes pressure and the merge keeps survivors harmless for monotonic step sets.

#### Scenario: Serialized batch retains single-file merge safety

- **WHEN** serialized store operations complete on one session file with monotonic step sets
- **THEN** the file SHALL retain every machine done set with no lockfile and no per-machine file created

