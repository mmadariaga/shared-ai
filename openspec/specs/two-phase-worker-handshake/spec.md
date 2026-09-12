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

