# Finding state

How the Direct Build close of `/sai-review` and `/sai-5-review` classifies a
finding in a report.

## Question

A **Question** is a finding that needs an answer from the user. It carries a
`Q*` identifier in `review.md`: the review writes a disagreement with a recorded
decision, scope creep, and a concern it cannot locate in code as Questions. A
Question is a finding waiting for the user's answer, never a finding to send to
another command.

## Fixable

A finding is **fixable** when it is not a Question. No report field and no
worker judgment is needed:

- `review.md` already writes decision conflicts and scope creep as Questions.
- `security.md`, `performance.md`, and `accessibility.md` write decision
  conflicts as *Acknowledged*, never as findings, and audit only the diff.

A fixable finding is therefore never held back for a requirement or design
change, and none is routed to `/sai-1-spec`, `/sai-2-design`, or
`/sai-explore`.
