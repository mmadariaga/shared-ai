# audit-store-serialization Specification

## Purpose
TBD - created by archiving change fix-sai-state-concurrent-emit-merge. Update Purpose after archive.

## Requirements

### Requirement: Meta-review serializes store access in fixed order

`/sai-deep-review` SHALL keep the audit workers running in parallel and SHALL issue the `sai-state` calls of all audit cycles one at a time, in the fixed order security, then performance, then accessibility, while keeping report writes concurrent through disjoint reports. Each audit cycle SHALL use its own `sai-state` session keyed `{audit}-{name}` and its own `{audit}-steps@1` machine.

#### Scenario: Three-audit batch serializes store operations while dispatching in parallel

- **WHEN** security, performance, and accessibility cycles activate together
- **THEN** the coordinator SHALL create their workers in parallel, keep one session per audit, and issue their `sai-state` calls one at a time in security performance accessibility order

### Requirement: Single session file with accepted non-atomic window

The store SHALL keep a single session file carrying `stateByMachine` with per-machine `rev` and SHALL NOT create per-machine files, while documenting that read-then-write is not atomic and the residual window is accepted because serialization removes pressure and the merge keeps survivors harmless for monotonic step sets.

#### Scenario: Serialized batch retains single-file merge safety

- **WHEN** serialized store operations complete on one session file with monotonic step sets
- **THEN** the file SHALL retain every machine done set with no lockfile and no per-machine file created
