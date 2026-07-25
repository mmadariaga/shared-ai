## ADDED Requirements

### Requirement: Canonical location and namespaced filename

The durable learnings artifact SHALL live at exactly one place: the project root, named exactly `SAI_LEARNINGS.md`. This is the single canonical location — every SAI phase that reads or writes it does so there. No SAI instruction or spec SHALL place the canonical learnings file inside `openspec/changes/{name}/` or any other directory.

The filename SHALL be namespaced with the `SAI_` prefix. A generic name such as `LEARNINGS.md` SHALL NOT be used, because shared-ai installs into third-party repositories where such a file could collide with pre-existing retrospective or onboarding notes and silently feed unrelated prose into the pipeline.

#### Scenario: Promotion writes the file

- **WHEN** any SAI phase creates or updates the durable learnings artifact
- **THEN** it writes `./SAI_LEARNINGS.md` at the project root
- **AND** it does not create a copy under `openspec/changes/{name}/` or any other directory

#### Scenario: Consumer repo already has a generic learnings file

- **WHEN** the consuming repository already contains a `LEARNINGS.md` written by humans for an unrelated purpose
- **THEN** SAI neither reads nor writes that file, because the canonical name it looks for is `SAI_LEARNINGS.md`

### Requirement: Four fixed sections mirroring Implementation Context

`SAI_LEARNINGS.md` SHALL contain exactly four content sections, in this order: `## Stack`, `## Conventions`, `## Avoid`, `## Test Command`. No fifth section SHALL be introduced, and no section SHALL be renamed.

These four section names are deliberately identical to the four fields of `tasks.md`'s `## Implementation Context` (per `tasks-implementation-context`). For **Stack**, **Conventions**, and **Avoid** the identity is load-bearing, not cosmetic: it lets `/sai-2-design` merge section-into-field without a mapping layer.

**Test Command** is an explicit exception to that identity, and SHALL NOT be assumed to merge field-to-field. Its consuming field is contractually a single directly-executable command string, so its section obeys the single-valued shape defined below rather than the keyed-entry shape used by the other three sections. Any statement that all four sections merge without translation is incorrect and SHALL NOT be written into the format file or any instruction body.

A section with no entries SHALL be present with its heading and left empty rather than omitted, so that the file's shape is stable for a reader matching on headings.

#### Scenario: File is bootstrapped with a single entry

- **WHEN** `SAI_LEARNINGS.md` is created with one entry that belongs under **Avoid**
- **THEN** the file contains all four headings `## Stack`, `## Conventions`, `## Avoid`, `## Test Command` in that order, with the entry under **Avoid** and the other three headings present and empty

#### Scenario: A fact does not fit the four sections

- **WHEN** a candidate fact matches none of Stack, Conventions, Avoid, or Test Command
- **THEN** it is not promoted, and no new section is created to hold it

### Requirement: Per-entry shape keyed on a repo-level artifact

This requirement SHALL govern the **Stack**, **Conventions**, and **Avoid** sections only; the **Test Command** section is governed instead by "Test Command is single-valued and keyless" below.

Every entry in those three sections SHALL carry a key and a fact, and SHALL cite the run that observed it. The entry shape is:

    - **{key}**: {the durable fact, one or two sentences}
      *Observed:* {change-name} — {what was attempted and what actually happened}

The `{key}` SHALL name a **repo-level artifact** — a package, a build target, a command, a configuration file, a compiler or linter rule, a framework version constraint. The `{key}` SHALL NOT name a symbol, function, class, module, or file that the change being applied introduced or renamed.

The `*Observed:*` line SHALL name the change that surfaced the fact, so a reader can trace the entry back to the `## Appendix: Plan vs Final Implementation` it was promoted from.

Entries SHALL state a fact about the repository, not a narrative of one run. An entry whose content is only meaningful in the context of a single change SHALL NOT be written.

#### Scenario: A toolchain fact is written

- **WHEN** a run discovers that the project's linter rejects a construct the plan assumed was allowed
- **THEN** the entry keys on the linter rule identifier, states the durable fact and what works instead, and names the change in its `*Observed:*` line

#### Scenario: An entry would key on a new symbol

- **WHEN** a candidate entry's only stable anchor is a class the change just introduced
- **THEN** it is rejected, because the key must name a repo-level artifact rather than a symbol the change introduced

### Requirement: Test Command is single-valued and keyless

The `## Test Command` section SHALL hold at most one entry. That entry SHALL be a single directly-executable command string, carrying the project's parameterised scoping idiom where its runner supports one, in exactly the form `tasks-implementation-context` already mandates for the consuming field.

The entry SHALL NOT be written as a keyed bullet, SHALL NOT carry a `**{key}**:` prefix, and SHALL NOT place provenance on the same line as the command. Provenance SHALL sit on its own line beneath the command, so that the command line can be lifted verbatim without stripping syntax:

    {the directly-executable command, including the parameterised scoping idiom}
    *Observed:* {change-name}

Because the section holds at most one entry, supersede for **Test Command** SHALL replace the whole section rather than matching a key. A newer observation of the project's test invocation replaces the existing command outright.

When the project has no test runner, the section SHALL carry the same explicit sentinel the consuming field uses — `None — no test runner in this project` — rather than being left empty with a heading.

#### Scenario: A run observes the project's real test invocation

- **WHEN** a promotion writes the **Test Command** section
- **THEN** the section contains one command line that can be executed verbatim from the project root, with the `*Observed:*` provenance on a separate line beneath it, and no bullet marker or key prefix on the command line

#### Scenario: A later run observes a different invocation

- **WHEN** a promotion writes a **Test Command** while the section already holds one
- **THEN** the existing command is replaced outright, leaving exactly one command in the section

#### Scenario: Command line is lifted for injection

- **WHEN** a consumer takes the command from the **Test Command** section
- **THEN** it can use the command line as-is, because no bullet syntax, key prefix, or provenance text shares that line

### Requirement: Supersede-by-key replacement

This requirement SHALL govern the **Stack**, **Conventions**, and **Avoid** sections only; supersede for **Test Command** is whole-section replacement, defined above.

When an entry is written whose `{key}` already exists in the same section, the newer entry SHALL replace the older one in place. The older entry SHALL NOT be retained alongside the newer one, and SHALL NOT be preserved as history within the file.

Supersede SHALL match on the key only, within a single section. Two entries with the same key in different sections are distinct and SHALL NOT supersede each other.

Invalidation SHALL be expressed only as supersede-by-key. No SAI phase SHALL be granted authority to delete an entry because it believes the entry to be contradicted, out of date, or no longer relevant. This converts an active-detection problem into a passive-write property: an entry is corrected when a later run observes the same key again, and a stale entry otherwise survives until then.

#### Scenario: A later run observes the same key

- **WHEN** a promotion writes an entry keyed on a build target for which an entry already exists in the same section
- **THEN** the existing entry is replaced in place by the new one, leaving exactly one entry for that key in that section

#### Scenario: A phase believes an entry is stale

- **WHEN** any SAI phase reads an entry it judges to be contradicted by the current state of the repository
- **THEN** it does not delete or edit the entry, because invalidation happens only by a later write superseding the same key

#### Scenario: Same key appears in two sections

- **WHEN** a promotion writes an entry keyed on a package under **Stack** while an entry keyed on that same package exists under **Avoid**
- **THEN** both entries remain, because supersede matches within a single section only

### Requirement: Format contract lives in a dedicated instruction file

A new instruction file `sai/instructions/sai-learnings-format.md` SHALL define the canonical format of `SAI_LEARNINGS.md`. It SHALL be structured on the same model as `sai/instructions/glossary-format.md`, carrying at minimum: a scope statement, a canonical-location statement, the file structure, the rules, the append and supersede rules, and a bootstrap section.

The file body SHALL be wrapped in a delimiting block so that it can be quoted into a subagent prompt as a unit, matching how `glossary-format.md` wraps its body in a `<glossary_format>` block.

Every agent that reads, writes, or audits `SAI_LEARNINGS.md` SHALL conform to this format file.

#### Scenario: The format file is read

- **WHEN** `sai/instructions/sai-learnings-format.md` is read
- **THEN** it contains a scope statement, a canonical-location statement naming the project root, the four-section file structure, the per-entry shape, the supersede-by-key rule, and a bootstrap section

#### Scenario: The format body is quoted into a prompt

- **WHEN** a phase needs to pass the format contract to a subagent
- **THEN** it can quote a single delimited block, as it already does for the `<glossary_format>` block

### Requirement: Absence of the file is a silent no-op

When `SAI_LEARNINGS.md` does not exist at the project root, every reader SHALL skip its consumption step silently: no warning, no error, no prompt, and no halt. This mirrors the established handling of an absent root `GLOSSARY.md`, which causes the corresponding review category to be skipped entirely.

A repository that has never run `/sai-4-apply`, or whose runs have produced no qualifying entries, SHALL behave exactly as it does today.

#### Scenario: sai-2-design runs in a repo with no learnings file

- **WHEN** `/sai-2-design` authors `## Implementation Context` in a repository with no `SAI_LEARNINGS.md`
- **THEN** it derives all four fields from codebase research exactly as it does today, and emits no warning about the missing file

#### Scenario: sai-4-apply starts in a repo with no learnings file

- **WHEN** `/sai-4-apply` begins a run in a repository with no `SAI_LEARNINGS.md`
- **THEN** its Technical Learnings Memory starts empty as it does today, and the run proceeds without a prompt or halt
