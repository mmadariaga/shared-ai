## MODIFIED Requirements

### Requirement: sai-2-design emits interfaces.md
When the routed design worker and its active step-local contract generate artifacts for a change, the agent SHALL write a per-change artifact `openspec/changes/{name}/interfaces.md` in addition to `design.md` and `tasks.md`. `interfaces.md` SHALL be a separate file — it SHALL NOT be a section of `tasks.md`, `design.md`, or any other artifact.

The concrete public signatures and exact test assertions that `interfaces.md` carries are the "detailed behavior" that `tasks.md`'s conciseness rule excludes; they SHALL live only in `interfaces.md`, never restated into `tasks.md`.

#### Scenario: interfaces.md written alongside design and tasks
- **WHEN** `sai-2-design` completes generation for a change
- **THEN** `openspec/changes/{change-name}/interfaces.md` exists as a separate file next to `design.md` and `tasks.md`
- **AND** `tasks.md` still contains only its `## Step N` narrative scaffold with no concrete signatures or exact assertions copied into it

#### Scenario: signatures and assertions are not duplicated into tasks.md
- **WHEN** a step introduces a new public signature and its exact test assertions
- **THEN** that signature and those assertions appear in `interfaces.md` only
- **AND** the corresponding `## Step N` section of `tasks.md` references the spec by path without restating the signature or the assertions

#### Scenario: interfaces-remains-a-routed-artifact
- **WHEN** routed design generation completes
- **THEN** `interfaces.md` exists beside `design.md` and `tasks.md` and is produced under the live step-owned contract.

