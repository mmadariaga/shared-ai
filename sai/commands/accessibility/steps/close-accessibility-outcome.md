# Accessibility Step — Close Accessibility Outcome

Active step: close-accessibility-outcome. Produce and verify the accessibility report, then return your terminal result per the worker contract.

### Step Final: Produce the Accessibility Report

1. Draft using the output template loaded below.
2. Save to: `openspec/changes/{change-name}/accessibility.md` (derive `{feature-name}` from the change name: convert kebab-case to title case).
3. Present in chat: severity counts, top 3 Critical/High findings, path to saved file.
4. **Pause for feedback.** Do not modify code. Fixes are a follow-up implementation pass.

## Output Template

Fetch @sai/commands/accessibility/accessibility-report.template.md

## Self-Critique Before Saving

Before writing the report, verify:
1. **Coverage** — every static phase was evaluated; clean ones say "No instances detected".
2. **WCAG mapping** — every finding has a specific SC code + level. No "general best practice" without anchor.
3. **Severity sanity** — Critical reserved for Level A failures or task-blocking issues; not for AAA aspirations.
4. **Spec respect** — no finding contradicts a decision recorded in the change artifacts without being marked *Acknowledged*.
5. **Re-test checklist present** — reflects the actual flows touched in the diff.
6. **Framework idiom respected** — React fixes use hooks/refs; Astro fixes account for hydration; Tailwind fixes use utilities or theme tokens.
7. **Identifiers and tally** — every finding heading leads with its severity-prefixed identifier, and the closing `Summary:` line counts match the report's findings.
