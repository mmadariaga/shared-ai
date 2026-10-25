# dead-review-step-retirement Specification

## Purpose
TBD - created by archiving change remove-dead-review-steps. Update Purpose after archive.

## Requirements

### Requirement: Retired review-step surfaces are registered for install cleanup

The manifest SHALL retain sai-class retirement records for both harnesses for tools/validate-findings.js (retired-validate-findings-tool), commands/spec/steps/review.md (retired-spec-review-step), and commands/design/steps/review.md (retired-design-review-step). Historical hashes SHALL remain diagnostic and guarded-uninstall metadata. Installation and project refresh SHALL remove exact retired regular files or file symlinks even when edited or unrecognized, without migration, while skipping directories and linked parents.

#### Scenario: upgrade removes a managed retired copy
- **WHEN** an install upgrade runs against a harness root whose `sai/tools/validate-findings.js`, `sai/commands/spec/steps/review.md`, or `sai/commands/design/steps/review.md` matches a registered managed hash
- **THEN** the installer retires that copy under the corresponding `retirements` record

#### Scenario: Customized retired review step is removed
- **WHEN** installation encounters an edited regular file at a retired review-step path
- **THEN** it deletes that exact file regardless of content hash without touching unrelated paths

### Requirement: The findings-format validator tool is removed from the source tree

`sai/tools/validate-findings.js` and `test/validate-findings.test.js` SHALL NOT exist in the source tree, and `AGENTS.md`, `sai/policies/tool-resolution.md`, and `sai/policies/artifact-review-contract.md` SHALL NOT reference `validate-findings.js`. The artifact-review findings format SHALL remain checkable through `sai/tools/lint.js artifact-review`.

#### Scenario: no live surface resolves the retired tool

- **WHEN** the tool-resolution policy's per-tool invocation list is read
- **THEN** it names no `validate-findings.js` entry
