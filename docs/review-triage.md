# Review, audit scope, and findings

Use `/sai-deep-review <change-name>` for review plus the relevant audits and the
fixes it judges justified, or run the numbered commands separately. The same
options and the same unattended run work in Claude Code and opencode.

## Choosing audit scope

| Option | `/sai-4-review` | Security | Performance | Accessibility | `/sai-deep-review` |
|--------|:--------------:|:--------:|:-----------:|:-------------:|:-------------:|
| `--parent-branch <branch>` | Yes | Yes | Yes | Yes | All segments |
| `--full` | No | Whole repo | Whole repo | All UI files | All audits |
| `--path <dir>` | No | One path | One path | One path | All audits |
| `--tier backend\|frontend\|db\|queue` | No | No | One tier | No | Performance only |
| `--runtime` | No | No | Runs diagnostics | Runs browser checks | Performance and accessibility |
| `--url <url>` | No | No | No | Dev-server URL | Accessibility |

The default scope is the committed branch diff against the parent branch. If
you omit `--parent-branch`, the commands use the repository's default branch
when available, otherwise try `master`, then `main`. Write the branch with the
flag, not as a second positional argument. Omit the change name to use the
change picker; scope options do not remove the need for a change and its proposal.

```text
/sai-deep-review my-change --parent-branch main
/sai-deep-review my-change --path src --runtime
/sai-6-performance my-change --full --tier db
```

The standalone audits ask no questions between change resolution and their close.
`--runtime` is the whole authorization for diagnostics and browser checks: a tool
that is not installed, or a URL that does not respond, is marked unavailable in the
report and the static audit goes on. The dev-server URL is an input, so with
`--runtime` and no `--url` the accessibility audit asks for it before it starts;
`/sai-deep-review` asks for it once, before the audits start, so no question pauses
the parallel audits.
Each audit commits its own report locally (when the project does not ignore it) and
never fixes a finding. Security has no runtime option. An explicit `--fast-track` on
the audits and on `/sai-deep-review` is accepted and ignored.

## Which audits run

`/sai-4-review` does not perform deep SAST, profiling, or axe analysis. It detects the touched surface and recommends the specific audit:

- **Security surface** (auth, input parsing, dynamic queries, crypto, HTTP boundary, deps, logging) → `/sai-5-security`
- **Performance surface** (new queries, endpoints, consumers, hot components, deps, loops over unbounded input, caching) → `/sai-6-performance`
- **Accessibility surface** (`.tsx`/`.jsx`/`.astro`/`.html`/`.vue`/`.svelte`/`.css`, plus component-bearing markdown) → `/sai-7-accessibility`

Those recommendations are the three `**Surface touched:**` fields in `review.md`. `/sai-deep-review` always runs review first, then dispatches an audit only when that field is exactly `Yes`. `No` leaves the audit inactive; any other value is illegible, so the audit does not run and the summary carries a warning. When `review.md` is missing or no field is legible, the command reports the gap and ends with no assessment and no fix.

Standalone `/sai-5-security`, `/sai-6-performance`, and `/sai-7-accessibility` are diff-scoped vs the parent branch by default. Pass `--full` or `--path {dir}` to expand scope; performance also accepts `--tier` and `--runtime`, accessibility also accepts `--runtime` and `--url`. Every review and audit command accepts the parent branch only as `--parent-branch <branch>`, and runs unattended. `/sai-4-review` itself takes only a change name and `--parent-branch`: it reviews the diff.

`/sai-deep-review` accepts the union of those options and passes each segment only the options its own command declares (in `sai/commands/{review,security,performance,accessibility}/options.md`). `--full` or `--path` skips the triage and runs all three audits, since they ask to look beyond the diff; an empty-diff review (`No changes detected`) still ends the run with no audits and no fix. An option aimed at an audit that did not run has no effect, and the summary says so. An option no segment accepts stops the command before any dispatch.

Audits run concurrently after review. A failed audit, or one that runs out of
attempts, does not stop the others; the final summary reports each outcome, and
the findings of a failed audit are neither judged nor fixed. Active audits regenerate
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

## Findings the run fixes

After the audits, `/sai-deep-review` runs an **Assessment pass** and no human
selection round. It judges each fixable finding of `review.md` and of the reports of
the audits that finished in this run, and either leaves it to fix or appends
` (EXCLUDED: <reason>)` to its heading. The reason is concrete and one line. Impact,
the cost of the correction, and its risk are things the pass may weigh; no severity
cutoff applies, so a High finding may be excluded and a Low one fixed. Questions
stay open for you and never carry the mark. Each report that received a mark is
committed alone. Reports of audits that did not run, or failed, stay untouched.

When the change has no `proposal.md`, `tasks.md`, or spec file, the pass does not
run: the command prints which items `/sai-3-implement` is missing and stops after the
review and audits. When every fixable finding is excluded, no fix runs.

Otherwise a `/sai-3-implement` segment fixes the findings left to fix through
RED → GREEN, reviews each step, commits each step locally (never a push), appends
` (FIXED)` to each resolved finding heading in the same commit, and runs the unit
and integration suites against the failure baseline it recorded before the first
step. Finding bodies and the original tally remain unchanged. `/sai-3-implement`
acts only on **open** findings that carry no excluded mark. Regenerating a report
replaces its findings and marks, so the next review checks the current code afresh.

To apply a finding the pass excluded, remove its ` (EXCLUDED: …)` mark from the
report and run `/sai-3-implement <change-name>`. A Question needs your answer; it is
not sent to another command, and the fix segment applies only fixable findings.

The run commits `review.md` (through `/sai-4-review`), each verified audit report, each
report the Assessment pass marked, then one commit per fix step; it makes no other
commit. A report your project ignores stays on disk uncommitted. A rerun of an
interrupted run regenerates `review.md` and the activated audit reports and judges
every finding again; only the fix segment resumes. To fix findings later, leave them
open and run `/sai-3-implement`, or run `/sai-build` to implement, review, and fix
in one go.
