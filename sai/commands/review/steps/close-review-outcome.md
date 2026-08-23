# Review Step — Close Review Outcome

Active step: close-review-outcome. Classify and prioritize findings, produce and verify the review report, then return your terminal result per the worker contract.

### Step 3: Classify and Prioritize Findings

Assign each finding one of:

- **Critical** — Must be fixed before merge. Bugs, security holes, broken builds, contract violations, contradictions of the change artifacts.
- **High** — Should be fixed before merge. Significant maintainability, performance, or test-coverage issues that will hurt soon.
- **Medium** — Moderate maintainability, performance, or test-coverage concern that does not threaten merge-readiness but should be addressed soon.
- **Low** — Nice to fix. Naming, small refactors, low-impact polish.
- **Question** — Genuine uncertainty needing user input. Use sparingly.

Drop findings that are purely stylistic if the codebase has no enforced convention for them.

### Step 4: Produce the Review Report

1. Draft the report using the output template loaded below.
2. Save it to: `openspec/changes/{change-name}/review.md`
     - Derive `{feature-name}` from the change name: convert kebab-case to title case (e.g. `oauth2-auth` → `OAuth2 Auth`).
3. Present a concise summary in chat: counts per severity, the top three Critical findings (when present), and the path to the saved file.
4. **Print an audit recommendations block** in chat immediately after the summary. Always show all three triage lines, using `✅ Not required` or `⚠️ Recommended` accordingly:

     ```
     ## Recommended Audits
     Security     → { ⚠️  Run `/sai-6-security {change-name}` | ✅ Not required }
     Performance  → { ⚠️  Run `/sai-7-performance {change-name}` | ✅ Not required }
     Accessibility→ { ⚠️  Run `/sai-8-accessibility {change-name}` | ✅ Not required }
     ```

5. **Pause for feedback.** Do not modify production code. Fixes are the responsibility of a follow-up implementation pass driven by the user.

## Output Template

Fetch @sai/commands/review/review-report.template.md
