# conditional-audit-activation Specification

## Purpose

Defines the conditional activation rules for audit segments in the `/sai-review` composition, including the zero-audit terminal and artifact regeneration semantics.

## Requirements

### Requirement: Audit segments activate only when triage resolves to Yes

The activated segment list SHALL include only the review segment (always) plus the audit segments whose triage value is exactly `Yes`, preserving the declared order (review → security → performance → accessibility) and omitting the other segments. If zero audits are activated after a successful review and a legible triage parse, the composition SHALL dispatch no audits and SHALL apply the Direct Build close using only the freshly generated `review.md`. A missing `review.md` or no legible triage value SHALL take the Error close defined in `sai/commands/meta-review/command-bootstrap.md`, and the Direct Build close SHALL NOT run. An individually illegible value SHALL keep its warning, SHALL activate no audit, and SHALL add no correction authorization.

#### Scenario: Zero audits recommended ends the suite
- **WHEN** a successful review has at least one legible triage value and none of the three `**Surface touched:**` values is exactly `Yes`
- **THEN** the composition SHALL dispatch no audits and SHALL use the Direct Build close with `review.md` only; eligible findings receive its correction choice, otherwise the exact literal `Review complete. No audits recommended. Run `/sai-archive {name}` in a new chat when ready.` is preserved

#### Scenario: Missing or wholly illegible review retains the error close
- **WHEN** review completes but `review.md` is absent or none of the three triage values is legible
- **THEN** the composition SHALL report the gap, show the changed files, and end without an audit dispatch, a correction choice, or a Direct Build round

#### Scenario: Individually illegible triage retains its warning
- **WHEN** one or two triage values are illegible and the legible values activate no audit
- **THEN** the composition SHALL retain the summary warning for each illegible value and SHALL evaluate correction eligibility only from the freshly generated review findings, with no authorization inferred from illegibility

### Requirement: Artifact regeneration semantics for recommended audits

Activating an audit SHALL always regenerate its artifact, silently overwriting any existing one. A non-recommended audit SHALL never touch its existing artifact. A missing but recommended artifact SHALL be dispatched directly.

#### Scenario: Recommended audit overwrites its artifact
- **WHEN** the security audit activates and `openspec/changes/{change-name}/security.md` already exists
- **THEN** the audit SHALL regenerate the artifact, silently overwriting the existing file

#### Scenario: Non-recommended audit leaves its artifact untouched
- **WHEN** the accessibility triage resolves to not-recommended and `accessibility.md` already exists
- **THEN** the composition SHALL NOT dispatch the accessibility audit and SHALL leave the existing `accessibility.md` unchanged
