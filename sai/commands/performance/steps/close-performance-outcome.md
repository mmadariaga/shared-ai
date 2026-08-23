# Performance Step — Close Performance Outcome

Active step: close-performance-outcome. Produce and verify the performance report, then return your terminal result per the worker contract.

### Step Final: Produce the Performance Report

1. Draft using the output template loaded below.
2. Save to: `openspec/changes/{change-name}/performance.md` (derive `{feature-name}` from the change name: convert kebab-case to title case).
3. Present in chat: severity counts, top 3 Critical/High findings, path to saved file.
4. **Pause for feedback.** Do not modify code. Fixes are a follow-up implementation pass.

## Output Template

Fetch @sai/commands/performance/performance-report.template.md

## Self-Critique Before Saving

Before writing the report, verify:
1. **Coverage** — every tier in scope was evaluated; clean ones say "No instances detected".
2. **Evidence completeness** — every finding has location + symptom + evidence + remediation + validation method.
3. **Severity sanity** — Critical/High findings have measured impact, not just heuristic concern.
4. **No fabricated metrics** — if a number was not actually measured, mark it as "estimated — verify with X".
5. **Spec respect** — no finding contradicts a decision recorded in the change artifacts without being marked *Acknowledged*.
6. **Validation plan present** — every Critical/High finding has a re-measurement step.
7. **Identifiers and tally** — every finding heading leads with its severity-prefixed identifier, and the closing `Summary:` line counts match the report's findings.
