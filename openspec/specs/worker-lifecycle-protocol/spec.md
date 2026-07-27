# Worker Lifecycle Protocol Specification

## Purpose

Define the common lifecycle protocol shared across all worker types (design, implementation, review, etc.), including terminal statuses, continuation semantics, binding metadata, changed-file aggregation, and reconstruction metadata.

## Requirements

### Requirement: implementation-worker-terminal-statuses

Implementation workers SHALL retain exactly the four terminal statuses.

#### Scenario: four statuses present
- **WHEN** an implementation worker produces a lifecycle payload
- **THEN** the status field SHALL be exactly one of: `completed`, `needs_input`, `failed`, or `cancelled`
- **AND** no other status value SHALL be accepted

### Requirement: implementation-workers-excluded-from-notices

Implementation workers SHALL NOT receive design notices or reconstruction extensions.

#### Scenario: notice never delivered to implementation worker
- **WHEN** a design notice is emitted
- **THEN** the coordinator SHALL NOT deliver it to the implementation worker

### Requirement: binding-metadata-separate-capture

Binding metadata captures agent/task IDs separately from worker payloads.

#### Scenario: IDs captured separately
- **WHEN** a worker is dispatched
- **THEN** the binding SHALL capture the agent ID (Claude) or task ID (opencode) as separate metadata
- **AND** this metadata SHALL NOT appear in any worker-authored payload

### Requirement: continuation-before-replacement

Continuation is attempted first before dispatching a replacement worker.

#### Scenario: continuation attempted first
- **WHEN** a `needs_input` payload is produced
- **THEN** the coordinator SHALL attempt continuation on the same worker using the captured continuation reference
- **AND** only if continuation fails SHALL a fresh worker be dispatched

### Requirement: changed-files-ordered-union

Changed files SHALL be maintained as an ordered union across continuation and replacement-worker results.

#### Scenario: union across continuation
- **WHEN** a continuation produces changed files
- **THEN** the coordinator SHALL append each new path to the ordered list, preserving the first occurrence of each path

#### Scenario: union across replacement
- **WHEN** a replacement worker is dispatched after continuation failure
- **THEN** the coordinator SHALL preserve the existing ordered union and add new files from the replacement worker

### Requirement: incomplete-reconstruction-metadata

Incomplete opaque reconstruction metadata SHALL return a restart failure instead of dispatching a replacement worker.

#### Scenario: incomplete metadata detected
- **WHEN** reconstruction metadata lacks required fields
- **THEN** the coordinator SHALL return a restart failure
- **AND** SHALL NOT dispatch a replacement worker or attempt to repair the metadata


