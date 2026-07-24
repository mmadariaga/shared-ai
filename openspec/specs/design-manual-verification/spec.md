# design-manual-verification Specification

## Requirements

### Requirement: design.md ends with a Manual Verification section

`sai/instructions/design.md` SHALL require `openspec/changes/{name}/design.md` to close with a `## Manual Verification` section, listing the checks that are cheap to perform by hand and expensive to encode as automated tests.

The section SHALL be the closing section of `design.md`. When a change genuinely warrants no manual check, the section SHALL still be emitted with an explicit `None` and a one-line reason, so a reader can distinguish "nothing to check" from "not considered".

#### Scenario: Manual Verification closes design.md

- **WHEN** `sai-2-design` generates `design.md`
- **THEN** `## Manual Verification` is present as the file's closing section

#### Scenario: change with no manual check

- **WHEN** a change warrants no manual verification
- **THEN** `## Manual Verification` is emitted with `None` and a one-line reason
- **AND** the section is NOT omitted

### Requirement: Manual Verification covers generated-artifact drift and end-to-end smoke

The section SHALL cover two classes of check, each emitted only when the change makes it applicable:

1. **Generated-artifact drift** — whether artifacts produced by a generator are still in sync with their source after the change: database migrations, test snapshots, designer- or tool-generated files, lockfiles, and any committed build output.
2. **End-to-end smoke** — the shortest manual path through the changed behavior that confirms the pieces connect, described concretely enough to be followed without knowing the design.

Each item SHALL name what to check and what a correct result looks like. An item SHALL NOT be written as an unanchored instruction such as "verify it works".

#### Scenario: migration drift check emitted

- **WHEN** a change modifies a schema from which migrations are generated
- **THEN** `## Manual Verification` includes a generated-artifact drift item naming the migration output to inspect and the expected result

#### Scenario: end-to-end smoke path is concrete

- **WHEN** an end-to-end smoke item is emitted
- **THEN** it describes the specific path to exercise and the observable correct result
- **AND** it is NOT written as "verify it works" or an equivalent unanchored instruction

#### Scenario: inapplicable class omitted

- **WHEN** a change produces no generated artifacts
- **THEN** no generated-artifact drift item is emitted
- **AND** the section still emits any applicable end-to-end smoke item

### Requirement: Manual Verification is the middle tier, not a substitute for tests or review

`sai/instructions/design.md` SHALL state that `## Manual Verification` names the middle tier of a three-tier verification vocabulary: automated tests, manual checks, and downstream review. It SHALL NOT be used to record work that belongs in an automated test, nor to duplicate what `/sai-5-review` already covers.

An item SHALL qualify for `## Manual Verification` only when automating the check would cost meaningfully more than performing it by hand.

#### Scenario: automatable check is not routed here

- **WHEN** a check can be encoded as an ordinary automated test at reasonable cost
- **THEN** it belongs in the step's `**Testing Strategy**` and `interfaces.md`
- **AND** it is NOT listed under `## Manual Verification`

#### Scenario: review-scope item is not duplicated here

- **WHEN** a concern is already within `/sai-5-review`'s scope
- **THEN** it is NOT restated under `## Manual Verification`
