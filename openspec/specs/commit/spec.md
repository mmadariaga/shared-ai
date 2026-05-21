# commit Specification

## Purpose
TBD - created by archiving change extract-commit-rules-shared-instruction. Update Purpose after archive.
## Requirements
### Requirement: Rules sourced from shared instruction
`commit.md` SHALL load commit message format rules from `@sai/instructions/commit-rules.md` via a fetch directive rather than inlining them. The inline rule blocks (subject format, body, footer, hard rules, self-critique checklist) MUST be replaced with a single `Fetch @sai/instructions/commit-rules.md` directive.

#### Scenario: commit.md edited without changing workflow steps
- **WHEN** `commit.md` is updated to replace inlined rules with the fetch directive
- **THEN** Steps 1–6 of the sai-commit workflow (git inspection, diff reading, message generation, authorization gating, commit execution, post-commit report) MUST remain intact and unchanged

#### Scenario: Rules updated in commit-rules.md
- **WHEN** commit message format rules are updated in `commit-rules.md`
- **THEN** `commit.md` automatically inherits the updated rules with no edits required to `commit.md` itself

### Requirement: No duplication of rules
`commit.md` MUST NOT contain any inline copy of rules that exist in `commit-rules.md`. The fetch directive is the single point of truth for format rules within the sai-commit workflow.

#### Scenario: Duplicate rule detected in commit.md
- **WHEN** `commit.md` is audited post-implementation
- **THEN** no commit message format rule (subject length, type format, body wrap, footer convention, hard rule, or self-critique item) appears inline in `commit.md`

