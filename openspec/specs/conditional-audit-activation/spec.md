# conditional-audit-activation Specification

## Purpose

Defines the conditional activation rules for audit segments in the `/sai-review` composition, including the zero-audit terminal and artifact regeneration semantics.

## Requirements

### Requirement: Audit segments activate only when triage resolves to Yes

The activated segment list SHALL include only the review segment (always) plus the audit segments whose triage condition resolved to `Yes`, preserving the declared order (review → security → performance → accessibility) and omitting segments whose condition was not met. If zero audits are recommended after successful review and a valid triage parse, the composition SHALL dispatch no audits and SHALL apply the existing shared findings-driven Direct Build close using only the freshly generated `review.md`. Missing review content or no legible triage section SHALL retain the error close and SHALL NOT authorize a correction choice. An individually illegible section SHALL retain its warning and activate no audit.

#### Scenario: Zero audits recommended ends the suite
- **WHEN** a successful review has at least one legible triage section and all three `**Surface touched:**` triage values resolve to something other than `Yes`
- **THEN** the composition SHALL dispatch no audits and SHALL use the existing shared Direct Build close with `review.md` only; eligible findings receive its correction choice, otherwise the exact literal `Review complete. No audits recommended. Run `/sai-archive {name}` in a new chat when ready.` is preserved

#### Scenario: Missing or wholly illegible review retains the error close
- **WHEN** review completes but `review.md` is absent or none of the three triage sections is legible
- **THEN** the composition SHALL report the gap and abort without an audit dispatch or a findings-driven correction choice

#### Scenario: Individually illegible triage retains its warning
- **WHEN** one or two triage sections are illegible and the legible sections activate no audit
- **THEN** the composition SHALL retain the summary warning for each illegible section and SHALL evaluate correction eligibility only from the freshly generated review findings, with no authorization inferred from illegibility

### Requirement: Artifact regeneration semantics for recommended audits

Activating an audit SHALL always regenerate its artifact, silently overwriting any existing one. A non-recommended audit SHALL never touch its existing artifact. A missing but recommended artifact SHALL be dispatched directly.

#### Scenario: Recommended audit overwrites its artifact
- **WHEN** the security audit activates and `openspec/changes/{change-name}/security.md` already exists
- **THEN** the audit SHALL regenerate the artifact, silently overwriting the existing file

#### Scenario: Non-recommended audit leaves its artifact untouched
- **WHEN** the accessibility triage resolves to not-recommended and `accessibility.md` already exists
- **THEN** the composition SHALL NOT dispatch the accessibility audit and SHALL leave the existing `accessibility.md` unchanged
