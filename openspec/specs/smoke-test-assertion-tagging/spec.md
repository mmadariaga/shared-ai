# smoke-test-assertion-tagging Specification

## Purpose
TBD - created by archiving change smoke-test-assertion-marks. Update Purpose after archive.

## Requirements

### Requirement: Design marks smoke-test assertions
The design `interfaces` step, `sai/commands/design/steps/interfaces.md`, SHALL write each step's `**Test assertions**` in `interfaces.md` as the list that `sai/policies/step-contract-format.md` defines, and SHALL put the `[smoke-test]` mark on every assertion that meets that policy's smoke-test criterion. The step SHALL point to the policy for the mark and the criterion rather than restating them.

#### Scenario: A critical assertion is marked
- **WHEN** design writes an assertion whose failure would leave the system useless for its main purpose
- **THEN** the assertion's list item starts with `[smoke-test]`

#### Scenario: A secondary assertion stays unmarked
- **WHEN** design writes an assertion that meets neither condition of the smoke-test criterion
- **THEN** the assertion's list item carries no mark

### Requirement: Design records the smoke-test tagging mechanism in tasks.md
When at least one assertion of `interfaces.md` carries the smoke-test mark, the design `interfaces` step SHALL add the field `**Smoke-test tagging**` to `## Implementation Context` in `tasks.md`, after `**Test Command**`, leaving `**Test Command**` unchanged. The field SHALL be one line chosen from the test-runner research of the `tasks` step and SHALL name one of: the project's native tag mechanism with its concrete syntax; `[smoke-test]` in the test name, when the runner has no native tag mechanism and its test names can hold the text; or that the tests stay untagged, when the runner has neither. When no assertion is marked, or `interfaces.md` holds the `None — no step contracts` sentinel, `tasks.md` SHALL carry no `**Smoke-test tagging**` field, and the step SHALL remove one that an earlier run wrote.

#### Scenario: A marked assertion adds the tagging line
- **WHEN** design marks at least one assertion and the project's test runner has a native tag mechanism
- **THEN** `tasks.md` `## Implementation Context` carries `**Smoke-test tagging**` after `**Test Command**`, naming that mechanism and its syntax

#### Scenario: No marked assertion leaves no tagging line
- **WHEN** no assertion of `interfaces.md` is marked, or the file holds the `None — no step contracts` sentinel
- **THEN** `tasks.md` carries no `**Smoke-test tagging**` field

#### Scenario: A runner with neither tags nor flexible names
- **WHEN** design marks an assertion and the test runner has no native tag mechanism and its test names cannot hold `[smoke-test]`
- **THEN** the `**Smoke-test tagging**` field states that the tests stay untagged

### Requirement: RED tags tests written from marked assertions
The RED step, `sai/commands/implement/steps/red-step.md`, SHALL apply the tag that `**Smoke-test tagging**` in `tasks.md` names to every test it writes, or modifies within the existing tests its brief lets it modify, from an `interfaces.md` assertion that carries the smoke-test mark. A test written from several assertions SHALL take the tag when any of them is marked. RED SHALL never remove an existing smoke-test tag. RED SHALL add no tag when the field is absent or states that the tests stay untagged, SHALL read an `interfaces.md` in the earlier prose form as before with no tag, and SHALL tag no test it writes for an audit finding.

#### Scenario: A test from a marked assertion is tagged
- **WHEN** RED writes a test from an assertion marked `[smoke-test]` and `**Smoke-test tagging**` names a mechanism
- **THEN** the test carries the tag that mechanism defines

#### Scenario: A test from several assertions with one marked
- **WHEN** RED writes one test from several assertions and at least one of them is marked
- **THEN** the test carries the smoke-test tag

#### Scenario: Earlier prose form is read unchanged
- **WHEN** RED reads an `interfaces.md` whose `**Test assertions**` is one prose paragraph
- **THEN** it writes the tests as before and applies no smoke-test tag

#### Scenario: Audit-finding tests stay untagged
- **WHEN** RED writes a test for a review or audit finding
- **THEN** the test carries no smoke-test tag

### Requirement: The implement step review checks smoke-test tags
The structural check of the `/sai-3-implement` step review, in `sai/commands/implement/coordinator.md`, SHALL confirm that every test written from an `interfaces.md` assertion that carries the smoke-test mark carries the tag that `**Smoke-test tagging**` in `tasks.md` names, and SHALL report a marked assertion whose test lacks the tag as a spec-fidelity finding. A step without that field, or whose field states that the tests stay untagged, SHALL owe no tag.

#### Scenario: A missing tag is a finding
- **WHEN** a step's test written from a marked assertion lacks the tag `**Smoke-test tagging**` names
- **THEN** the step review reports a spec-fidelity finding

#### Scenario: An untagged field owes no tag
- **WHEN** `**Smoke-test tagging**` states that the tests stay untagged
- **THEN** the step review reports no finding for a missing smoke-test tag
