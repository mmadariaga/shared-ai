# review-triage-parse Specification

## Purpose

Defines the bounded, deterministic parse of the three surface-triage sections in the regenerated `review.md` that drives conditional audit activation in the `/sai-review` composition.

## Requirements

### Requirement: Bounded triage parse of the regenerated review.md

After the review segment completes successfully and writes `review.md`, the composition SHALL perform a bounded, deterministic parse of exactly three named fields from three named template sections of `openspec/changes/{change-name}/review.md`: the `**Surface touched:**` value under `## Security Surface Triage`, under `## Performance Surface Triage`, and under `## Accessibility Surface Triage`. A value of `Yes` SHALL activate the corresponding audit segment; any other value SHALL NOT activate it.

#### Scenario: A Yes triage value activates the audit
- **WHEN** the freshly regenerated `review.md` carries `**Surface touched:** Yes` under `## Security Surface Triage`
- **THEN** the security phase adapter SHALL activate at position 1 and regenerate `security.md`

### Requirement: Missing or illegible review.md handling

If `review.md` is missing after a completed review segment, or all three triage sections are illegible, the composition SHALL abort without dispatching any audit and SHALL report the gap. While the file exists, an individually illegible section SHALL count as not recommended plus a summary warning line, and the suite SHALL continue with the other audits whose sections were legible.

#### Scenario: Missing review.md aborts the suite
- **WHEN** the review segment completes but `openspec/changes/{change-name}/review.md` does not exist
- **THEN** the composition SHALL abort without dispatching any audit and SHALL report the missing-file gap

#### Scenario: One illegible section degrades only that audit
- **WHEN** the security section is legible but the accessibility section cannot be parsed
- **THEN** the accessibility audit SHALL count as not recommended with a summary warning line, and the security audit SHALL still run
