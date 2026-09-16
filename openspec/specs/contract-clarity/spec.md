# contract-clarity Specification

## Purpose
Define the failed-lifecycle reporting contract the four audit `steps/common.md` files apply when a change's `proposal.md` is missing.

## Requirements

### Requirement: Audit common steps SHALL report missing proposal as failed lifecycle result
Scope covers sai/commands/review/steps/common.md, sai/commands/security/steps/common.md, sai/commands/performance/steps/common.md, and sai/commands/accessibility/steps/common.md.
#### Scenario: Missing proposal in audit common steps
- **WHEN** proposal.md is absent for the named change
- **THEN** the step returns failed with exactly the plain-text proposal-missing failure literal
