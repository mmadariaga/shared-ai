# implement-design-carry-through Specification

## Purpose
This capability defines how `/sai-3-implement` carries three design outputs into `implementation.md` — Existing Tests Broken, Manual Verification, and Migration Plan — and how its validation step checks that each is carried or explained.

## Requirements

### Requirement: Existing Tests Broken entries become RED-block existing tests to update

Each entry of a Step's `**Existing Tests Broken**` field in `tasks.md` SHALL appear in that Step's RED block as one `**Existing tests to update:**` line naming the exact repository-relative path and its `compile` or `runtime` failure mode. A Step with a non-empty `Existing Tests Broken` SHALL carry a RED block, and a green-direct Step SHALL require `None`. A test that no longer makes sense SHALL become a retirement instead of an update. An absent field, or a `tasks.md` older than the field, SHALL count as `None`.

#### Scenario: Broken existing test is carried into the RED block

- **WHEN** a Step's `Existing Tests Broken` names a test file with failure mode `runtime`
- **THEN** the Step's RED block carries an `**Existing tests to update:**` line with that exact path and the `runtime` mode

#### Scenario: Non-empty field forces a RED block

- **WHEN** a Step's `Existing Tests Broken` is non-empty
- **THEN** the Step carries a RED block and is not routed as green-direct

#### Scenario: Obsolete existing test becomes a retirement

- **WHEN** an `Existing Tests Broken` entry names a test that no longer makes sense after the Step
- **THEN** the plan lists that file as retired in the RED block instead of as an existing test to update

#### Scenario: Absent field counts as None

- **WHEN** `tasks.md` predates the `Existing Tests Broken` field or the Step declares `None`
- **THEN** no `**Existing tests to update:**` line is generated for that Step

### Requirement: Manual Verification items become Functional checkboxes

Each item of `design.md`'s `Manual Verification` section SHALL become one `- [ ]` checkbox under the `**Functional (...)**` header of the first Step where it can be observed, or of the last Step when it is observable only at the end. An absent section SHALL count as `None`.

#### Scenario: Item observable in a specific Step

- **WHEN** a Manual Verification item can first be observed in Step 2
- **THEN** Step 2 carries it as a `- [ ]` checkbox under its `**Functional (...)**` header

#### Scenario: Item observable only at the end

- **WHEN** a Manual Verification item is observable only once the whole change is in place
- **THEN** the last Step carries it as a `- [ ]` checkbox under its `**Functional (...)**` header

#### Scenario: No Manual Verification section

- **WHEN** `design.md` has no `Manual Verification` section
- **THEN** no Functional checkbox is generated for it

### Requirement: Migration Plan is reflected in Step order or an italic note

When `design.md` carries a `Migration Plan`, its ordering and rollback constraints SHALL be reflected in the Step order or in an italic `*(...)*` note in the plan. When no Migration Plan exists, nothing SHALL be generated for it.

#### Scenario: Migration Plan with ordering constraints

- **WHEN** `design.md` carries a Migration Plan with an ordering or rollback constraint
- **THEN** the plan reflects it in the Step order or in an italic `*(...)*` note

#### Scenario: No Migration Plan

- **WHEN** `design.md` has no Migration Plan
- **THEN** the plan carries no migration note

### Requirement: Implement validation checks the three design fields are carried or explained

The implement validation step SHALL verify that every `Existing Tests Broken` entry in `tasks.md` and every `Manual Verification` item and `Migration Plan` entry in `design.md` is carried into the plan at its fixed location or explained in one line in the plan. An absent entry, a missing section, or a field older than the artifact SHALL count as `None` and SHALL NOT fail validation. A Step with a non-empty `Existing Tests Broken` SHALL have a RED block, and a green-direct Step SHALL have none.

#### Scenario: Entry carried at its location

- **WHEN** every design entry appears as an update line, a Functional checkbox, or Step order or an italic note
- **THEN** the carry-through check passes

#### Scenario: Entry explained in one line

- **WHEN** a design entry is not carried but the plan explains in one line why not
- **THEN** the carry-through check passes

#### Scenario: Older artifact does not fail validation

- **WHEN** `tasks.md` lacks `Existing Tests Broken` or `design.md` lacks `Manual Verification` or `Migration Plan`
- **THEN** validation treats the field as `None` and does not fail

### Requirement: Implement delivery requires Apply-compatible preflight

Implement's validation step SHALL resolve Apply's tool through the shared tool-resolution policy and run its read-only preflight before delivering the plan or emitting validation progress. Delivery SHALL require exit zero and `ok: true`.

A missing tool, failed invocation, incomplete check, or unsupported required block, command, or path SHALL block delivery. Implement SHALL repair and rerun the shared check rather than substitute prose review or an independent parser. The existing implementation.md versioning policy SHALL remain unchanged.

#### Scenario: Consumer parser rejects the generated plan
- **WHEN** Apply preflight reports an unsupported plan instruction during Implement validation
- **THEN** Implement repairs the plan and reruns preflight before delivery

### Requirement: Existing-test carry-through is checked with semantic review

Implement SHALL carry every identified consumer test and shared fixture into its owning RED block's Existing tests to update declaration using exact backticked paths and compile or runtime failure modes. It SHALL review Design's supporting analysis even when Existing Tests Broken is None. GREEN SHALL retain its test-file prohibition.

Preflight SHALL check declared path and failure-mode carry-through but SHALL not guarantee the completeness of semantic impact review.

#### Scenario: Runtime adaptation is declared
- **WHEN** Design identifies an existing consumer test whose assertions must change
- **THEN** Implement assigns its exact path and runtime mode to RED and verifies carry-through before delivery
