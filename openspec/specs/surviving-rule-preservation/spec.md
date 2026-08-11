# surviving-rule-preservation Specification

## Purpose
TBD - created by archiving change archive-copilot-capability-specs. Update Purpose after archive.
## Requirements
### Requirement: Live normative content is preserved before archival

Each candidate MUST be reviewed requirement by requirement before it is moved. Any normative rule that remains in force for the supported pipeline MUST be relocated to, or confirmed in, its canonical active home before the candidate is archived; retired-only Copilot behavior MUST NOT be presented as an active contract. The canonical active home, rather than an archived historical spec, MUST be the source of truth for every surviving rule.

#### Scenario: The checkbox-discipline rule survives Copilot retirement

- **WHEN** `copilot-checkbox-discipline/spec.md` or `copilot-harness-removal/spec.md` is reviewed and its checkbox-discipline rule is still required
- **THEN** the rule is available in `sai/policies/remember.md` before the host spec is archived, and no downstream behavior relies on the archived candidate

#### Scenario: The OpenSpec path rules survive Copilot retirement

- **WHEN** `copilot-harness-removal/spec.md` records that its OpenSpec path rules were redistributed and the historical `sai/instructions/prereqs.md` reference no longer exists
- **THEN** the path rules are confirmed in the current canonical home `sai/policies/prereqs-paths.md` before `copilot-harness-removal` is archived, and the archived candidate is not the source of truth

#### Scenario: A surviving rule has no current canonical home

- **WHEN** per-spec review identifies normative content that remains in force but is not yet represented by an active policy or capability spec
- **THEN** equivalent normative content is added to the appropriate active canonical home before the source candidate is archived, and the archived copy is not used to satisfy the live contract

#### Scenario: A candidate is entirely retired-only

- **WHEN** per-spec review finds that every requirement and scenario in a candidate describes only the retired Copilot harness
- **THEN** no part of that candidate is treated as an active rule, and the candidate is eligible for archival under `copilot-capability-archival`

#### Scenario: Existing live wording is authoritative

- **WHEN** a surviving rule has already been redistributed to an active home
- **THEN** that active home remains authoritative and is not replaced by a duplicate or conflicting copy extracted from the candidate before archival
