# instruction-reference-guard Specification

## Purpose
TBD - created by archiving change wrap-instruction-references-in-code-spans. Update Purpose after archive.

## Requirements

### Requirement: An npm test guard SHALL fail on any reference outside an inline code span

A test run by `npm test` SHALL scan every `*.md` file under `sai/`, `skills/`, `commands/`, and `agents/`, and SHALL fail when, outside fenced code blocks, a token that starts with `@sai/`, `@skills/`, or `@commands/` sits outside an inline code span. Inline code spans SHALL be recognized per paragraph, so a span that continues onto the next line still covers its content. Each violation SHALL be reported as `file:line`. The guard SHALL stop reading a file at the `<!-- User customizations below this line -->` marker. A token such as `@~/.config/opencode/skills/fetch/SKILL.md` SHALL NOT count as a reference.

#### Scenario: A bare reference is reported with file and line

- **WHEN** line 3 of `sai/x.md` contains `Fetch @sai/policies/b.md and follow it exactly.`
- **THEN** the guard fails with `sai/x.md:3: reference @sai/policies/b.md sits outside an inline code span`

#### Scenario: A wrapped reference passes

- **WHEN** a scanned file contains ``Fetch `@sai/policies/a.md` and follow it exactly.``
- **THEN** the guard reports no violation for that line

#### Scenario: The opencode bootstrap line passes

- **WHEN** a scanned file contains `Fetch @~/.config/opencode/skills/fetch/SKILL.md before you continue.`
- **THEN** the guard reports no violation for that line

#### Scenario: Text below the customization marker is ignored

- **WHEN** a bare reference appears below `<!-- User customizations below this line -->`
- **THEN** the guard reports no violation for it

### Requirement: The guard SHALL fail on a fenced reference that names an existing file

Inside a fenced code block, the guard SHALL report a reference as a violation, with `file:line`, only when its path names an existing repository file. A placeholder reference that contains `<`, `>`, `{`, `}`, `*`, `$`, or `…`, or a path that names no existing file, SHALL pass.

#### Scenario: Fenced reference to an existing file fails

- **WHEN** a fenced code block on line 4 of `sai/x.md` contains `Fetch @sai/policies/real.md` and that file exists
- **THEN** the guard fails with `sai/x.md:4: fenced reference @sai/policies/real.md names an existing file`

#### Scenario: Fenced placeholder reference passes

- **WHEN** a fenced code block contains `Fetch @sai/<path>` or `Fetch @sai/commands/{name}/body.md`
- **THEN** the guard reports no violation for those lines

### Requirement: The guard SHALL check only the installed instruction file set

The guard SHALL scan only Markdown files under `sai/`, `skills/`, `commands/`, and `agents/`. Files under `docs/`, `openspec/`, `test/`, and the repository `README` SHALL NOT be checked.

#### Scenario: Documentation outside the installed set is not checked

- **WHEN** a file under `docs/` contains a bare `@sai/` reference
- **THEN** the guard reports no violation for it
