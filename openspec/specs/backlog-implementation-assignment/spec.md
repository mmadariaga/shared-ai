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

### Requirement: Implementation start applies a set-level assignment answer to later slices

`sai/policies/backlog-implementation-start.md` SHALL accept a set-level assignment answer that a caller collected for a whole crystallized set of slices in an earlier question round and kept in conversation state until a new crystallization replaces the set. The answer SHALL be valid under the advance approval rules, except that it SHALL cover the selected issue of every slice in the set and SHALL NOT be consumed by the first slice. Every later slice of the same set SHALL reuse it and SHALL ask no assignment question for it, whether the slice starts automatically after a Direct Build continuation `yes` or through a later route picker answer; the continuation `yes` itself SHALL authorize no assignment. For each later slice, implementation start SHALL resolve the slice's selected issue, run `inspect-assignment`, and apply the answer: `skip` SHALL start with no remote operation; `assign` and an intent answer SHALL proceed with `propose-assignment`, `assign`, and verification when the issue has no assignees, or the keep verification when it has only the approved user; when the issue already has other assignees, implementation start SHALL stop before that slice's implementation, ask keep, replace, or skip, and then continue with the chosen action and the chain; `keep` and `replace` SHALL apply only when the current assignees equal the approved context and SHALL otherwise ask the same keep, replace, or skip question. A changed identity, a changed authenticated user, or a failed assignment SHALL follow the existing Retry, Skip, and Stop steps: Retry and Skip SHALL continue the chain from that slice and Stop SHALL end it. The answer to such a question SHALL apply to that slice only and SHALL NOT replace the set-level answer. An intent answer SHALL authorize assigning the authenticated user of the provider to the issue created from the published proposal: at the first implementation start, `inspect-assignment` on the created issue SHALL resolve that user and bind the answer to it with no new question. An intent answer whose publication was cancelled or failed SHALL lapse, and that slice SHALL ask the assignment question as without an advance answer.

#### Scenario: Later slice reuses the set-level answer

- **WHEN** a later slice of the same set starts with a set-level `assign` answer and its issue has no assignees
- **THEN** implementation start assigns the approved user and verifies it without asking an assignment question

#### Scenario: Set-level skip

- **WHEN** the set-level assignment answer is `skip`
- **THEN** every slice of the set starts with no remote assignment operation

#### Scenario: Later issue has other assignees

- **WHEN** the set-level answer is `assign` and a later slice's issue already has other assignees
- **THEN** implementation start stops before that slice's implementation, asks keep, replace, or skip, and then the chain continues

#### Scenario: Failed assignment in the chain

- **WHEN** an assignment for a later slice fails
- **THEN** implementation start asks Retry, Skip, or Stop, and Retry or Skip continues the chain while Stop ends it

#### Scenario: Slice started through the route picker

- **WHEN** a later slice of the same set starts through a Plan or Manual route picker answer
- **THEN** implementation start reuses the set-level assignment answer without asking

#### Scenario: Intent answer binds at the first start

- **WHEN** the set-level answer is an intent answer and the first slice starts after the issue was created
- **THEN** `inspect-assignment` on the created issue resolves the authenticated user and binds the answer to it with no new question
