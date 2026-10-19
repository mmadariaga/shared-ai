# Finding state

How `/sai-deep-review` and `/sai-3-implement` classify a finding in a report.

## Question

A **Question** is a finding that needs an answer from the user. It carries a
`Q*` identifier in `review.md`: the review writes a disagreement with a recorded
decision, scope creep, and a concern it cannot locate in code as Questions. A
Question is a finding waiting for the user's answer, never a finding to send to
another command. `/sai-deep-review` asks for the answer in its findings round and
hands it to `/sai-3-implement`.

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
on open findings only: the `/sai-deep-review` round selects from them and
`/sai-3-implement` applies them, except the findings that carry the excluded
mark (see Excluded mark).

## Fixed mark

The **fixed mark** is the literal ` (FIXED)` appended to the end of the
finding's heading line, for example `#### H1 — Missing null check (FIXED)`.
Only the heading line changes; the body, the identifier, the severity, and the
closing `Summary:` tally stay exactly as the report wrote them, so marking a
finding never changes its report's tally.

The mark carries no commit hash: a commit cannot contain its own hash, and
`git log` or `git blame` on the marked heading line leads to the commit that
fixed it. The mark only states that the finding is fixed.

The `/sai-3-implement` coordinator writes the marks itself, in the commit of the
step that fixed each finding, so a mark and its fix enter history together. Only
the findings a run fixed are marked:
findings the run left out and unanswered Questions stay open. Regenerating a report
replaces its findings together with their marks.

## Excluded mark

The **excluded mark** is the literal ` (EXCLUDED: <reason>)` appended to the end
of the finding's heading line, for example
`#### M2 — Rename helper (EXCLUDED: cosmetic, outside the change's behavior)`.
The `/sai-build` coordinator writes it after its assessment pass, for a fixable
finding it decides not to fix; the `/sai-deep-review` coordinator writes it for
each fixable finding the user left out of the findings round; a user may also
write it by hand. The
reason is concrete and fits on the heading line. Only the heading line changes,
as with the fixed mark: the body, the identifier, the severity, and the closing
`Summary:` tally stay exactly as the report wrote them. A Question never
carries it.

An excluded finding stays open for every consumer except `/sai-3-implement`,
which skips it, standalone or inside `/sai-build` or `/sai-deep-review`. Removing
the mark reopens the finding for `/sai-3-implement`, which then fixes it and writes
the fixed mark. Regenerating a report replaces its excluded marks together with
its fixed marks, so no exclusion carries over to a new report.
