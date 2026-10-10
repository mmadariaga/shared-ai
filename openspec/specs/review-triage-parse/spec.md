# review-triage-parse Specification

## Purpose

Defines the bounded, deterministic parse of the three surface-triage sections in the regenerated `review.md` that drives conditional audit activation in the `/sai-review` composition.

## Requirements

### Requirement: Bounded triage parse of the regenerated review.md

After the review segment completes successfully and writes `review.md`, the composition SHALL perform a bounded, deterministic parse of exactly three named fields from three named template sections of `openspec/changes/{change-name}/review.md`: the `**Surface touched:**` value under `## Security Surface Triage`, under `## Performance Surface Triage`, and under `## Accessibility Surface Triage`. A value of exactly `Yes` SHALL activate the corresponding audit segment, and a value of exactly `No` SHALL leave it inactive. Any other value SHALL be illegible: that audit SHALL NOT run, the summary SHALL carry a warning line naming it, and the illegible value SHALL add no correction authorization. The triage parse and the error close SHALL be defined only in `sai/commands/meta-review/command-bootstrap.md`.

#### Scenario: A Yes triage value activates the audit
- **WHEN** the freshly regenerated `review.md` carries `**Surface touched:** Yes` under `## Security Surface Triage`
- **THEN** the security phase adapter SHALL activate at position 1 and regenerate `security.md`

#### Scenario: An illegible triage value warns instead of silently disabling the audit
- **WHEN** the `**Surface touched:**` value under `## Performance Surface Triage` is neither exactly `Yes` nor exactly `No`
- **THEN** the performance audit SHALL NOT run and the summary SHALL carry a warning line naming that audit

### Requirement: Missing or illegible review.md handling

If `review.md` is missing after a completed review segment, or none of the three triage values is legible (`Yes` or `No`), the composition SHALL take the error close. It SHALL dispatch no audit, SHALL offer no correction choice, SHALL report the gap, SHALL show the changed files, and SHALL end with no Direct Build round. While at least one value is legible, each illegible value SHALL count as not recommended plus a summary warning line, and the audits whose values are exactly `Yes` SHALL still run.

#### Scenario: Missing review.md aborts the suite
- **WHEN** the review segment completes but `openspec/changes/{change-name}/review.md` does not exist
- **THEN** the composition SHALL dispatch no audit, report the missing-file gap, show the changed files, and end with no Direct Build round

#### Scenario: One illegible section degrades only that audit
- **WHEN** the security value is exactly `Yes` but the accessibility value is neither `Yes` nor `No`
- **THEN** the accessibility audit SHALL count as not recommended with a summary warning line, and the security audit SHALL still run
