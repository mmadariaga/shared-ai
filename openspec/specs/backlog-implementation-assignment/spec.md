# backlog-implementation-assignment Specification

## Purpose
TBD - created by archiving change group-post-crystallization-question-rounds. Update Purpose after archive.

## Requirements

### Requirement: Implementation start verifies an advance assignment approval

`sai/policies/backlog-implementation-start.md` SHALL accept an assignment answer collected before implementation starts when it names a concrete user, binds either an existing selected issue or the publication proposal whose issue the caller then created, and records an explicit choice of assign, keep (naming the current assignees), replace (naming the previous assignees), or Skip. An advance approval SHALL name every issue it covers, authorize only those assignments, and be consumed per issue, each implementation stretch using only the approval for its own selected issue. With a valid advance approval, implementation start SHALL run only the checks, with no new question: resolve the selected issue and run `inspect-assignment`; require the verified issue (the created child replacing the proposal), the authenticated user, and the current assignees (none for assign, the approved set for keep and replace) to equal the approved context; then run `propose-assignment` and `assign` with the returned `confirmation` for assign, `propose-assignment` with `choice: "replace"` and `assign` for replace, or the keep verification for keep, followed by verification. An approved Skip SHALL start with no remote operation. On any conflict, a lapsed approval whose proposal was never published, or a changed identity or responsibility, it SHALL ask again for that authorization only and wait. Without a valid advance approval, it SHALL ask as before. Its callers SHALL keep invoking it at the same point.

#### Scenario: Matching advance approval

- **WHEN** implementation starts with an advance `assign` approval for the selected issue and the issue has no assignees
- **THEN** implementation start assigns the approved user through `propose-assignment` and `assign`, verifies it, and asks no question

#### Scenario: Assignees changed after approval

- **WHEN** the current assignees differ from the context recorded in the advance approval
- **THEN** implementation start asks again for that assignment authorization only and waits

#### Scenario: Approval bound to an unpublished proposal

- **WHEN** the advance approval is bound to a publication proposal that was never published
- **THEN** the approval lapses and implementation start asks the assignment question
