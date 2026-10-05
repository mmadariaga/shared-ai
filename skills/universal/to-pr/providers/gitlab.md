# GitLab mechanics

Require `glab` authenticated to the selected host. For self-hosted GitLab, select
`gitlab` explicitly and supply the complete repository URL when host identity is
unclear. Follow the backlog convention: `glab repo view --output json -- <repository>`
resolves the canonical project identity; `glab api --hostname` uses that exact host.
Issue enablement is irrelevant to merge requests. Query open MRs with exact source
and target project ids and branch names. Creation writes source_branch,
target_branch, title and description; update PUT writes only title and description.
Failed or malformed reads are blockers, never evidence that no MR exists.
Completion requires read-back of the exact approved content at the selected URL.
