# GitHub mechanics

Require `gh` with authenticated access to the selected repository. Supply
`owner/repository` or its complete github.com URL. The adapter uses `gh api` with
explicit repository endpoints; it never lets `gh pr create` push implicitly.
Query open PRs with the exact source repository, source branch and target branch.
Creation writes head, base, title and body; update PATCH writes only title and body.
Failed or malformed reads are blockers, never evidence that no PR exists.
Completion requires read-back of the exact approved content at the selected URL.
