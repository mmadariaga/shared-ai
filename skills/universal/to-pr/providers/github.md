# GitHub mechanics

Require `gh` with authenticated access to the selected repository. Supply
`owner/repository` or its complete github.com URL. The adapter uses `gh api` with
explicit repository endpoints; it never lets `gh pr create` push implicitly.
Query open PRs with the exact source repository, source branch and target branch.
Creation uses REST and writes head, base, title and body, plus `draft:true` only when
explicitly requested. Update PATCH writes title and body. Explicit conversion of a
ready PR uses GraphQL `convertPullRequestToDraft` with the verified PR node ID.
Reuse an existing draft without conversion. Read-back must confirm `draft:true`;
unverified draft state is uncertain, never permission to create a duplicate.
For assignment on creation only, the authenticated user (`GET user`) and every page of repository
labels are read; after the `POST pulls`, one `PATCH issues/{number}` sets the assignee
and the chosen existing labels, and is skipped when both are empty. Its failure is a
warning carrying the created PR URL, never `uncertain`; no label is ever created.
Failed or malformed reads of the PR listing are blockers, never evidence that no PR
exists; the user and label reads above are warnings, never blockers.
Completion requires read-back of the exact approved content at the selected URL.

For the shared risk-comment option, read `GET user` even on update to establish
comment authorship, and read every page of `issues/{number}/comments`. Create with
`POST issues/{number}/comments` or update the uniquely marked author's comment
with `PATCH issues/comments/{id}`. These are separate approved operations, not
extra PR fields. An unavailable author or ambiguous comment blocks comment work;
the assignment-read warning rule does not authorize an unidentified comment edit.
Verify the complete comment body on read-back; recovery stays read-only.
