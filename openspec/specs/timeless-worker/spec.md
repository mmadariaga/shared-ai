# timeless-worker Specification

## Purpose
TBD - created by archiving change replace-emitted-on-with-validated-at. Update Purpose after archive.
## Requirements
### Requirement: Worker payloads carry no time field
Worker payloads SHALL carry no time field in any phase. The worker SHALL never read a clock and unknown payload fields SHALL stay ignored with no explicit legacy handling.

#### Scenario: A timeless payload validates
- **WHEN** a worker returns a closed payload with required fields and no time field
- **THEN** validation accepts it with no time check

### Requirement: Legacy time fields stay valid and ignored
A payload carrying a legacy time field SHALL stay valid with that field ignored. No validation, display, or code SHALL reference that field.

#### Scenario: A legacy-carrying payload stays valid
- **WHEN** a payload carries required fields plus an unknown legacy time field
- **THEN** validation returns valid with that field ignored and observation time from the validator

