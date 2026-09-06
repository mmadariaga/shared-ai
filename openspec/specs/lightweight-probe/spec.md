# lightweight-probe Specification

## Purpose
TBD - created by archiving change explore-own-maturation. Update Purpose after archive.
## Requirements
### Requirement: Lightweight probe SHALL probe up to 2 what-if scenarios before the formal edge-case list

Immediately before the formal edge-case list, explore SHALL systematically probe up to 2 what-if scenarios in conversation.

#### Scenario: Pre-step probe runs first
- **WHEN** explore is about to present the formal edge-case list
- **THEN** explore first probes up to 2 what-if scenarios in conversation

### Requirement: Lightweight probe SHALL NOT replace the formal edge-case list

The probe SHALL NOT replace the formal E1 through En list, and the formal agreement gate SHALL still run before crystallization.

#### Scenario: Formal list still gates crystallization
- **WHEN** the lightweight probe has completed
- **THEN** explore still runs the formal edge-case list and its agreement gate

