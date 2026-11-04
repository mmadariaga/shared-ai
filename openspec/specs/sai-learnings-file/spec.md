# sai-learnings-file Specification

## Purpose

Defines the project-root `SAI_LEARNINGS.md` file: its location and name, its single-valued Test Command, and its dedicated format policy.

## Requirements

### Requirement: Canonical location and namespaced filename

The durable learnings artifact SHALL live at exactly one place: the project root, named exactly `SAI_LEARNINGS.md`. This is the single canonical location — every SAI phase that reads it does so there. No SAI instruction or spec SHALL place the canonical learnings file inside `openspec/changes/{name}/` or any other directory.

The filename SHALL be namespaced with the `SAI_` prefix. A generic name such as `LEARNINGS.md` SHALL NOT be used, because shared-ai installs into third-party repositories where such a file could collide with pre-existing retrospective or onboarding notes and silently feed unrelated prose into the pipeline.

The `/sai-3-implement` coordinator SHALL be the only writer of `SAI_LEARNINGS.md`, by its learnings promotion at run close and by the evidence-backed correction or deletion of a stale entry at the same close. No other command, coordinator, or worker SHALL write it.

#### Scenario: Phase reads the learnings file

- **WHEN** any SAI phase reads the durable learnings artifact
- **THEN** it reads `./SAI_LEARNINGS.md` at the project root and does not look for a copy under `openspec/changes/{name}/` or any other directory

#### Scenario: Promotion writes the file

- **WHEN** any SAI phase would create, update, correct, or delete an entry of the durable learnings artifact
- **THEN** only the `/sai-3-implement` coordinator does so, at run close, and it writes `./SAI_LEARNINGS.md` at the project root and in no other directory

#### Scenario: Consumer repo already has a generic learnings file

- **WHEN** the consuming repository already contains a `LEARNINGS.md` written by humans for an unrelated purpose
- **THEN** SAI neither reads nor writes that file, because the canonical name it looks for is `SAI_LEARNINGS.md`

### Requirement: Test Command is single-valued and keyless

The `## Test Command` section SHALL hold at most one entry. That entry SHALL be a single directly-executable command string, carrying the project's parameterised scoping idiom where its runner supports one, in exactly the form `tasks-implementation-context` already mandates for the consuming field.

The entry SHALL NOT be written as a keyed bullet, SHALL NOT carry a `**{key}**:` prefix, and SHALL NOT place provenance on the same line as the command. Provenance SHALL sit on its own line beneath the command, so that the command line can be lifted verbatim without stripping syntax:

    {the directly-executable command, including the parameterised scoping idiom}
    *Observed:* {change-name}

The section holds at most one entry, so a reader takes that single command line as the test command.

When the project has no test runner, the section SHALL carry the same explicit sentinel the consuming field uses — `None — no test runner in this project` — rather than being left empty with a heading.

#### Scenario: A run observes the project's real test invocation

- **WHEN** the `/sai-3-implement` coordinator's learnings promotion writes the **Test Command** section
- **THEN** it writes the single directly-executable command line with `*Observed:*` provenance on its own line beneath it

#### Scenario: A later run observes a different invocation

- **WHEN** a later `/sai-3-implement` run promotes a **Test Command** that differs from the one the section holds
- **THEN** the new command replaces the whole section, so the section keeps exactly one command

#### Scenario: Command line is lifted for injection

- **WHEN** a consumer takes the command from the **Test Command** section
- **THEN** it can use the command line as-is, because no bullet syntax, key prefix, or provenance text shares that line

### Requirement: Format contract lives in a dedicated instruction file

A new instruction file `sai/policies/sai-learnings-format.md` SHALL define the canonical format of `SAI_LEARNINGS.md`. It SHALL be structured on the same model as `sai/policies/glossary-format.md`, carrying at minimum: a scope statement, a canonical-location statement, the file structure, the rules, the append and supersede rules, and a bootstrap section.

The file body SHALL be wrapped in a delimiting block so that it can be quoted into a subagent prompt as a unit, matching how `glossary-format.md` wraps its body in a `<glossary_format>` block.

Every agent that reads, writes, or audits `SAI_LEARNINGS.md` SHALL conform to this format file.

#### Scenario: The format file is read

- **WHEN** `sai/policies/sai-learnings-format.md` is read
- **THEN** it contains a scope statement, a canonical-location statement naming the project root, the four-section file structure, the per-entry shape, the supersede-by-key rule, and a bootstrap section

#### Scenario: The format body is quoted into a prompt

- **WHEN** a phase needs to pass the format contract to a subagent
- **THEN** it can quote a single delimited block, as it already does for the `<glossary_format>` block

### Requirement: Absence of the file is a silent no-op

When `SAI_LEARNINGS.md` does not exist at the project root, every reader SHALL skip its consumption step silently: no warning, no error, no prompt, and no halt. This mirrors the established handling of an absent root `GLOSSARY.md`, which causes the corresponding review category to be skipped entirely.

A repository without `SAI_LEARNINGS.md` SHALL behave exactly as it does today.

#### Scenario: sai-2-design runs in a repo with no learnings file

- **WHEN** `/sai-2-design` runs in a repository with no `SAI_LEARNINGS.md`
- **THEN** its research step skips the file and it derives **Test Command** from codebase research, emitting no warning about the missing file

#### Scenario: sai-4-apply starts in a repo with no learnings file

- **WHEN** the command catalog is read for `/sai-4-apply`
- **THEN** no `/sai-4-apply` command exists, so no apply run reads learnings and no apply run is affected by the file's absence

#### Scenario: Direct Build implementer runs in a repo with no learnings file

- **WHEN** the Direct Build implementer starts in a repository with no `SAI_LEARNINGS.md`
- **THEN** it proceeds from the block alone, with no error and no notice

### Requirement: Four fixed sections

`SAI_LEARNINGS.md` SHALL contain exactly four content sections, in this order: `## Stack`, `## Conventions`, `## Avoid`, `## Test Command`. No fifth section SHALL be introduced, and no section SHALL be renamed. The section names SHALL NOT be tied to fields of `tasks.md`: no instruction merges a section into a `tasks.md` field, and design, RED, GREEN, and review read the sections directly.

A section with no entries SHALL be present with its heading and left empty rather than omitted, so that the file's shape is stable for a reader matching on headings.

#### Scenario: File is bootstrapped with a single entry

- **WHEN** the `/sai-3-implement` coordinator promotes one qualifying **Avoid** fact at run close and no `SAI_LEARNINGS.md` exists
- **THEN** it creates the file at the project root per the bootstrap rules of `sai/policies/sai-learnings-format.md`, with all four section headings present and the entry under **Avoid**

#### Scenario: A fact does not fit the four sections

- **WHEN** a candidate fact matches none of Stack, Conventions, Avoid, or Test Command
- **THEN** no SAI command promotes it, and no new section is created to hold it

#### Scenario: The format file names no tasks.md field mapping

- **WHEN** `sai/policies/sai-learnings-format.md` is read
- **THEN** it states no identity between its four section names and the fields of `tasks.md`'s `## Implementation Context`

### Requirement: Correction and deletion need execution evidence

The `/sai-3-implement` coordinator SHALL correct or delete a `SAI_LEARNINGS.md` entry only when a deviation of its run records that following the entry failed on execution. A correction SHALL replace the entry by key; an entry with no durable fact left SHALL be deleted. Each correction or deletion SHALL be written to the `## Learnings Corrections` section of the change's `design.md` and SHALL appear in the closing report. A belief that an entry is old, contradicted by code, or irrelevant SHALL NOT be evidence: the entry stays, and the closing report shows the contradiction.

#### Scenario: An entry contradicted only by code

- **WHEN** a run finds code that contradicts a `SAI_LEARNINGS.md` entry and no execution failed because of the entry
- **THEN** the entry stays unchanged and the closing report shows the contradiction

#### Scenario: An entry that failed on execution

- **WHEN** a deviation of the run records that following an entry failed on execution and another approach worked
- **THEN** the coordinator corrects or deletes that entry at close and records the correction in `## Learnings Corrections` of the change's `design.md`
