# GitHub Projects selection

Selection JSON: `{"provider":"github","owner":"OWNER","owner_kind":"organization","project":12}`.
`owner_kind` is `organization` or `user`. Omit `project` to retrieve actual project
choices for the owner. Ask for owner/kind only if conversation context lacks them.
Supported pile: project-wide manual `POSITION ASC` order, including every item.
Supply `view` or `filters` when the chosen pile has them; they remain pending
because this API adapter cannot verify view-specific membership/order. Never
strip them to choose a different pile. Requires existing `gh` project read access.
Draft issues, pull requests, and inaccessible content are not importable issues;
the adapter reports the first type without skipping it.
