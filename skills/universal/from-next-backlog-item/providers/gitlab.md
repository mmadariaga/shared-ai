# GitLab selection

Selection JSON: `{"provider":"gitlab","project":"https://gitlab.example/group/project","pile":"issues","filters":{"state":"opened","labels":"ready"}}`.
Omit `pile` to use project issues. Default to `state: opened`; explicit filters
override that default. Supported filters are `state`, `labels`, `milestone`, and
`assignee_id`, with string values. Preserve the chosen list's filters exactly;
unsupported filters remain pending. `board`, `list`, or `view` also remain pending
because their membership/order cannot be verified by this issue-list adapter.
Requires existing `glab` read access. Retrieve all matching project issues.
Non-negative safe-integer `relative_position` values come before unavailable
positions. Return every issue at the smallest valid position as `candidates`;
when no position is valid, return all members. Only ordinary `issue` items are
importable; a different type in the highest-priority group stays pending rather
than being silently skipped. Import host compatibility stays with `from-backlog`.
