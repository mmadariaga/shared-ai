# GitHub mechanics

Require `gh` with authenticated access to the selected repository. Supply
`owner/repository` or its complete github.com URL. The adapter uses `gh api` with
explicit repository endpoints; it never lets `gh pr create` push implicitly.
Query open PRs with the exact source repository, source branch and target branch.
Creation writes head, base, title and body; update PATCH writes only title and body.
On creation only, the authenticated user (`GET user`) and every page of repository
labels are read; after the `POST pulls`, one `PATCH issues/{number}` sets the assignee
and the chosen existing labels, and is skipped when both are empty. Its failure is a
warning carrying the created PR URL, never `uncertain`; no label is ever created.
Failed or malformed reads of the PR listing are blockers, never evidence that no PR
exists; the user and label reads above are warnings, never blockers.
Completion requires read-back of the exact approved content at the selected URL.
