# Security Step — Close Security Outcome

Active step: close-security-outcome. Produce and verify the security report, then return your terminal result per the worker contract.

### Step Final: Produce the Security Report

1. Draft using the output template loaded below.
2. Save to: `openspec/changes/{change-name}/security.md` (derive `{feature-name}` from the change name: convert kebab-case to title case).
3. Present in chat: severity counts, top 3 Critical/High findings (if any), path to saved file.
4. **Pause for feedback.** Do not modify code. Fixes are a follow-up implementation pass.

## Output Template

Fetch @sai/commands/security/security-report.template.md

## Self-Critique Before Saving

Before writing the report, verify:
1. **Taint coverage** — every external input source identified in Phase 1 was traced to at least one sink (or silently ignored as clean).
2. **Evidence completeness** — every SAST finding has `file:line` + trace; every SCA finding has CVE + version range.
3. **No speculative findings** — every exploit scenario describes the current code, not a hypothetical future change.
4. **Spec respect** — no finding contradicts a decision recorded in the change artifacts without being marked *Acknowledged*.
5. **Conciseness** — sections without content were omitted entirely.
6. **Severity floor** — no findings below Low severity were included in the report. Informational-level observations are omitted.
7. **Identifiers and tally** — every finding heading leads with its severity-prefixed identifier, and the closing `Summary:` line counts match the report's findings.
