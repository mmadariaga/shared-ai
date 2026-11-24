# ready-to-propose-detection Specification

## Purpose
TBD - created by archiving change ready-to-propose-detector. Update Purpose after archive.

## Requirements

### Requirement: Issue HTML detection ignores tags inside code

The issue description HTML detection of `sai/tools/change-document.js` SHALL set aside backtick code spans and fenced code blocks before it looks for structural HTML tags (`h1`-`h6`, `p`, `div`, `ul`, `ol`, `li`, `br`), and SHALL treat the description as Markdown when it finds no structural tag outside code, when an opening Markdown heading is present, or when it is otherwise in doubt. The tool SHALL export this decision as `isHtmlDescription` so other adapters, the Azure DevOps import included, reuse the same detector.

#### Scenario: Tags only inside code

- **WHEN** an issue description is Markdown whose only HTML tags appear inside backtick code spans or fenced code blocks
- **THEN** the detector treats it as Markdown and conversion keeps the text unchanged.

#### Scenario: Structural HTML outside code

- **WHEN** an issue description has structural HTML tags outside code and no Markdown heading
- **THEN** the detector treats it as HTML.

### Requirement: Change document validator names each failed dispatchable check

`sai/tools/change-document.js check --document-file <path> [--verdicts-file <path>] [--slice]` SHALL parse a change document with a section parser that tracks fenced code blocks and SHALL print one JSON result that names each failed check. A document SHALL be dispatchable only when every `##` heading is a known section that appears once and in the agreed order, every present optional section is non-empty, Problem, Goal, Scope, and Non-goals are not `Not agreed yet.`, Open questions reads `None.`, Maturity reads `Ready to propose`, every item of Edge cases, Implementation notes, and Out-of-scope implementation notes carries its `E#` or `I#` with each `I#` appearing once, `## Change` is present with a valid `Change name:`, and every flagged hygiene line carries a `context` verdict. With Maturity at `Ready to propose`, an absent Edge cases or Implementation notes section SHALL mean the set was agreed empty; with `--slice`, the document SHALL also carry at least one `I#` in Implementation notes. The command SHALL exit 0 when the document is dispatchable, 1 when it is not, and 2 on a usage or input error.

#### Scenario: Unready agreement is named

- **WHEN** a document has Maturity other than `Ready to propose`, Open questions other than `None.`, a mandatory section reading `Not agreed yet.`, or no `## Change` section or `Change name:` line
- **THEN** it is not dispatchable and the result names each failed check.

#### Scenario: Unknown, out-of-order, or empty sections are named

- **WHEN** a document has an unknown `##` heading, sections out of the agreed order, or a present optional section with no content
- **THEN** it is not dispatchable and the result names the heading.

#### Scenario: Fenced headings are ignored

- **WHEN** a heading or a `---` line appears inside a fenced code block
- **THEN** the validator treats it as content of the enclosing section.

#### Scenario: A slice member owes an implementation item

- **WHEN** a ready document without Edge cases or Implementation notes is checked alone, and then with `--slice`
- **THEN** it is dispatchable alone, and with `--slice` it is not dispatchable for lacking an in-scope `I#`.

#### Scenario: An invalid Change value is refused

- **WHEN** `Change name` is not kebab-case, `Explore origin` is malformed, or `Specs: none` has no reason
- **THEN** the document is not dispatchable and the result names the field.

### Requirement: Change document set check validates a slice set

`sai/tools/change-document.js check-set` SHALL take one `--document-file` per document of a set, check each document as a slice member when the set holds more than one, and SHALL refuse a set with a repeated change name, an out-of-scope `I#` that no document holds in Implementation notes, a dependency on a change absent from the set, or a dependency cycle. It SHALL print the dependency order of the set and exit 0 only when the set and every document pass.

#### Scenario: A dependency cycle is refused

- **WHEN** two documents of a set depend on each other
- **THEN** `check-set` exits 1 and names the dependency cycle.

### Requirement: Change document compare classifies an amendment

`sai/tools/change-document.js compare --stored-file <path> --document-file <path>` SHALL report `amend_kind: metadata` when only the `Backlog origin:` or `Explore origin:` lines of `## Change` changed, an identical document included, and `amend_kind: content` otherwise, with the changed fields listed.

#### Scenario: Origin-only change of a document is metadata

- **WHEN** an amended document differs from the stored one only in its `Backlog origin:` line
- **THEN** `compare` reports `metadata`.

### Requirement: Change document tool reads issue sections for the intake

`sai/tools/change-document.js sections` SHALL read an issue description, Markdown or HTML, from `--input-file` or stdin and SHALL print its per-stage state, open questions, and seed for the issue intake.

#### Scenario: An issue's sections are read

- **WHEN** `sections` receives an issue description
- **THEN** it prints the stage state, the open questions, and the seed as JSON with exit 0.

### Requirement: The Ready to Propose block tool and policy are retired

`sai/tools/ready-to-propose.js` and `sai/policies/ready-to-propose-format.md` SHALL NOT exist. `sai/tools/change-document.js` SHALL be the only tool of the crystallized change format and `sai/policies/issue-format.md` its only definition; every consumer that read the block tool, including the backlog slice-set publishers, the Azure DevOps import, and `lint.js`, SHALL require `change-document.js` instead. `sai/install-manifest.json` SHALL declare both retired paths, for Claude Code and opencode, so an installation removes the installed copies. A reference to either retired path outside the manifest's retirement declarations and historical records SHALL NOT remain in the installable surfaces.

#### Scenario: No retired block tool or policy remains

- **WHEN** the repository's tools, policies, skills, and commands are searched for `ready-to-propose.js` and `ready-to-propose-format.md`
- **THEN** neither file exists and the only references are the retirement declarations of `sai/install-manifest.json`.

#### Scenario: The retired paths are declared for both harnesses

- **WHEN** `sai/install-manifest.json` is read
- **THEN** it declares `tools/ready-to-propose.js` and `policies/ready-to-propose-format.md` as retired paths for `claude` and `opencode`.

### Requirement: The change document tool prints the publication form of a document

`sai/tools/change-document.js split --document-file <path> [--document-hash <sha256>]` SHALL print the publication form of one change document: its `# <title>` line as `title` and, from the first non-blank line after it, the rest of the document with only trailing whitespace removed as `description`. With `--document-hash` it SHALL verify the file first. A file that is not exactly one change document SHALL NOT be split. The module SHALL also export `readSet`, which validates a document set and returns its dependency order and, per document, its name, title, description, dependencies, backlog origin, text, and hash, with `ok` false when the set or any document fails its structural checks.

#### Scenario: A document is split for publication

- **WHEN** `split` runs on a verified change document
- **THEN** it prints the title line as `title` and the rest of the document, untouched, as `description`.

#### Scenario: A set is read for publication

- **WHEN** `readSet` receives the documents of a slice set
- **THEN** it returns the blocker-first order and each document's name, title, description, dependencies, and backlog origin.
