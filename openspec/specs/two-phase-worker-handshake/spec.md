# two-phase-worker-handshake Specification

## Purpose
TBD - created by archiving change two-phase-worker-handshake. Update Purpose after archive.

## Requirements

### Requirement: Ready-Only Initial Dispatch
The system SHALL open every routed stretch with an initial dispatch carrying only the ready prompt plus base instructions and zero task content.
#### Scenario: Open routed stretch
- **WHEN** the coordinator opens a routed stretch
- **THEN** the initial dispatch carries only the ready prompt plus base instructions with no task content

### Requirement: Post-Ready Same-Worker Task Disclosure
The system SHALL disclose the task exclusively in the sequential same-worker continuation after the ready return.
#### Scenario: Disclose task after ready
- **WHEN** the worker returns ready
- **THEN** the coordinator continues the same worker with the task as a sequential continuation

### Requirement: No-Ready Fresh Relaunch
The system SHALL relaunch fresh with the original envelope when ready never arrives, with no timeouts, no retries, and no new escalation.
#### Scenario: Ready never arrives
- **WHEN** the ready return never arrives for a routed stretch
- **THEN** the coordinator relaunches fresh with the original envelope and adds no timeout or escalation

### Requirement: Minimal Envelope With History Recovery
The system SHALL keep the original envelope minimal and the task in the continuation and opaque history, and replacement reconstruction SHALL recover the task from that opaque continuation history.
#### Scenario: Reconstruct replacement worker
- **WHEN** a replacement worker reconstructs after a loss
- **THEN** it recovers the task from the opaque continuation history because the minimal envelope alone carries no task content

### Requirement: Double Round-Trip For All Routed Stretches
The system SHALL charge two round trips to every routed stretch with no per-phase exemption, including every RED and GREEN dispatch per apply Step.
#### Scenario: Price routed stretch
- **WHEN** any routed stretch executes including an apply RED or GREEN dispatch
- **THEN** the stretch costs two round trips with no exemption

### Requirement: Shared Handshake Terminology
The system SHALL define handshake as the trivial first nonterminal ready return before expensive work, ready as the availability signal carrying no expensive work, and handle as the harness-native resumable identifier retained before any guard snapshot or continuation.
#### Scenario: Read terminology
- **WHEN** a reader looks up handshake, handle, or ready
- **THEN** the glossary returns the shared ready-based definitions with no progress-event meaning

### Requirement: Bounded Loss Without Readiness Guarantee
The system SHALL bound pre-ready loss to base loading by construction, SHALL keep post-task stall behavior unchanged, and SHALL NOT guarantee readiness from a dead worker.
#### Scenario: Stall before and after task
- **WHEN** a stall happens before ready or after task disclosure
- **THEN** pre-ready loss stays limited to base loading while post-task stall follows the current behavior and a dead worker still returns nothing

### Requirement: Strict-Zero Ready-Only Initial Dispatch
The system SHALL open every routed stretch with an initial dispatch carrying only the ready prompt plus base instructions and zero task content under strict zero with no change name, flags, provenance, or derivatives, including each apply RED and GREEN dispatch per Step.

#### Scenario: Open routed stretch under strict zero
- **WHEN** the coordinator opens any routed stretch including an apply RED or GREEN dispatch
- **THEN** the initial dispatch carries only the ready prompt plus base instructions with no task content of any kind

### Requirement: Post-Ready Task Disclosure On Captured Handle
The system SHALL disclose arguments_value and all derivatives exclusively in the sequential same-worker continuation after event ready on the captured harness-native handle.

#### Scenario: Disclose task after ready
- **WHEN** the worker returns ready on the captured handle
- **THEN** the coordinator continues the same worker with the task as a sequential continuation and never discloses task content before ready

### Requirement: Handle-Then-Guard-Then-Task Ordering With Fresh Relaunch
The system SHALL retain the handle before any guard snapshot, SHALL open the no-commit guard window only after handle capture, and SHALL relaunch fresh with the original minimal envelope with no timeouts and no newly opened guard window when ready never arrives or cancellation happens before the handle returns; the relaunch SHALL take a deferred snapshot only when no guard window is already running.

#### Scenario: Guard opens only after handle
- **WHEN** a routed stretch starts, no handle has been captured, and no guard window is running
- **THEN** no guard window opens and no snapshot runs until the handle is retained, and a missing ready relaunches fresh with a deferred snapshot

### Requirement: Opaque-History-Only Replacement Reconstruction
The system SHALL reconstruct a replacement worker solely from the opaque history of already-sent continuations including the task-carrying one plus reconstruction metadata, and SHALL return a failed restart with no dispatch when that history is incomplete, never guessing task content.

#### Scenario: Reconstruct from opaque history
- **WHEN** a replacement worker is needed and the minimal envelope alone carries no task
- **THEN** reconstruction uses solely the opaque continuation history plus metadata and fails without dispatch on incomplete history

### Requirement: Fixed Double Round-Trip Cost With No Withholding-Breaking Batching
The system SHALL charge a fixed double round-trip to every routed stretch with no per-phase exemption including short apply steps, and SHALL permit no batching that breaks withholding.

#### Scenario: Price every routed stretch
- **WHEN** any routed stretch executes
- **THEN** the stretch costs two round trips with no exemption and no batching that discloses task content pre-ready

### Requirement: Ready-First Coexistence With Merge Conflict Extension
The system SHALL emit ready first on every merge stretch and SHALL run the conflict_detected nonterminal extension only after ready, never before and never as a replacement for ready.

#### Scenario: Merge conflict follows ready
- **WHEN** a merge stretch encounters conflicts
- **THEN** the worker returns ready first and then emits conflict_detected with its affected-file inventory and continuation state

### Requirement: Ready-Only Binding Templates And Install Validation
The system SHALL send the ready-only prompt with no envelope slot from both harness binding templates, SHALL require the handshake in the merge, commit, archive, backfill, and direct-build worker contracts, and SHALL validate projections and tests against the new prompt with no InvocationEnvelope or arguments_value at open.

#### Scenario: Validate ready-only bindings
- **WHEN** worker bindings are installed or tested
- **THEN** each initial dispatch carries the ready-only literal with no task content and validation fails on any envelope slot carryover

### Requirement: Install validation enforces literal ready example in every initial dispatch
Installer and test validation SHALL require every routed initial dispatch to carry the ready-only sentence plus the literal two-line ready example with no change name, flags, provenance, or task content, preserving strict-zero withholding and post-ready disclosure on the captured handle.

#### Scenario: Validation requires example under strict zero
- **WHEN** worker bindings are installed or tested
- **THEN** each initial dispatch SHALL contain the ready-only literal plus the example and no task content
