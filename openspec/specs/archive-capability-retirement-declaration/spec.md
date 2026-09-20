# archive-capability-retirement-declaration Specification

## Purpose
TBD - created by archiving change archive-retire-capabilities-key. Update Purpose after archive.

## Requirements

### Requirement: Archive SHALL complete a capability-emptying archive by declaring the retirement

When the read-only pre-flight detects one or more capability-emptying deltas, archive SHALL declare the retirement by ensuring the single key `retire_capabilities: true` is present in `openspec/changes/<name>/.openspec.yaml`, and SHALL then invoke `openspec archive <name> --yes --json` unchanged as the sole synchronization-and-move primitive. The declaration SHALL be written before that invocation by whoever runs it: the coordinator on the ordinary route, the archive worker inside the validated Direct Build (unattended) execution continuation.

#### Scenario: A detected capability-emptying delta is archived instead of refused

- **WHEN** the pre-flight detects a delta whose REMOVED section empties a published capability
- **THEN** `retire_capabilities: true` is present in the change's `.openspec.yaml` before `openspec archive <name> --yes --json` runs, and the archive completes

### Requirement: The retirement SHALL be silent on every route

The retirement SHALL introduce no new question, no new gate, and no per-route branch. The ordinary route, the Direct Build (unattended) route, and `--fast-track` SHALL behave identically with respect to it. The existing post-archive commit gate SHALL remain the human checkpoint.

#### Scenario: No route gains a retirement question

- **WHEN** a capability-emptying delta is archived on the ordinary route, on the Direct Build route, or under `--fast-track`
- **THEN** no retirement question or gate is presented on any of them and the existing post-archive commit gate is unchanged

### Requirement: Archive SHALL name every retired capability in its report

The archive worker SHALL record the detected capability names as invocation-scoped `retired_capabilities` state and SHALL name each one in its terminal summary, so the coordinator and the later commit gate show what the CLI will delete. With an empty set, the summary SHALL name nothing.

#### Scenario: The report exposes what will be deleted

- **WHEN** the worker closes a run in which one or more capability-emptying deltas were detected
- **THEN** its terminal summary names each detected capability

### Requirement: The OpenSpec CLI SHALL remain the only deleter under `openspec/specs/**`

Archive SHALL gain no move and no delete power under `openspec/specs/**`; the deletion of an emptied spec SHALL be performed by the OpenSpec CLI during the archive invocation. `/sai-retire-docs` and `openspec/specs/_archived/` SHALL remain untouched by this path and retain their ownership of retirement that has no change behind it.

#### Scenario: Deletion is performed by the CLI

- **WHEN** a declared retirement is archived
- **THEN** no archive-owned move or delete operation runs under `openspec/specs/**` and the emptied spec is deleted by the OpenSpec CLI

### Requirement: A failed CLI archive SHALL NOT revert the declaration

If `openspec archive <name> --yes --json` fails after the declaration was written, the written key SHALL remain in the working tree. Archive MUST NOT revert it.

#### Scenario: The key survives a failed archive

- **WHEN** the CLI archive invocation fails after the declaration was written
- **THEN** `retire_capabilities: true` remains present in the change's `.openspec.yaml` and archive performs no revert

### Requirement: Archive SHALL NOT validate cross-capability references after a retirement

Archive SHALL NOT detect or report a live capability that cites a retired one. Such a reference is left dangling and its detection is outside the scope of this capability.

#### Scenario: A dangling citation is not reported

- **WHEN** a surviving capability cites a capability that the archive retired
- **THEN** archive reports no cross-capability reference finding and the archive completes
