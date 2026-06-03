## MODIFIED Requirements

### Requirement: Audit and review instructions SHALL reference change artifacts by their explicit file paths, not by a generic `spec.md` alias.

The previous instructions treated `proposal.md + design.md + specs/**/*.md` as collectively equivalent to a single `spec.md`. This alias has been removed; each artifact is now named and described individually.

#### Scenario: Agent loads prerequisites for a review or audit
- **WHEN** an agent executes any of `review.md`, `security.md`, `performance.md`, `accessibility.md`, or `pr.md`
- **THEN** the Prerequisites section instructs it to read `proposal.md`, `design.md` (if present), and all files matching `specs/**/*.md` — listed separately, each with its purpose described

#### Scenario: Required artifact is absent
- **WHEN** `proposal.md` is missing from `openspec/changes/{change-name}/`
- **THEN** the agent responds with: "`openspec/changes/{change-name}/proposal.md` not found. Ensure the change name is correct and that `/sai-1-spec` has been run for this change." and stops

#### Scenario: Agent derives feature name for report output
- **WHEN** an agent writes a report artifact (review.md, security.md, performance.md, accessibility.md)
- **THEN** the feature name is derived by converting the change name from kebab-case to title case (e.g. `oauth2-auth` → `OAuth2 Auth`), not from the spec file path

#### Scenario: Agent emits a report header
- **WHEN** a report artifact is written
- **THEN** the report header uses `**Change:** openspec/changes/{change-name}/` instead of `**Spec:** openspec/changes/{change-name}/proposal.md`

#### Scenario: Agent records acknowledged trade-offs
- **WHEN** a finding is downgraded to Acknowledged based on an accepted decision
- **THEN** the spec note cites the specific artifact and section (e.g. `proposal.md §X` or `specs/{capability}/spec.md §X`), not a generic `spec.md §X`
