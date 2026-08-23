# conditional-audit-activation Specification

## Purpose

Defines the conditional activation rules for audit segments in the `/sai-review` composition, including the zero-audit terminal and artifact regeneration semantics.

## Requirements

### Requirement: Audit segments activate only when triage resolves to Yes

The activated segment list SHALL include only the review segment (always) plus the audit segments whose triage condition resolved to `Yes`, preserving the declared order (review → security → performance → accessibility) and omitting segments whose condition was not met. If zero audits are recommended, the suite SHALL end after the review segment with a terminal message and no audit dispatches.

#### Scenario: Zero audits recommended ends the suite
- **WHEN** all three `**Surface touched:**` triage values resolve to something other than `Yes`
- **THEN** the composition SHALL print exactly `Review complete. No audits recommended. Run `/sai-archive {name}` in a new chat when ready.` and stop without dispatching any audit

### Requirement: Artifact regeneration semantics for recommended audits

Activating an audit SHALL always regenerate its artifact, silently overwriting any existing one. A non-recommended audit SHALL never touch its existing artifact. A missing but recommended artifact SHALL be dispatched directly.

#### Scenario: Recommended audit overwrites its artifact
- **WHEN** the security audit activates and `openspec/changes/{change-name}/security.md` already exists
- **THEN** the audit SHALL regenerate the artifact, silently overwriting the existing file

#### Scenario: Non-recommended audit leaves its artifact untouched
- **WHEN** the accessibility triage resolves to not-recommended and `accessibility.md` already exists
- **THEN** the composition SHALL NOT dispatch the accessibility audit and SHALL leave the existing `accessibility.md` unchanged
