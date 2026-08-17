# stamp-on-progress Specification

## Purpose
TBD

## Requirements

### Requirement: Progress renders SHALL stamp newly completed steps from the worker event

A state-changing progress render MUST stamp each newly completed step with the `emitted_on` value from the progress event, read as `HH:mm`. The coordinator MUST NOT obtain a replacement timestamp from a wall clock.

#### Scenario: A progress event newly completes steps
- **WHEN** a state-changing progress event marks one or more steps that render as `completed`
- **THEN** each newly completed step receives one stamp derived from that event's `emitted_on` value

#### Scenario: A progress event is a no-op
- **WHEN** a progress event marks no previously unmarked declared step
- **THEN** no step receives a progress stamp and no wall-clock call is made
