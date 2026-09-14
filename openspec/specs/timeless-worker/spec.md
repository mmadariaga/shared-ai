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

### Requirement: Ready handshake carries only event and changed_files
The ready return SHALL carry exactly event ready plus empty changed_files with no emitted_on field and no time field, consistent with timeless payloads that never read a clock.

#### Scenario: Ready validates timeless
- **WHEN** a worker returns ready
- **THEN** the payload SHALL contain only event ready and empty changed_files with no time field

