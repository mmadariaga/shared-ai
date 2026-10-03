# main-ci-protection Specification

## Purpose
Define the delivered documentation that distinguishes workflow configuration from main-branch merge enforcement and records the separate activation prerequisites.

## Requirements

### Requirement: Explicit pending protection delivery status

`docs/ci.md` SHALL distinguish workflow delivery from protection activation. It SHALL report protection activation as pending until actual workflow executions, specific authorization, the settings change, and effective-rule verification are complete. Workflow-file existence SHALL NOT be presented as evidence of active merge enforcement.

This requirement governs delivered documentation; it does not assert that protection settings were changed.

#### Scenario: Workflow exists without verified activation

- **WHEN** the workflow is delivered but protection activation has not been completed and verified
- **THEN** the documentation reports protection activation as pending rather than delivered.

### Requirement: Separately authorized activation instructions

`docs/ci.md` SHALL describe protection activation as a separate administrator operation requiring explicit authorization. Its instructions SHALL require inspecting actual Linux, Windows, package, and `CI Required` executions on the current revision; preserving existing rules; requiring `CI Required` from GitHub Actions and an up-to-date branch without new bypass grants; and reading back main's effective rules.

The instructions SHALL identify missing administrative permission as a blocker and require checking that an older successful revision does not permit merging a newer unchecked revision.

#### Scenario: Activation procedure is consulted

- **WHEN** an administrator consults the activation instructions
- **THEN** the documented procedure separates authorization, actual-run inspection, rule configuration, and effective-rule verification.

#### Scenario: Administrative permission is missing

- **WHEN** administrative permission is unavailable
- **THEN** the documentation identifies it as a blocker rather than treating workflow delivery as completed protection activation.

### Requirement: Activation limitations and existing failures are disclosed

`docs/ci.md` SHALL disclose the known pre-existing full-suite failure, local skipped coverage, and the absence of verified GitHub platform executions. It SHALL direct activation preparation to resolve or explicitly approve the scope of fixes for existing failures without disabling tests.

The documentation SHALL state that no-cost runner usage depends on the repository remaining public and GitHub continuing the applicable free conditions, and SHALL instruct against automatically enabling paid alternatives.

#### Scenario: Local checks contain an existing failure

- **WHEN** local test results contain the pre-existing selector failure
- **THEN** the documentation identifies that failure and does not claim that both GitHub platforms have passed.

#### Scenario: Free-usage conditions change

- **WHEN** the repository's public status or GitHub's applicable free-runner conditions change
- **THEN** the documentation does not authorize automatically enabling paid alternatives.
