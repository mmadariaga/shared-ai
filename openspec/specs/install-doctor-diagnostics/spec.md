# install-doctor-diagnostics Specification

## Purpose
TBD: Define install and doctor diagnostics for the complete binding-derived opencode worker census.

## Requirements

### Requirement: Doctor validates every binding-dispatched worker
The doctor's managed opencode-agent check SHALL iterate the complete derived census. For a parseable configuration with an object-valued `agent` map, every present derived name SHALL be reported as valid by name presence, while every absent derived name SHALL be reported as an error identifying the missing worker.

#### Scenario: Doctor catches the previously invisible spec worker
- **WHEN** the selected opencode configuration contains the previously registered workers but lacks `sai-1-spec-proposal-worker`
- **THEN** doctor reports `sai-1-spec-proposal-worker` as missing and exits with the existing error severity

#### Scenario: Customized derived entries remain healthy
- **WHEN** every derived worker name is present but one or more definitions use customized models, variants, permissions, or extra fields
- **THEN** doctor reports those names as valid without comparing or rejecting their customized definitions

#### Scenario: Malformed configuration remains an error
- **WHEN** the selected opencode configuration is absent, unparsable, or has a malformed root or agent map
- **THEN** doctor reports the affected derived-agent checks as errors using the existing diagnostic behavior

### Requirement: Installer and doctor diagnostics share census coverage
The install-time registration validation and the doctor's managed-agent inventory MUST consume the same derived census and MUST fail visibly rather than silently dropping a binding-dispatched worker. A missing explicit default is an install-time configuration error; a missing configured agent name is a doctor diagnostic error.

#### Scenario: Missing defaults fail before registration completes
- **WHEN** a binding declares a worker with no explicit registration defaults
- **THEN** installation fails with the worker name and binding source, and does not report a complete or healthy managed-agent registration

#### Scenario: Missing configured names are reported by doctor
- **WHEN** registration defaults exist but a selected user configuration omits one derived worker name
- **THEN** doctor reports that exact name as missing instead of treating the configuration as healthy

#### Scenario: Adding a binding expands both checks
- **WHEN** a valid binding and matching explicit defaults are added
- **THEN** installer coverage and doctor coverage both include the new worker without maintaining separate check lists

### Requirement: Doctor reports census derivation failures
Doctor MUST remain loadable when opencode census derivation fails. Its managed opencode-agent check SHALL catch malformed declarations, duplicate names, missing defaults, and orphan defaults from the shared lazy census resolver and SHALL emit an error diagnostic containing the actionable binding path or worker-name facts from the derivation failure instead of aborting during module import or diagnostic generation.

#### Scenario: Invalid binding becomes a doctor diagnostic
- **WHEN** doctor runs while an opencode binding declaration is malformed or duplicated
- **THEN** doctor emits an error diagnostic identifying the affected binding facts and continues producing its diagnostic result

#### Scenario: Invalid defaults become a doctor diagnostic
- **WHEN** doctor runs while a derived worker lacks defaults or a default has no binding
- **THEN** doctor emits an error diagnostic identifying the affected worker and continues producing its diagnostic result
