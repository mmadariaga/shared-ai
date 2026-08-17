# payload-emission-time Specification

## Purpose

Define the worker-authored emission timestamp shared by all closed lifecycle payloads.

## Requirements

### Requirement: Closed worker payloads carry composition time

Every closed worker payload MUST carry a worker-authored `emitted_on` immediately after its `status` or `event` discriminator in `YYYY-MM-DDTHH:MM:SS±HH:MM` form.

#### Scenario: Any lifecycle result is timestamped
- **WHEN** a worker emits a terminal result, notice, or progress event
- **THEN** the result contains the required offset-bearing `emitted_on` value, including pre-resolution and no-plan results.
