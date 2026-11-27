# ADR 0239: Accept a verified sole-self-assignee no-op keep without an explicit approval

## Status

Accepted.

## Context

`sai/policies/backlog-implementation-start.md` required an explicit assign/keep/replace/Skip choice before an advance approval counted. Explore omitted the round-1 assignment question when every linked issue's only assignee was the authenticated user, so no explicit choice existed; recording `keep` then failed the advance-approval rule.

## Decision

The policy accepts the verified sole-self-assignee no-op keep as an advance approval that needs no explicit choice. `inspect-assignment` observes the authenticated user (`actor`) as the only assignee of a non-parent selected issue; the caller stores the observed assignee set, runs `propose-assignment` with `choice: "keep"` and the keep verification read-only, and calls no `assign`. `sai/policies/question-rounds.md` also resolves a recorded no-op answer for the completion gate, authorizing only its no-op.

## Alternatives Considered

- **Keep asking the assignment question.** Rejected because a no-op question whose answer cannot change anything adds friction without a decision.
- **Record `keep` without a policy change.** Rejected because the advance-approval rule requires an explicit choice.
- **Record `skip` instead.** Rejected because it would drop the responsibility context and misstate the observed state.

## Consequences

- The authorization boundary now includes a verified observed keep.
- A changed assignee set, a parent issue, or a different authenticated user asks again.
- No mutation is performed.
- Every caller of the policy honors it.

## Provenance

Change `explore-question-conditioning`, decision "Amend `sai/policies/backlog-implementation-start.md` to accept the sole-self-assignee no-op keep, because the skip cannot bypass its advance-approval rule."
