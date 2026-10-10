# `/sai-7-performance`

## Command function

Detects performance problems introduced by the changes. It looks for operations that could slow the system down, consume too many resources, or grow without control.

## Flags and behavior modifiers

- `--full`: audits the whole repository instead of only the diff.
- `--path <dir>`: audits one path.
- `--tier backend|frontend|db|queue`: audits a single tier. By default every detected tier is audited.
- `--runtime`: runs read-only diagnostics that firm up the numbers in the findings, each after you authorize it. It is the only option that makes the command ask a question mid-run.
- `--parent-branch <branch>`: the branch the change is compared against. It is the only way to name it; a bare second word is rejected.

It receives the change name. Without `--runtime` it asks nothing between choosing the change and finishing and takes no new runtime measurements; unmeasured numbers are explicitly marked as estimates.

## In detail

The command checks whether the change could make an operation take longer, use more memory, do more work than necessary, or behave worse as the amount of data or number of users grows.

It may identify slow queries, heavy rendering, loops without a clear limit, repeated work, and similar situations. It does not call something a problem merely because it could be improved: it looks for a cause and evidence that explain the impact.

The result states which part of the change could be expensive, in which scenario it would be noticeable, and what should be measured or reviewed. It is an analysis report; it does not modify code or apply optimizations automatically.

`performance.md` contains scope, audited tiers, baseline and date, findings,
optional acknowledged trade-offs, and a tally. Every number is measured or
marked `estimated — verify with {method}`; even High/Critical findings can use
explicit estimates. Runtime diagnostics replace estimates with measurements
where possible. A scope with no performance surface after the tier filter
produces `Not Applicable` with a justification. See
[review scope and fix selection](../review-triage.md) for combined runs.
