# conditional-audit-activation Specification

## Purpose

Defines the conditional activation rules for audit segments in the `/sai-review` composition, including the zero-audit terminal and artifact regeneration semantics.

## Requirements

### Requirement: Audit segments activate only when triage resolves to Yes

Without `--full` or `--path`, `/sai-deep-review` SHALL run the review segment always and then only the audits whose triage value is exactly `Yes`, in the fixed order security, performance, accessibility. With `--full` or `--path`, a completed review SHALL activate all three audits without the triage parse. When zero audits are activated after a completed review and a legible triage parse, the run SHALL start no audit cycle and SHALL take `review.md` alone into the fixing tail: the Assessment pass and the fix segment run only when it holds a fixable finding. Without `--full` or `--path`, a missing `review.md` or no legible triage value SHALL take the Error close defined in `sai/commands/deep-review/coordinator.md`, and no Assessment pass SHALL run. An individually illegible value SHALL keep its warning, SHALL activate no audit, and SHALL give no authority to correct it.

#### Scenario: Zero audits recommended ends the suite
- **WHEN** a completed review without `--full` or `--path` has at least one legible triage value and none of the three `**Surface touched:**` values is exactly `Yes`
- **THEN** no audit cycle starts, the Assessment pass reads `review.md` only when it holds a fixable finding, and the run ends with `Deep review done.`

#### Scenario: Missing or wholly illegible review retains the error close
- **WHEN** review completes without `--full` or `--path` but `review.md` is absent or none of the three triage values is legible
- **THEN** the run SHALL print the gap and end without an audit, an Assessment pass, a fix segment, or a closing line

#### Scenario: Individually illegible triage retains its warning
- **WHEN** one or two triage values are illegible and the legible values activate no audit
- **THEN** the close SHALL keep a warning line for each illegible value and the fixing tail SHALL read only the freshly generated `review.md`, with no authority inferred from illegibility

#### Scenario: Full or path scope activates every audit
- **WHEN** the review completes and `--full` or `--path` was given
- **THEN** the security, performance, and accessibility audits all activate without the triage parse

### Requirement: Artifact regeneration semantics for recommended audits

Activating an audit SHALL always regenerate its artifact, silently overwriting any existing one. A non-recommended audit SHALL never touch its existing artifact. A missing but recommended artifact SHALL be dispatched directly.

#### Scenario: Recommended audit overwrites its artifact
- **WHEN** the security audit activates and `openspec/changes/{change-name}/security.md` already exists
- **THEN** the audit SHALL regenerate the artifact, silently overwriting the existing file

#### Scenario: Non-recommended audit leaves its artifact untouched
- **WHEN** the accessibility triage resolves to not-recommended and `accessibility.md` already exists
- **THEN** the composition SHALL NOT dispatch the accessibility audit and SHALL leave the existing `accessibility.md` unchanged
