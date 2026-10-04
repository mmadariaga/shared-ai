# GitLab issue import

Run `node <tool> read <registry>` with JSON `{"reference":"<exact issue URL>"}`
on stdin. The adapter delegates the URL's project to authenticated `glab repo
view`, then reads structured `glab api` issue and paginated note responses.
Use a complete `/-/issues/N` URL; ask for missing reference components.

The result includes canonical provenance, title, description, state, archived
state and all user comments (system activity notes are not comments). Preserve
retrieved content on `incomplete`; report the concrete failure and pending
comments. Authentication, permission and compatibility errors remain blockers
on this same provider and destination. Follow the common import delivery rules.
