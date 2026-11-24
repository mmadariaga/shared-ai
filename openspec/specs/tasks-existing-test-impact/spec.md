# tasks-existing-test-impact Specification

## Purpose

This capability requires task steps to identify affected existing tests and explain their failure modes without restating test assertions.

## Requirements

### Requirement: Contract changes require semantic consumer and fixture review

When a Step changes mandatory fields, constraints, or results of an existing contract, Design SHALL review current consumers and shared test fixtures, including runtime assertions rather than only compilation references, and SHALL decide whether each consumer needs its own step: a consumer that is production code tested by the same scenarios SHALL stay in the step, and a consumer that no test can pin SHALL go to a step without tests that lists it under `**Files Affected**`. Existing tests of the old contract SHALL be updated by the plan RED inside its bound, not declared in `tasks.md`. Semantic completeness SHALL remain agent-owned and SHALL not be claimed as a deterministic preflight guarantee.

#### Scenario: Contract result changes
- **WHEN** an existing contract changes a mandatory result consumed by production code, tests, and documentation
- **THEN** Design keeps the tested production consumers in the changing step, puts the documentation in a step without tests, and leaves the existing tests to the plan RED

#### Scenario: Review finds no broken existing tests
- **WHEN** a contract-changing Step has no existing test that uses the changed signature or asserts a modified or removed scenario
- **THEN** `tasks.md` carries no `**Existing Tests Broken**` field and the plan RED reports no entry in `modified_tests`
