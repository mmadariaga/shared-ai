# validator-stamping Specification

## Purpose
TBD - created by archiving change replace-emitted-on-with-validated-at. Update Purpose after archive.
## Requirements
### Requirement: Valid verdicts carry a display-only observation timestamp
Valid results SHALL carry an additive display-only validated_at sidecar as a text suffix and a JSON field. Exit codes and ok/errors semantics SHALL remain unchanged and the payload SHALL never be rewritten.

#### Scenario: A valid terminal payload validates
- **WHEN** a valid closed terminal payload is validated
- **THEN** the verdict carries ok true with empty errors and a well-formed validated_at

### Requirement: Invalid verdicts carry no timestamp
Invalid results SHALL return errors with exit 1 and SHALL carry no timestamp.

#### Scenario: An invalid payload is rejected without time
- **WHEN** an invalid closed payload is validated
- **THEN** the verdict carries ok false with errors and no timestamp

### Requirement: The sidecar applies to all four validated kinds
The sidecar SHALL apply to terminal, notice, progress, and conflict_detected kinds.

#### Scenario: Each kind carries the sidecar when valid
- **WHEN** a valid payload of any of the four kinds is validated
- **THEN** the verdict for that kind carries validated_at with exit 0

