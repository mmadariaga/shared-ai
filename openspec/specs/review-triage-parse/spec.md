# review-triage-parse Specification

## Purpose

Defines the bounded, deterministic parse of the three surface-triage sections in the regenerated `review.md` that drives conditional audit activation in the `/sai-review` composition.

## Requirements

### Requirement: Bounded triage parse of the regenerated review.md

When neither `--full` nor `--path` was given, `/sai-deep-review` SHALL perform a bounded, deterministic parse after the review segment completes and writes `review.md`. The parse reads exactly three named fields from three named template sections of `openspec/changes/{change-name}/review.md`: the `**Surface touched:**` value under `## Security Surface Triage`, under `## Performance Surface Triage`, and under `## Accessibility Surface Triage`. A value of exactly `Yes` SHALL activate the corresponding audit, and a value of exactly `No` SHALL leave it inactive. Any other value SHALL be illegible: that audit SHALL NOT run, the close SHALL carry a warning line naming it, and the illegible value SHALL give no authority to correct it. With `--full` or `--path`, no triage parse SHALL run and the error close SHALL NOT apply. The triage parse and the error close SHALL be defined in `sai/commands/deep-review/coordinator.md`.

#### Scenario: A Yes triage value activates the audit
- **WHEN** the freshly regenerated `review.md` carries `**Surface touched:** Yes` under `## Security Surface Triage`
- **THEN** the security audit SHALL activate in the fixed order and regenerate `security.md`

#### Scenario: An illegible triage value warns instead of silently disabling the audit
- **WHEN** the `**Surface touched:**` value under `## Performance Surface Triage` is neither exactly `Yes` nor exactly `No`
- **THEN** the performance audit SHALL NOT run and the close SHALL carry a warning line naming that audit

### Requirement: Missing or illegible review.md handling

If `review.md` is missing after a completed review segment, or none of the three triage values is legible (`Yes` or `No`), `/sai-deep-review` SHALL take the error close: it SHALL run no audit, no Assessment pass, and no fix segment, SHALL print the gap (the path of `review.md` and the values that were not legible), and SHALL end the run without a closing line. While at least one value is legible, each illegible value SHALL count as not recommended plus a warning line in the close, and the audits whose values are exactly `Yes` SHALL still run.

#### Scenario: Missing review.md aborts the suite
- **WHEN** the review segment completes but `openspec/changes/{change-name}/review.md` does not exist
- **THEN** the run SHALL start no audit, print the missing-file gap, and end with no Assessment pass, no fix segment, and no closing line

#### Scenario: One illegible section degrades only that audit
- **WHEN** the security value is exactly `Yes` but the accessibility value is neither `Yes` nor `No`
- **THEN** the accessibility audit SHALL count as not recommended with a warning line in the close, and the security audit SHALL still run
