# explore-docs-drift-check Specification

## Purpose
TBD - created by archiving change explore-docs-drift-check. Update Purpose after archive.
## Requirements
### Requirement: Docs-triggered verification SHALL fire only on normative basis

When an ADR, DDR, spec, docs file, or openspec specs file is cited as the normative basis for a correctness claim about current code behavior, the explorer SHALL trigger verification. Incidental mention, background, or history SHALL never trigger verification, and a pure documentation read that only summarizes SHALL require no verification unless the document is later used to assert current code behavior.

#### Scenario: Normative citation triggers bounded check
- **WHEN** an answer cites a document as the normative basis for a correctness claim about current behavior
- **THEN** the explorer confirms the load-bearing claims in code before finalizing that claim

### Requirement: Bounded confirmation SHALL confirm 1-2 load-bearing claims then stop

The explorer SHALL confirm at most the 1-2 load-bearing claims that sustain the answer with a ladder-governed targeted lookup plus one read each, then stop. The ladder and out_of_root_requests handling SHALL remain unchanged.

#### Scenario: Two claims confirmed then answer proceeds
- **WHEN** a normative document supports an answer with two load-bearing claims
- **THEN** the explorer verifies those two claims in code and stops further verification

### Requirement: Unverifiable claims SHALL be reported as unverified unknown never as drift

A claim that cannot be mapped to code, code outside the project root or otherwise inaccessible, and any claim left unverified when the 40-call per-segment ceiling is exhausted SHALL be reported as unverified or unknown with an explicit declaration, recorded in out_of_root_requests when out of root, and SHALL never be reported as drift.

#### Scenario: Unmappable claim declared unknown
- **WHEN** a normative claim cannot be mapped to accessible code
- **THEN** the explorer reports it as unverified unknown rather than drift

### Requirement: Confirmed drift SHALL be reported as low informative non-blocking note citing both sides

Confirmed drift SHALL be a low or informative non-blocking note that cites both sides with doc path plus claim versus code path plus observation and SHALL never gate the answer.

#### Scenario: Drift cited without blocking
- **WHEN** code observation contradicts a normative document claim
- **THEN** the explorer reports both sides as a non-blocking note and continues the answer

### Requirement: Absent decision indexes SHALL be a non-event with no verification

An absent ADR or DDR index SHALL be a non-event with no verification, log, or mention. When an index entry is cited as in force, that claim SHALL be verified like any other normative claim.

#### Scenario: Missing index proceeds silently
- **WHEN** no ADR or DDR index exists for a researched area
- **THEN** the explorer proceeds without verification or mention of the absence

