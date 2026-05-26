# implement-red-phase-contract Specification

## Purpose
TBD - created by archiving change cost-optimizations. Update Purpose after archive.
## Requirements
### Requirement: The RED phase in implementation.md SHALL contain only the failing test, minimal stubs, and type-only scaffolding

The RED phase MUST NOT include any logic that would make the test pass. Real implementation, algorithm, branching, or data mapping belongs exclusively in the GREEN phase.

#### Scenario: RED phase is authored in the implementation plan
- **WHEN** a testable step's RED phase is written
- **THEN** it contains: (1) the test asserting the missing behaviour, (2) minimal stubs that expose the required symbol but return null/wrong value, (3) type-only scaffolding strictly required for the test file to compile
- **THEN** it does NOT contain any logic that satisfies the test assertion

#### Scenario: Stub is needed to avoid compilation errors
- **WHEN** the test file requires a symbol to compile
- **THEN** a minimal stub is created at the target file returning null or a wrong value so the test still fails with an assertion error, not a compilation error

---

### Requirement: Tests in the implementation plan SHALL be expressed as a stub plus a bullet list of scenarios

The implementation plan contains a minimal stub and a list of scenario descriptions. The `sai-4-apply` agent expands these into full test assertions during the RED phase execution.

#### Scenario: Implementation plan step is authored for a testable capability
- **WHEN** the implementation plan step for a testable capability is written
- **THEN** the RED phase contains a minimal stub code block and a bullet list of scenario descriptions (e.g. "Scenario A description", "Scenario B description")
- **THEN** it does NOT contain the full test assertion code inline

#### Scenario: sai-4-apply executes the RED phase
- **WHEN** `sai-4-apply` processes a RED phase with a stub and scenario list
- **THEN** it expands the scenario bullets into full test assertions before verifying the RED failure

---

### Requirement: Production code in the implementation plan SHALL be complete and executable

The distinction between test code (allowed as lightweight stub + scenarios) and production code (must be final and complete) is preserved.

#### Scenario: GREEN phase production code is authored
- **WHEN** the GREEN phase of a step is written
- **THEN** it contains complete, final, executable production code with no TODOs, partial implementations, or speculative paths

