# selector-copy Specification

## Purpose
TBD - created by archiving change update-crystallization-selector-copy. Update Purpose after archive.
## Requirements
### Requirement: Plan-Unattended description emphasizes pre-implementation human review

The Plan-Unattended selector description SHALL state that it runs `sai-1` and `sai-2` to create the plan and stops for pre-implementation human review, preserving the fixed title, first position, and route identity `plan-unattended`.

#### Scenario: Plan description states review pause

- **WHEN** the crystallization-close selector is presented
- **THEN** the Plan-Unattended option SHALL present its fixed title with the revised description stating supervised `sai-1` and `sai-2` plan creation followed by the pre-implementation human review stop

### Requirement: Direct Build-Unattended description states direct implementation for fixes

The Direct Build-Unattended selector description SHALL state that it implements the change directly and updates specs afterward as ideal for fixes and simple changes, preserving the fixed title, second position, and route identity `direct-build-unattended`.

#### Scenario: Direct Build description states fix-lane scope

- **WHEN** the crystallization-close selector is presented
- **THEN** the Direct Build-Unattended option SHALL present its fixed title with the revised description stating direct implementation with post-hoc spec update for fixes and simple changes

### Requirement: Manual description directs full-control continuation

The Manual selector description SHALL direct the user to proceed manually with `/sai-1-spec <change-name>` with full control over the process, preserving the fixed title, third position, and route identity `manual`.

#### Scenario: Manual description states verbatim continuation

- **WHEN** the crystallization-close selector is presented
- **THEN** the Manual option SHALL present its fixed title with the revised description containing the verbatim literal `/sai-1-spec <change-name>` and the full-control statement

