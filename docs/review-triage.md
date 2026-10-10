# Review, audit scope, and findings

Use `/sai-review <change-name>` for review plus the relevant audits, or run the
numbered commands separately. The same options and final fix selection work in
Claude Code and opencode.

## Choosing audit scope

| Option | `/sai-5-review` | Security | Performance | Accessibility | `/sai-review` |
|--------|:--------------:|:--------:|:-----------:|:-------------:|:-------------:|
| `--parent-branch <branch>` | Yes | Yes | Yes | Yes | All segments |
| `--full` | No | Whole repo | Whole repo | All UI files | All audits |
| `--path <dir>` | No | One path | One path | One path | All audits |
| `--tier backend\|frontend\|db\|queue` | No | No | One tier | No | Performance only |
| `--runtime` | No | No | Approved diagnostics | Approved browser checks | Performance and accessibility |

The default scope is the committed branch diff against the parent branch. If
you omit `--parent-branch`, the commands use the repository's default branch
when available, otherwise try `master`, then `main`. Write the branch with the
flag, not as a second positional argument. Omit the change name to use the
change picker; scope options do not remove the need for a change and its proposal.

```text
/sai-review my-change --parent-branch main
/sai-review my-change --path src --runtime
/sai-7-performance my-change --full --tier db
```

Without `--runtime`, analysis asks no questions between change resolution and
the final close. With it, each diagnostic/browser check still needs your
authorization. Security has no runtime option. An explicit `--fast-track` on
`/sai-review` is a no-op, not permission to run diagnostics or fix findings.

## Which audits run

`/sai-5-review` does not perform deep SAST, profiling, or axe analysis. It detects the touched surface and recommends the specific audit:

- **Security surface** (auth, input parsing, dynamic queries, crypto, HTTP boundary, deps, logging) → `/sai-6-security`
- **Performance surface** (new queries, endpoints, consumers, hot components, deps, loops over unbounded input, caching) → `/sai-7-performance`
- **Accessibility surface** (`.tsx`/`.jsx`/`.astro`/`.html`/`.vue`/`.svelte`/`.css`, plus component-bearing markdown) → `/sai-8-accessibility`

Those recommendations are the three `**Surface touched:**` fields in `review.md`. `/sai-review` always runs review first, then dispatches an audit only when that field is exactly `Yes`. `No` leaves the audit inactive; any other value is illegible, so the audit does not run and the summary carries a warning. When `review.md` is missing or no field is legible, the command reports the gap, shows the changed files, and offers no fix round.

Standalone `/sai-6-security`, `/sai-7-performance`, and `/sai-8-accessibility` are diff-scoped vs the parent branch by default. Pass `--full` or `--path {dir}` to expand scope; performance also accepts `--tier` and `--runtime`, accessibility also accepts `--runtime`. Every review and audit command accepts the parent branch only as `--parent-branch <branch>`, and runs unattended unless `--runtime` is passed. `/sai-5-review` itself takes only a change name and `--parent-branch`: it reviews the diff.

`/sai-review` accepts the union of those options and passes each segment only the options its own command declares (in `sai/commands/{review,security,performance,accessibility}/options.md`). `--full` or `--path` skips the triage and runs all three audits, since they ask to look beyond the diff; an empty-diff review still ends the run with no audits. An option aimed at an audit that did not run has no effect, and the summary says so. An option no segment accepts stops the command before any dispatch.

Audits run concurrently after review. A failed or cancelled audit does not stop
the others; the final summary reports each outcome. Active audits regenerate
their reports; inactive audits leave their existing reports untouched.

## Reading reports

Reports live under `openspec/changes/{change-name}/`. General review contains a
provenance line, the three triage fields, severity-grouped findings, Questions,
and a closing tally. Security contains SAST/dependency findings and optional
acknowledged trade-offs. Performance contains audited tiers, baseline, findings,
and optional acknowledged trade-offs. Neither is a remediation-plan document.
Empty sections are omitted in security/performance reports; when no relevant
surface exists, they write `## Not Applicable` with a justification instead of
findings and a tally.

Performance numbers are measured or explicitly marked
`estimated — verify with {method}`. A High/Critical finding may still contain
estimates: severity describes impact, not measurement status. Accessibility
checks WCAG 2.2 AA across the frameworks in scope; screen-reader claims are
prefixed `Inferred:` rather than presented as observed behavior.

## Select fixes at the final close

After `/sai-review` or standalone `/sai-5-review`, the optional **Direct Build
close** offers one question per report with open findings, in order: review,
security, performance, accessibility. No qualifying report means no question.
Standalone review can include existing audit reports and warns that they may be
stale; the composed run selects from the reports it regenerated.

For each report, choose:

- **Fix all fixable findings** — select all open non-Question findings.
- **Fix nothing** — select none from that report.
- **Free text** — exclude source-qualified IDs and/or answer Questions. For example:

  ```text
  exclude: review:L2
  review:Q1: Keep the agreed API; remove the extra option.
  ```

A Question needs your answer; it is not automatically sent to another command.
Unanswered Questions and excluded findings stay open. Invalid IDs prompt one
correction for that report; a second invalid answer ends the close with no commit.
Cancellation or selecting nothing causes no fix or commit.

Selecting any fix authorizes delegated writes and **one local commit**, never
a push. The fix is independently reviewed for up to three rounds. Non-convergence
commits nothing and lists the outstanding findings and modified files left
uncommitted. A dependency on an excluded finding may require revised selection;
it is not permission to fix the excluded work silently.

On convergence, the close appends ` (FIXED)` to resolved finding headings and
commits the fixes, marks, and regenerated reports together. Finding bodies and
the original tally remain unchanged. `/sai-3-implement` and later fix selections
act only on **open** findings. Regenerating a report replaces its findings and
marks, so the next review checks the current code afresh.

**The fix close currently runs no tests before committing.** The mark records
the accepted correction, not test success; run your project checks afterward.
Alternatively, leave findings open and use `/sai-build` to plan and apply fixes
through the ordinary RED → GREEN workflow.
