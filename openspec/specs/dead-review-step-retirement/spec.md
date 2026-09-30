# dead-review-step-retirement Specification

## Purpose
TBD - created by archiving change remove-dead-review-steps. Update Purpose after archive.

## Requirements

### Requirement: Retired review-step surfaces are registered for install cleanup

`sai/install-manifest.json` SHALL carry `retirements` records for the `sai` destination class, for both the `claude` and `opencode` harnesses, covering `tools/validate-findings.js` (id `retired-validate-findings-tool`), `commands/spec/steps/review.md` (id `retired-spec-review-step`), and `commands/design/steps/review.md` (id `retired-design-review-step`). Each record SHALL list the managed content hashes of the previously shipped copies so that an upgrade removes an installed copy that is still managed.

#### Scenario: upgrade removes a managed retired copy

- **WHEN** an install upgrade runs against a harness root whose `sai/tools/validate-findings.js`, `sai/commands/spec/steps/review.md`, or `sai/commands/design/steps/review.md` matches a registered managed hash
- **THEN** the installer retires that copy under the corresponding `retirements` record

### Requirement: The findings-format validator tool is removed from the source tree

`sai/tools/validate-findings.js` and `test/validate-findings.test.js` SHALL NOT exist in the source tree, and `AGENTS.md`, `sai/policies/tool-resolution.md`, and `sai/policies/artifact-review-contract.md` SHALL NOT reference `validate-findings.js`. The artifact-review findings format SHALL remain checkable through `sai/tools/lint.js artifact-review`.

#### Scenario: no live surface resolves the retired tool

- **WHEN** the tool-resolution policy's per-tool invocation list is read
- **THEN** it names no `validate-findings.js` entry
