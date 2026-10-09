# GitLab selection

Selection JSON: `{"provider":"gitlab","project":"https://gitlab.example/group/project","pile":"issues","filters":{"state":"opened","labels":"ready"}}`.
Omit `pile` to retrieve the actual project issue-list candidate. `filters` is
optional; supported issue-list filters are `state`, `labels`, `milestone`, and
`assignee_id`, with string values. Preserve the chosen list's filters exactly;
unsupported filters remain pending. `board`, `list`, or `view` also remain pending
because their membership/order cannot be verified by this issue-list adapter.
Requires existing `glab` read access. Retrieve all matching project issues and
compare manual `relative_position`, keeping selection pending for missing ranks
or a tie at the top. Select only ordinary `issue` items, never silently skip an
incident or another type. Import host compatibility stays with `from-backlog`.
