# payload-emission-time Specification

## Purpose

Define the worker-authored emission timestamp shared by all closed lifecycle payloads.

## Requirements

### Requirement: Closed worker payloads carry composition time

Every closed worker payload MUST carry a worker-authored `emitted_on` immediately after its `status` or `event` discriminator in `YYYY-MM-DDTHH:MM:SS±HH:MM` form. The field position is serialization order, not composition order. The worker SHALL decide every other field, read the clock exactly once as its final action before returning, and return without a second read for that payload. The worker SHALL NOT estimate, infer, reuse, back-date, forward-date, or copy a value from an earlier result. If the payload changes after the read, the read value stands and is never re-read. Actual available clock values remain non-decreasing in return order; a payload following a continuation acknowledgement has its own one-read bound.

#### Scenario: Any lifecycle result is timestamped once
- **WHEN** a worker emits a terminal result, notice, or progress event with an available clock
- **THEN** the result contains the required offset-bearing `emitted_on` value, including pre-resolution and no-plan results, and the worker performed exactly one final clock read for that returned payload.

#### Scenario: Payload content changes after the read
- **WHEN** the content of a payload changes after its clock read and before return
- **THEN** the worker keeps the value from that read and does not read the clock again.

### Requirement: Unavailable clocks use a valid sentinel

When the single clock read for a returned payload is unavailable or fails, the worker SHALL return that payload with the literal `1970-01-01T00:00:00+00:00` sentinel in `emitted_on`. The sentinel is valid mandatory payload data, is not a failure path, and is explicitly exempt from the run's non-decreasing-values property.

#### Scenario: Clock read is unavailable
- **WHEN** a worker is ready to return a closed payload and its one clock read is unavailable or fails
- **THEN** the worker returns the payload with the sentinel in `emitted_on` without blocking, failing, or performing another read.
