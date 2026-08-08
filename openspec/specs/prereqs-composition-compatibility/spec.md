# prereqs-composition-compatibility Specification

## Purpose
TBD - created by archiving change split-prereqs-check-and-paths. Update Purpose after archive.

## Requirements

### Requirement: Composing entry point at the original fetch path

The file `sai/policies/prereqs.md` SHALL remain the fetch target of `Fetch @sai/policies/prereqs.md` and SHALL act as a composing entry point that delivers the full content of both `sai/policies/prereqs-check.md` and `sai/policies/prereqs-paths.md` to any fetcher.

#### Scenario: fetch of the composing entry delivers both halves

- **WHEN** `Fetch @sai/policies/prereqs.md` is resolved after the change
- **THEN** the fetcher receives the three prerequisite checks with their stop messages and the full path table with the no-write-on-failure rule

### Requirement: Router-only composition

The composing entry `sai/policies/prereqs.md` SHALL consist solely of fetch directives referencing the two halves. It SHALL NOT restate, copy, or summarize any prerequisite content: each half's content has exactly one home in the policy surface — the check artifact and the path-reference artifact respectively — and the composing entry SHALL NOT add a further copy. The inline references to the three checks in `sai/orchestration/workers/sai-7-performance-worker.md` and `sai/orchestration/workers/sai-8-accessibility-worker.md` are outside this requirement's scope: they predate this change, remain unedited by it, and carry the consistency obligation stated in the proposal.

#### Scenario: composing entry is content-free

- **WHEN** `sai/policies/prereqs.md` is read
- **THEN** its body contains only the two fetch directives and contains none of the check text, stop messages, or path table entries

#### Scenario: inline worker copies untouched

- **WHEN** `sai/orchestration/workers/sai-7-performance-worker.md` and `sai/orchestration/workers/sai-8-accessibility-worker.md` are inspected after the change
- **THEN** their inline references to the three checks are unchanged by this change

### Requirement: Existing fetch sites unedited

No file that fetches `@sai/policies/prereqs.md` SHALL be edited by this change, and every such file SHALL continue to receive both halves through the composing entry.

#### Scenario: fetch sites unchanged

- **WHEN** any file that fetches `@sai/policies/prereqs.md` is inspected after the change
- **THEN** it still contains its `Fetch @sai/policies/prereqs.md` directive and does not fetch either half directly

### Requirement: Behavior parity of delivered content

The effective content delivered to a fetcher of `@sai/policies/prereqs.md` SHALL be behavior-identical to the content of the pre-change single file: the three checks with their exact stop messages, the direct-paths rule, the full path table, and the no-write-on-failure rule.

#### Scenario: delivered content equals pre-change content

- **WHEN** a consumer resolves `Fetch @sai/policies/prereqs.md` after the change
- **THEN** every behavioral element of the pre-change file is present: all three checks halt with the same messages, all listed paths resolve the same way, and the no-write-on-failure rule applies

### Requirement: Recursion dependency of the composing entry

The composing entry delivers both halves by relying on recursive fetch resolution: a resolved file's own `Fetch @` directives SHALL be resolved in turn. Both harness fetch skills — `skills/claude/fetch/SKILL.md` and `skills/opencode/fetch/SKILL.md` — SHALL document this recursion rule, and the composing entry is valid only where that rule is in force. A harness or fetch mechanism that does not resolve nested fetch directives SHALL NOT be considered to satisfy this capability.

#### Scenario: recursion documented in both fetch skills

- **WHEN** `skills/claude/fetch/SKILL.md` and `skills/opencode/fetch/SKILL.md` are read
- **THEN** each documents that fetched files and loaded skills may contain `Fetch @` directives that are resolved recursively under the same rules

#### Scenario: no check content without nested resolution

- **WHEN** a fetcher resolves the composing entry without applying nested fetch resolution
- **THEN** the delivered content contains the router body only — none of the check text, stop messages, or path table entries
