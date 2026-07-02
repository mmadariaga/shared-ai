# apply-coordinator-verification Specification

## Purpose
TBD - created by archiving change delegate-apply-steps-to-subagent. Update Purpose after archive.
## Requirements
### Requirement: Coordinator re-runs the Step's Verification Checklist itself

Before marking a Step's checkboxes or proposing a commit, the coordinator SHALL re-run the Step's Verification Checklist itself and confirm it passes. The coordinator SHALL NOT mark checkboxes or commit based solely on the subagent's reported result.

#### Scenario: Subagent reports GREEN pass

- **WHEN** the subagent's report says the Step's GREEN verification passed
- **THEN** the coordinator independently re-runs the Step's Verification Checklist, and only marks the Step's checkboxes if its own run also passes

#### Scenario: Coordinator's re-run disagrees with the report

- **WHEN** the subagent reports success but the coordinator's own re-run of the Verification Checklist fails
- **THEN** the coordinator does NOT mark the Step's checkboxes and does NOT commit; it surfaces the discrepancy rather than trusting the report

### Requirement: Verification re-run must be the quiet confirmation, not the full execution

The coordinator's re-run SHALL be limited to the Step's Verification Checklist (the green confirmation), not a re-execution of the RED→GREEN cycle or the read-before-write reads, so the coordinator's context stays clean.

#### Scenario: Coordinator validates a completed Step

- **WHEN** the coordinator validates a Step the subagent already executed
- **THEN** it runs only the Step's Verification Checklist commands, not the RED test runs or file dumps that the subagent already absorbed

