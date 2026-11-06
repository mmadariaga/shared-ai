# decision-record-creation Specification

## Purpose
TBD - created by archiving change trim-design-contracts. Update Purpose after archive.

## Requirements

### Requirement: Decision record creation is single-sourced in one policy

`sai/policies/decision-record-creation.md` SHALL be the single source for creating the ADR and DDR records that design classifies. The design step SHALL resolve each qualifying decision's family as the `**Record family**: adr|ddr` marker and SHALL write no record. The criteria and the family routing test SHALL stay in `sai/policies/adr-ddr-criteria.md`, which SHALL point to the creation policy for the record a qualifying decision becomes.

#### Scenario: Design classifies and writes no record

- **WHEN** `/sai-2-design` evaluates a decision that meets all three ADR/DDR criteria
- **THEN** `design.md` carries `**Record family**: adr|ddr` for that decision and no file under `docs/adr/` or `docs/ddr/` is written by the design

### Requirement: The outermost implementing command creates the records at its completed close

The records SHALL be created by the outermost implementing command, the command the user invoked directly, only when its run completes, so each record describes the code that was built. A directly invoked `/sai-3-implement` SHALL create them at its completed close, in its own local commit. Inside `/sai-build`, neither implement segment SHALL create records; `/sai-build` SHALL create them at its own close, only when every segment it ran completed (a review segment that found no changes counts as completed), from the final code and the deviations both implement segments reported. Inside `/sai-deep-review`, the completed close of its fix segment SHALL create them, and a run whose fix segment did not run SHALL create none. A stopped, blocked, or unanswered run SHALL create none. Invoking the command SHALL authorize this one local commit, and nothing SHALL be pushed.

#### Scenario: A directly invoked implement run completes

- **WHEN** a directly invoked `/sai-3-implement` run completes on a change whose `design.md` has a decision carrying `**Record family**`
- **THEN** it creates one record per such decision and updates the family's index in one local commit before its closing report

#### Scenario: A stopped implement run

- **WHEN** a `/sai-3-implement` run stops, is blocked, or ends on an unanswered escalation
- **THEN** it creates no decision record

#### Scenario: Build creates the records at its own close

- **WHEN** `/sai-build` runs its implement, review, and fix segments and every segment it ran completes
- **THEN** neither implement segment creates a record and `/sai-build` creates them at its close from the final code and the deviations of both implement segments

#### Scenario: Build with a failed segment

- **WHEN** a `/sai-build` segment fails, is stopped, or ends blocked
- **THEN** `/sai-build` creates no decision record

#### Scenario: Deep review creates the records in its fix segment

- **WHEN** the fix segment of `/sai-deep-review` completes
- **THEN** that segment's close creates the records, and a `/sai-deep-review` run whose fix segment did not run creates none

### Requirement: Direct Build creates the records inside its single commit

The Direct Build - Unattended ADR/DDR pass SHALL, when the ordered routing test resolves a family for at least one decision of the block's Decisions & Rationale, prepare a decision-record order (the inventory and numbers through the executor, the already-cited check, and the `git check-ignore` check of each record and index path) and continue the same implementer with exactly that order. The implementer SHALL write exactly the listed records and index entries, never edit an existing record, and add every written path to its `changed_files`. The records SHALL enter the route's pre-authorized archived-change local commit; the pass SHALL add no commit, and the backfill artifact set SHALL gain no record. When no decision qualifies, the pass SHALL order nothing and leave the indexes untouched.

#### Scenario: Direct Build records a qualifying decision

- **WHEN** the Direct Build ADR/DDR pass resolves `adr` for a block decision
- **THEN** the implementer writes the record and its index entry on the coordinator's order, and they enter the route's pre-authorized archived-change local commit

#### Scenario: Direct Build with no qualifying decision

- **WHEN** no block decision qualifies under the routing test
- **THEN** the pass orders no record, leaves the indexes untouched, and says so in its one-line outcome

### Requirement: A change receives its records once

A decision SHALL qualify when it carries `**Record family**: adr|ddr` in `design.md`'s `## Decisions` (for Direct Build, when its pass resolves a family for a block decision). A design with no qualifying decision SHALL create no record and leave the indexes untouched. Before creating a record, the creator SHALL skip a decision when a record of its family, in `docs/<family>/` or its `archive/` folder, already cites it through a `## Provenance` section naming the change in backticks and the decision's title. A later run on the same change SHALL NOT re-create a record that already cites the change, even when that run has deviations of its own.

#### Scenario: A design with no record family

- **WHEN** a completed run's `design.md` has no decision carrying `**Record family**`
- **THEN** no record is created, the indexes are untouched, and the closing report says nothing about decision records

#### Scenario: A later run on the same change

- **WHEN** a `/sai-deep-review` runs on a change whose decisions `/sai-build` already recorded
- **THEN** it creates no second record for those decisions, even though its own deviations appear in its report

### Requirement: Records follow the inventory, the family layout, and the final code

For each family with a decision to record, the creator SHALL run `sai/tools/decision-records.js inventory --family <adr|ddr>` and number the first new record with `next_number` and each further record with the next number. When `docs/<family>/` or its `0000-INDEX.md` is missing, it SHALL create what is missing: the folder, and the index from `sai/commands/implement/adr-index.template.md` or `ddr-index.template.md` with the skeleton note and cold-build comments removed. It SHALL write `docs/<family>/NNNN-<kebab-title>.md` following the layout of the newest record in the folder, or, with none, the sections `## Status`, `## Context`, `## Decision`, `## Alternatives Considered`, `## Consequences`, and `## Provenance`. The Decision SHALL state what the code does at the end of the run; when the run departed from the planned decision, the record SHALL describe what was implemented and cite the deviation with its reason. It SHALL add one entry line per new record to the family's index in the form the existing entries use, keeping the index structure. Existing records SHALL never be edited; a decision that changes an earlier record SHALL be a new record carrying the relationship.

#### Scenario: First record in a project without the family folder

- **WHEN** a record is created in a project with no `docs/adr/` folder or no `docs/adr/0000-INDEX.md`
- **THEN** the creator creates the folder and the index from the ADR index template and adds the record's entry to it

#### Scenario: The run departed from the decision

- **WHEN** the implement run recorded a deviation from a decision that carries `**Record family**`
- **THEN** the record describes what was implemented and cites that deviation with its reason

### Requirement: Ignored record paths stay uncommitted and are reported

The creator SHALL check every record path and the index path with `git check-ignore -q <path>` and SHALL never force-add an ignored path; an ignored path SHALL stay on disk uncommitted. A committing command SHALL stage exactly the non-ignored record and index paths in one local Conventional Commits commit with a subject of at most 50 characters, and SHALL commit nothing when every path is ignored. The closing report SHALL list the records created with their paths, the paths left uncommitted because the project ignores them, and the decisions skipped because a record already cites them.

#### Scenario: The project ignores the decision-record folder

- **WHEN** the project's ignore rules cover the path of a record or its index
- **THEN** the file stays on disk uncommitted, is never force-added, and the closing report says so
