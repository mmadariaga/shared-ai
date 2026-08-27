# explore-technical-uncertainty-assessment Specification

## Purpose
TBD

## Requirements

### Requirement: assess technical uncertainty as a third crystallization axis

`sai-explore` SHALL run a technical-uncertainty assessment after the size and integration-point friction assessments and before emitting any feature `Ready to Propose` block. The assessment SHALL fire only when the same integration depends on both an unused third-party library, service, or API and insufficient documentation or prior art for the required technical or integration case.

The assessment SHALL remain orthogonal to size and friction. It SHALL not fire for product uncertainty, UX uncertainty, a product-discovery spike, or uncertainty about whether users want the feature. The trigger SHALL identify the specific unused third party and the specific documentation or prior-art gap.

#### Scenario: both technical-uncertainty signals are present

- **WHEN** the candidate idea depends on an unused third party and the available documentation or prior art does not demonstrate the required integration case
- **THEN** the technical-uncertainty assessment fires before feature-block emission and routes to the uncertainty pause

#### Scenario: one technical-uncertainty signal is absent

- **WHEN** the candidate idea has an unused third party but sufficient integration documentation, or has insufficient documentation for a third party already integrated by the project
- **THEN** the technical-uncertainty assessment does not fire and normal size, friction, and crystallization routing continues

#### Scenario: product uncertainty does not trigger the assessment

- **WHEN** the uncertainty concerns product demand, UX preference, or whether users want the proposed behavior rather than the technical integration
- **THEN** the technical-uncertainty assessment does not fire

### Requirement: re-evaluate size and friction after a viable POC

When a technical-uncertainty POC completes with a viable result and the user chooses to crystallize the full change, `sai-explore` SHALL re-run the size and integration-point friction assessments against the post-POC repository state before emitting feature blocks. The POC SHALL not itself become a slice, change the Walking Skeleton's number, or create a slice 0.

#### Scenario: viable POC changes the integration site

- **WHEN** a viable POC changes the repository and the user selects `Crystallize full`
- **THEN** `sai-explore` re-runs the size and friction assessments against the post-POC integration site before composing feature slices

#### Scenario: viable POC leaves the integration site unchanged

- **WHEN** a viable POC leaves the size and integration-point conditions unchanged and the user selects `Crystallize full`
- **THEN** `sai-explore` still re-runs both assessments and preserves the resulting slice ordering

#### Scenario: POC is excluded from feature slicing

- **WHEN** the uncertainty pause launches a viability POC
- **THEN** the POC remains a separate prior execution and is not placed on the feature Idea Progress List or used to renumber feature slices
