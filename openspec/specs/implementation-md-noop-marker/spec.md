# implementation-md-noop-marker Specification

## Purpose
TBD - created by change fix-empty-human-check-checkbox. Update Purpose after initial adoption.

## Requirements

### Requirement: A step with no observable human check SHALL encode it as an italic note, never as a checkbox
When `/sai-3-implement` generates a step in `implementation.md` whose output has no observable behavior to verify (a service-side, config, migration, scaffolding, or otherwise non-UI step), the step's Verification Checklist SHALL NOT contain a `**Functional (...)**` checklist header and SHALL NOT contain any Functional `- [ ]` checkbox. Instead the plan SHALL emit a single italic parenthetical note stating why no functional check applies. The agent SHALL NOT invent a placeholder checkbox such as `- [ ] No functional check required`.

This is the **Service-side / non-UI step** archetype. It mirrors the existing "component not yet rendered in the app" italic note that `<plan_template>` already uses — both express the absence of a functional check with an explanation, not with a checkbox.

The distinction is normative: **a checkbox is an action** (something `/sai-4-apply` runs or the terminal functional review verifies and then marks `[x]`); **an italic note is an explanation** (context for the reader, never marked or acted on). "No functional check applies" is an explanation and MUST be encoded as an italic note.

#### Scenario: step has no observable browser behavior
- **WHEN** `/sai-3-implement` generates a step whose output is service-side / non-UI and produces nothing observable
- **THEN** the step's Verification Checklist omits the `**Functional (...)**` header, emits no Functional `- [ ]` checkbox, and carries a single italic parenthetical note explaining why no functional check applies (e.g. `*(No Functional checks — service-side step with no observable browser behavior.)*`)

#### Scenario: invented placeholder checkbox is prohibited
- **WHEN** `/sai-3-implement` would otherwise write a `- [ ] No functional check required` (or any equivalent placeholder) checkbox to stand in for an absent functional check
- **THEN** it SHALL NOT write that checkbox and uses the italic note encoding instead

### Requirement: The noop-marker encoding SHALL NOT alter checkboxes that are genuine actions

The italic-note encoding applies ONLY to the absence of a Human Verification check. It SHALL NOT be applied to checkboxes that represent a genuine action the user or agent must take. In particular, the audit all-Discarded `- [ ] No code changes from this audit` checkbox — an acknowledgment action required by `audit-artifact-ingestion`, living in the audit step body rather than a Human Verification section — SHALL remain a checkbox and SHALL NOT be converted to an italic note. The `*Deferred from Step N (...)*` labeled blocks SHALL likewise keep their `- [ ]` checkboxes, which are verified at the integration step where the behavior first becomes observable.

#### Scenario: audit acknowledgment checkbox is preserved

- **WHEN** an appended audit step is all-Discarded and carries the `- [ ] No code changes from this audit` checkbox
- **THEN** the noop-marker rule does not apply to it
- **AND** the checkbox remains a `- [ ]` action for the user to close

#### Scenario: deferred human checks are preserved

- **WHEN** a step defers its human checks to a later integration step via a `*Deferred from Step N (...)*` labeled block
- **THEN** those deferred `- [ ]` checkboxes remain checkboxes
- **AND** the noop-marker rule does not convert them to italic notes

### Requirement: Plans emit the Functional header while apply reads both headers
`/sai-3-implement` SHALL emit only the `**Functional (...)**` header for a Step's observable-behavior checks and SHALL NOT emit the legacy `**Human (...)**` header. `/sai-4-apply` SHALL read `**Functional (...)**` and `**Human (...)**` as the same functional block, so plans generated before this change require no artifact migration.

#### Scenario: Legacy plan is applied without migration
- **WHEN** `/sai-4-apply` reads a plan whose Step carries the legacy `**Human (...)**` header
- **THEN** it treats that block as the Step's Functional block, identically to a `**Functional (...)**` block, and rewrites no header
