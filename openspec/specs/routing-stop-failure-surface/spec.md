# Routing Stop Failure Surface Specification

## Purpose
TBD

## Requirements

### Requirement: Report worker routing stops through the existing failed outcome

When a worker stops because a fetch path identifies a different harness, it SHALL report the existing terminal `failed` status and SHALL NOT introduce a new lifecycle status. Its summary SHALL identify the routing stop, include the refused path verbatim, and include the active harness identity. The worker SHALL not report the stop as `completed`, `needs_input`, or a successful continuation.

#### Scenario: Worker returns a closed failed payload
- **WHEN** a worker detects a cross-harness path before reading it
- **THEN** its terminal result uses status `failed`, its summary names the refused path and active harness, and its payload remains within the existing lifecycle shape

#### Scenario: Coordinator receives a worker routing failure
- **WHEN** the coordinator receives the worker's failed routing result
- **THEN** it preserves the failure summary as the diagnostic surface and does not reinterpret the result as a normal phase completion or invent a routing-specific status
