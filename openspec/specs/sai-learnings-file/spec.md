# sai-learnings-file Specification

## Purpose

TBD - this spec was authored as a change delta and never merged into the main tree, so its requirements were invisible to validate, list, and archive. Summarize the capability here.

## Requirements

### Requirement: Canonical location and namespaced filename

The durable learnings artifact SHALL live at exactly one place: the project root, named exactly `SAI_LEARNINGS.md`. This is the single canonical location — every SAI phase that reads it does so there. No SAI instruction or spec SHALL place the canonical learnings file inside `openspec/changes/{name}/` or any other directory.

The filename SHALL be namespaced with the `SAI_` prefix. A generic name such as `LEARNINGS.md` SHALL NOT be used, because shared-ai installs into third-party repositories where such a file could collide with pre-existing retrospective or onboarding notes and silently feed unrelated prose into the pipeline.

The `/sai-3-implement` coordinator SHALL be the only writer of `SAI_LEARNINGS.md`, by its learnings promotion at run close. No other command, coordinator, or worker SHALL write it.

#### Scenario: Phase reads the learnings file

- **WHEN** any SAI phase reads the durable learnings artifact
- **THEN** it reads `./SAI_LEARNINGS.md` at the project root
- **AND** it does not look for a copy under `openspec/changes/{name}/` or any other directory

#### Scenario: Promotion writes the file

- **WHEN** any SAI phase would create or update the durable learnings artifact
- **THEN** only the `/sai-3-implement` coordinator does so, by its learnings promotion at run close, and it writes `./SAI_LEARNINGS.md` at the project root and in no other directory

#### Scenario: Consumer repo already has a generic learnings file

- **WHEN** the consuming repository already contains a `LEARNINGS.md` written by humans for an unrelated purpose
- **THEN** SAI neither reads nor writes that file, because the canonical name it looks for is `SAI_LEARNINGS.md`

### Requirement: Four fixed sections mirroring Implementation Context

`SAI_LEARNINGS.md` SHALL contain exactly four content sections, in this order: `## Stack`, `## Conventions`, `## Avoid`, `## Test Command`. No fifth section SHALL be introduced, and no section SHALL be renamed.

These four section names are deliberately identical to the four fields of `tasks.md`'s `## Implementation Context` (per `tasks-implementation-context`). For **Stack**, **Conventions**, and **Avoid** the identity is load-bearing, not cosmetic: it lets `/sai-2-design` merge section-into-field without a mapping layer.

**Test Command** is an explicit exception to that identity, and SHALL NOT be assumed to merge field-to-field. Its consuming field is contractually a single directly-executable command string, so its section obeys the single-valued shape defined below rather than the keyed-entry shape used by the other three sections. Any statement that all four sections merge without translation is incorrect and SHALL NOT be written into the format file or any instruction body.

A section with no entries SHALL be present with its heading and left empty rather than omitted, so that the file's shape is stable for a reader matching on headings.

#### Scenario: File is bootstrapped with a single entry

- **WHEN** the `/sai-3-implement` coordinator promotes one qualifying **Avoid** fact at run close and no `SAI_LEARNINGS.md` exists
- **THEN** it creates the file at the project root per the bootstrap rules of `sai/policies/sai-learnings-format.md`, with all four section headings present and the entry under **Avoid**

#### Scenario: A fact does not fit the four sections

- **WHEN** a candidate fact matches none of Stack, Conventions, Avoid, or Test Command
- **THEN** no SAI command promotes it, and no new section is created to hold it

#### Scenario: Design reads the four sections

- **WHEN** `/sai-2-design` reads `SAI_LEARNINGS.md` while authoring `## Implementation Context`
- **THEN** it takes the Stack, Conventions, and Avoid sections as the source for the matching fields and the Test Command section as the source for the test-command field, as `sai/commands/design/steps/tasks.md` directs

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

- **WHEN** `/sai-2-design` authors `## Implementation Context` in a repository with no `SAI_LEARNINGS.md`
- **THEN** it derives all four fields from codebase research exactly as it does today, and emits no warning about the missing file

#### Scenario: sai-4-apply starts in a repo with no learnings file

- **WHEN** the command catalog is read for `/sai-4-apply`
- **THEN** no `/sai-4-apply` command exists, so no apply run reads learnings and no apply run is affected by the file's absence

#### Scenario: Direct Build implementer runs in a repo with no learnings file

- **WHEN** the Direct Build implementer starts in a repository with no `SAI_LEARNINGS.md`
- **THEN** it proceeds from the block alone, with no error and no notice
