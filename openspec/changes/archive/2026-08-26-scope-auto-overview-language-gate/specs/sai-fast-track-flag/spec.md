## MODIFIED Requirements

### Requirement: Preserve fast-track's explore language behavior

Explore fast-track SHALL bypass gate 9 without an explicit overview-language option and SHALL resolve `None`; explicit `--overview-lang` SHALL override that default only on the supervised route. Auto (fast implementation) SHALL treat the explicit option as a no-op and SHALL never generate `change-overview.md`.

#### Scenario: Auto-fast remains overview-free

- **WHEN** Auto (fast implementation) is selected with or without an explicit overview-language option
- **THEN** no overview-language question or overview generation occurs
