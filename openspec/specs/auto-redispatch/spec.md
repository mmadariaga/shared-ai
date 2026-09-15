# auto-redispatch Specification

## Purpose
TBD - created by archiving change coordinator-led-unblock. Update Purpose after archive.
## Requirements
### Requirement: GREEN infra contradiction triggers same-Step RED-owner retry
The coordinator SHALL resume the same-Step RED owner with continue_after_recovery without a prior hand-back when a GREEN blocking-contradiction proves a test-infra point such as setup, adapter, seed, or import wiring rather than an assertion body or production defect.

#### Scenario: Infra contradiction retries RED owner
- **WHEN** a GREEN blocking-contradiction proves a test-infra point in the active Step
- **THEN** the coordinator assigns in-scope under the RED-owner sub-case and resumes the same-Step RED owner before any hand-back

### Requirement: RED-owner retry uses ordered diagnosis keys with duplicate zero spend
The coordinator SHALL normalize the coordinator-owned diagnosis key as the ordered tuple of artifact path, concrete point, and authorized correction boundary, and a duplicate key SHALL spend zero ledger slots and SHALL NOT retry.

#### Scenario: Duplicate RED-owner key spends nothing
- **WHEN** the normalized diagnosis key already spent a ledger slot in the active segment
- **THEN** the coordinator spends zero slots and does not re-dispatch the RED owner

