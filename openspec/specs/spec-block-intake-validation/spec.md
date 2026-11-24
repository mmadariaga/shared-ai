# spec-block-intake-validation Specification

## Purpose
Validate Ready to Propose blocks pasted into `/sai-1-spec` creation with the dispatchable contract before any change resolution or write, covering the Manual route.

## Requirements

### Requirement: Block attempts are validated before resolution or any write

In creation mode the input of `/sai-1-spec`, and of `/sai-plan` through its spec segment, SHALL be exactly one change document: a `--document-file <path>` with a `--document-hash <sha256>` referencing a stored document, or a pasted text whose first line is `# <title>` and that holds a `## Change` section. Before any worker dispatch, change resolution, or write, the spec coordinator SHALL verify a referenced document with `change-document.js verify-file --document-file <path> --document-hash <hash>`, ending the run on a missing, unreadable, or mismatched file, and SHALL then validate the document with `change-document.js check --document-file <path>`, a pasted document first being written verbatim to `document.md` in the run directory. A structural violation (`"ok": false`) SHALL end the run, write nothing, and show every violation with its line number, problem, and detail. A degraded paste SHALL fail validation. Existing implementation-note rules of the dispatchable contract SHALL remain in force. A `Ready to Propose` block, or a `--block-file` or `--block-hash` line, SHALL be reported as a retired format that must be crystallized again as a change document, ending the run with nothing written. The change name SHALL be the `Change name:` line of the document's `## Change` section.

#### Scenario: Degraded paste is rejected

- **WHEN** a change document whose heading markers were lost in a rendered copy is pasted into `/sai-1-spec`
- **THEN** the coordinator writes nothing and shows the violations with line numbers

#### Scenario: Block without an implementation item is rejected

- **WHEN** a pasted change document breaks the implementation-note rules of the dispatchable contract
- **THEN** validation fails before change resolution and nothing is written

#### Scenario: A retired block ends the run

- **WHEN** `/sai-1-spec` or `/sai-plan` receives a `Ready to Propose` block or a `--block-file` and `--block-hash` pair
- **THEN** it reports that the block format is retired and that the change must be crystallized again as a change document, and writes nothing

### Requirement: Flagged lines are judged before creation proceeds

When validation lists pending flagged lines (`judgment.pending`), the spec coordinator SHALL judge exactly those lines per `sai/policies/block-hygiene-judgment.md`, save the verdicts as a JSON array in the run directory, and rerun `change-document.js check --document-file <path> --verdicts-file <path>`. A confirmed violation SHALL prevent resolution and writes and report its clause, line, and evidence. Creation SHALL proceed only when the document is dispatchable, then take the change name from the document's `Change name:` line. A pasted document SHALL remain validated on its own merits without hash comparison; a referenced document SHALL first pass `verify-file`.

#### Scenario: Hand-edited dispatchable block proceeds

- **WHEN** a hand-edited change document passes the check and every flagged line receives a `context` verdict
- **THEN** the coordinator resolves the change name from the document's `Change name:` line and proceeds as creation

### Requirement: Refinement mode is unchanged

A request carrying an existing change name plus feedback and no block SHALL follow refinement mode without dispatchable validation.

#### Scenario: Refinement skips block validation

- **WHEN** `/sai-1-spec` receives an existing change name with feedback
- **THEN** no dispatchable check runs and refinement proceeds as before
