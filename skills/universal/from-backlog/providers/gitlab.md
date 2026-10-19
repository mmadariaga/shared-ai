# GitLab issue import

Run `node <tool> read <registry>` with JSON `{"reference":"<exact issue URL>"}`
on stdin. The adapter delegates the URL's project to authenticated `glab repo
view`, then reads structured `glab api` issue and paginated note responses.
Use the adapter result as the authority for reference compatibility and issue
identity and type. Ask only for reference components it identifies as missing.

The result includes canonical provenance, title, description, state, archived
state and all user comments (system activity notes are not comments). Preserve
retrieved content on `incomplete`; report the concrete failure and pending
comments. Authentication, permission and compatibility errors remain blockers
on this same provider and destination. Follow the common import delivery rules.

Read native blocker links even when correspondence uses written references;
deliver the reconciled dependencies without replacing the selected origin.
Only established issue-link capability unavailability permits the approved
written representation without native discovery. When the result carries
`native_dependency_status: unavailable`, show its `native_dependency_notice`
beside the source and explain that dependencies come from written correspondence.
Permission errors, missing items, malformed pages and failed reads leave import
pending; a written marker alone never excuses an unread native frontier.
