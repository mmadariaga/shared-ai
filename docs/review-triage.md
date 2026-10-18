# Review, audit scope, and findings

Use `/sai-deep-review <change-name>` for review plus the relevant audits, or run the
numbered commands separately. The same options and final fix selection work in
Claude Code and opencode.

## Choosing audit scope

| Option | `/sai-4-review` | Security | Performance | Accessibility | `/sai-deep-review` |
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
/sai-deep-review my-change --parent-branch main
/sai-deep-review my-change --path src --runtime
/sai-7-performance my-change --full --tier db
```

Without `--runtime`, analysis asks no questions between change resolution and
the final close. With it, each diagnostic/browser check still needs your
authorization. Security has no runtime option. An explicit `--fast-track` on
`/sai-deep-review` is a no-op, not permission to run diagnostics or fix findings.

## Which audits run

`/sai-4-review` does not perform deep SAST, profiling, or axe analysis. It detects the touched surface and recommends the specific audit:

- **Security surface** (auth, input parsing, dynamic queries, crypto, HTTP boundary, deps, logging) → `/sai-6-security`
- **Performance surface** (new queries, endpoints, consumers, hot components, deps, loops over unbounded input, caching) → `/sai-7-performance`
- **Accessibility surface** (`.tsx`/`.jsx`/`.astro`/`.html`/`.vue`/`.svelte`/`.css`, plus component-bearing markdown) → `/sai-8-accessibility`

Those recommendations are the three `**Surface touched:**` fields in `review.md`. `/sai-deep-review` always runs review first, then dispatches an audit only when that field is exactly `Yes`. `No` leaves the audit inactive; any other value is illegible, so the audit does not run and the summary carries a warning. When `review.md` is missing or no field is legible, the command reports the gap, shows the changed files, and offers no findings round.

Standalone `/sai-6-security`, `/sai-7-performance`, and `/sai-8-accessibility` are diff-scoped vs the parent branch by default. Pass `--full` or `--path {dir}` to expand scope; performance also accepts `--tier` and `--runtime`, accessibility also accepts `--runtime`. Every review and audit command accepts the parent branch only as `--parent-branch <branch>`, and runs unattended unless `--runtime` is passed. `/sai-4-review` itself takes only a change name and `--parent-branch`: it reviews the diff.

`/sai-deep-review` accepts the union of those options and passes each segment only the options its own command declares (in `sai/commands/{review,security,performance,accessibility}/options.md`). `--full` or `--path` skips the triage and runs all three audits, since they ask to look beyond the diff; an empty-diff review (`No changes detected`) still ends the run with no audits and no fix. An option aimed at an audit that did not run has no effect, and the summary says so. An option no segment accepts stops the command before any dispatch.

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

After the audits, `/sai-deep-review` runs one **findings round**: one question per
report with open findings, in order: review, security, performance,
accessibility. No qualifying report means no question. The round selects from the
reports the run regenerated; reports of audits that did not run stay untouched.
When the change has no `tasks.md` or no spec file, the round does not run: the
command prints which items `/sai-3-implement` is missing and stops after the
review and audits.

For each report, choose:

- **Fix all fixable findings** — select all open non-Question findings.
- **Fix nothing** — select none from that report.
- **Free text** — exclude source-qualified IDs and/or answer Questions. For example:

  ```text
  exclude: review:L2
  review:Q1: Keep the agreed API; remove the extra option.
  ```

A Question needs your answer; it is not automatically sent to another command.
An answered Question is fixed according to your answer. Unanswered Questions stay
open. Invalid IDs prompt one correction for that report; a second invalid answer
ends the round with no fix. Cancellation or selecting nothing starts no fix and
makes no commit.

Selecting any fix starts a `/sai-3-implement` segment for the reports you
selected from. Before it starts, the command marks every unselected fixable
finding ` (EXCLUDED: …)` so the segment leaves it alone. The segment fixes the
selected findings through RED → GREEN, reviews each step, commits each step
locally (never a push), appends ` (FIXED)` to each resolved finding heading in the
same commit, and runs the unit and integration suites against the failure
baseline it recorded before the first step. Finding bodies and the original tally
remain unchanged. `/sai-3-implement` acts only on **open** findings that carry
no excluded mark. Regenerating a report replaces its findings and marks, so the
next review checks the current code afresh.

The run therefore makes one commit for `review.md` (through `/sai-4-review`),
then one commit per fix step; it makes no other commit. A report your project
ignores stays on disk uncommitted. To fix findings later, leave them open and run
`/sai-3-implement`, or run `/sai-build` to implement, review, and fix in one go.
