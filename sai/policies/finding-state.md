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

## Open and fixed

A finding is **open** when it carries no fixed mark and **fixed** when it
carries one. A report keeps its fixed findings: it records what was found and
what was fixed, so nothing is removed. A Question is open until it is answered
and fixed; an unanswered Question stays open. Every consumer of a report acts
on open findings only: the Direct Build close selects from them, and
`/sai-3-implement` ingests them.

## Fixed mark

The **fixed mark** is the literal ` (FIXED)` appended to the end of the
finding's heading line, for example `#### H1 — Missing null check (FIXED)`.
Only the heading line changes; the body, the identifier, the severity, and the
closing `Summary:` tally stay exactly as the report wrote them, so marking a
finding never changes its report's tally.

The mark carries no commit hash: a commit cannot contain its own hash, and
`git log` or `git blame` on the marked heading line leads to the commit that
fixed it. The mark only states that the finding is fixed.

The Direct Build close writes the marks through the fix worker, in a final
instruction after the coordinator accepts convergence, so the marks enter the
same commit as their fixes. Only the findings the close fixed are marked:
excluded findings and unanswered Questions stay open. Regenerating a report
replaces its findings together with their marks.
