## MODIFIED Requirements

### Requirement: Session-grant scope has a single source

The exclusion list for session-scoped commit authorization SHALL live exactly once, in the `## Authorization Scope` section of `sai/policies/commit-rules.md`: the grant covers exactly `git add` + `git commit` at the granted gates of the consuming command for the remainder of the in-conversation session, is in-memory only, never authorizes push, force, branch create/switch, rebase, merge, tag, or pull-request actions, and never widens a consuming command beyond what its own contract stages. `sai/commands/apply/coordinator.md` SHALL cite that section instead of duplicating the exclusion sentence.

#### Scenario: Exclusions are edited in one place

- **WHEN** the session-grant exclusion list is updated in `commit-rules.md`
- **THEN** both apply's coordinator-card contract and the commit cards inherit the updated boundary without further edits
