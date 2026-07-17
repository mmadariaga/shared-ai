## ADDED Requirements

### Requirement: project health checks absorb prereqs

The doctor SHALL emit a `[Project health]` section that performs the three checks currently defined in `sai/instructions/prereqs.md`: (1) the `openspec` binary is available on PATH, (2) an `openspec/` directory exists at the project root, and (3) `openspec/config.yaml` contains a line matching `schema: sai-workflow`. Each check SHALL be reported individually as pass or fail with the same corrective guidance `prereqs.md` gives (install OpenSpec, run `openspec init`, add `schema: sai-workflow`).

#### Scenario: openspec binary missing is reported
- **WHEN** the `openspec` binary is not on PATH
- **THEN** the `[Project health]` section reports the binary check as failed and recommends installing OpenSpec

#### Scenario: openspec directory missing is reported
- **WHEN** no `openspec/` directory exists at the project root
- **THEN** the `[Project health]` section reports the directory check as failed and recommends running `openspec init`

#### Scenario: wrong or missing schema is reported
- **WHEN** `openspec/config.yaml` does not declare `schema: sai-workflow`
- **THEN** the `[Project health]` section reports the schema check as failed and recommends adding `schema: sai-workflow`

#### Scenario: all project checks pass
- **WHEN** the binary is on PATH, `openspec/` exists, and the schema is declared
- **THEN** the `[Project health]` section reports all three checks as passing

### Requirement: project health contributes to aggregate exit code

A failure of any `[Project health]` check SHALL make the doctor's aggregate exit code red (`1`), consistent with harness-section failures.

#### Scenario: project failure turns exit code red
- **WHEN** any `[Project health]` check fails while all harness sections pass
- **THEN** the doctor still exits with code `1`
