# independent-mutation-development-tool Specification

## Purpose
Keep reproducible local Stryker execution available to repository developers independently of the review command and its report.

## Requirements

### Requirement: Independent reproducible Stryker workflow

The repository SHALL retain Stryker as a development dependency, `test:mutation` invoking `stryker run`, and packaged `stryker.config.js`. The configuration SHALL run `node --test`, default to `bin/install.js`, allow explicit scope through `SAI_MUTATION_SCOPE` or the engine CLI, ignore CodeGraph and git metadata, emit clear-text and JSON reports, use a 60000ms timeout with serial execution, and clean temporary output. Review SHALL neither probe nor invoke this workflow. Configuration assertions SHALL live separately from review command tests.

#### Scenario: Independent local mutation run
- **WHEN** a developer invokes `npm run test:mutation`
- **THEN** the checked-in engine configuration produces engine-owned results for the configured scope without entering review

#### Scenario: Explicit scope override
- **WHEN** `SAI_MUTATION_SCOPE` lists explicit production paths
- **THEN** Stryker uses those paths instead of the default scope

### Requirement: Review mutation smoke machinery is retired

The repository SHALL contain no `mutation-smoke.js`, `test/fixtures/stryker-smoke.config.js`, `test/fixtures/mutation-target.js`, `test/fixtures/mutation-target.test.js`, or `test:mutation:smoke` script. Tests SHALL assert their absence without deleting unrelated tests or tooling.

#### Scenario: Smoke retirement preserves development tooling
- **WHEN** the package and test inventory are inspected
- **THEN** review-specific smoke machinery is absent while the Stryker dependency, configuration, and independent script remain
