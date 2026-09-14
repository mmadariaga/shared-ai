# decision-record-citations Specification

## Purpose
TBD - created by archiving change repair-dead-cross-references. Update Purpose after archive.
## Requirements
### Requirement: dead or drifted decision-record citations are commit-pinned

Citations in decision records (ADR/DDR files) whose referenced lines no longer contain the claimed content SHALL be pinned to the newest ancestor commit where those lines matched the claim, preserving historical accuracy per the ADR index contract.

#### Scenario: Citation in file that has been moved or removed

- **WHEN** a decision record cites a line in a file that has since been moved, removed, or renamed (e.g., ADR 0045 cites `commit-rules.md:111`, a file that moved from `sai/instructions/` to `sai/policies/`)
- **THEN** the citation is pinned to the newest ancestor commit where the cited path and line contained the claimed content (e.g. `sai/instructions/commit-rules.md:111` at `d0eb28a7`)

### Requirement: basename-only decision-record citations are rewritten to full repository-relative paths

Citations in decision records that refer to files by basename alone without repository context SHALL be rewritten to the full repository-relative path distinguishing the intended file.

#### Scenario: Basename citation in authorization principle block

- **WHEN** a decision record cites an authorization rule by basename (e.g., DDR 0042 cites `apply.md:220-223` and `commit-rules.md:110-111` without directory prefix)
- **THEN** the citation is rewritten to the full path with commit pin: `sai/instructions/apply.md:220-223` at `35ccccc7` and `sai/instructions/commit-rules.md:110-111` at `35ccccc7`

### Requirement: never-resolved decision-record citations are reworded without pins

Citations in decision records that reference content never committed to the repository SHALL be reworded to describe the referenced material, without a line number or commit pin.

#### Scenario: Uncommitted change artifact reference

- **WHEN** a decision record references a draft or proposed artifact from a change that was never committed (e.g., DDR 0114 references `GLOSSARY.md:91` from a change that remained unpublished)
- **THEN** the citation is reworded as "the change's uncommitted `GLOSSARY.md` draft" to preserve the material being referenced without a false line pin

