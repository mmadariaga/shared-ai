# `/sai-6-performance`

## Command function

Detects performance problems introduced by the changes. It looks for operations that could slow the system down, consume too many resources, or grow without control.

## Flags and behavior modifiers

- `--full`: audits the whole repository instead of only the diff.
- `--path <dir>`: audits one path.
- `--tier backend|frontend|db|queue`: audits a single tier. By default every detected tier is audited.
- `--runtime`: runs read-only diagnostics that firm up the numbers in the findings. The flag is the whole authorization: no question is asked. A diagnostic whose tool or target is not available is marked unavailable in the report, and the static analysis goes on.
- `--parent-branch <branch>`: the branch the change is compared against. It is the only way to name it; a bare second word is rejected.
- `--fast-track`: accepted and ignored. The command already runs with no human in the loop.

Without a change name, the command takes the only active change that has a `proposal.md`; with none or several it prints the candidates and stops. It asks nothing between resolving the change and finishing. Without `--runtime` it takes no new runtime measurements; unmeasured numbers are explicitly marked as estimates.

## In detail

The command checks whether the change could make an operation take longer, use more memory, do more work than necessary, or behave worse as the amount of data or number of users grows.

It may identify slow queries, heavy rendering, loops without a clear limit, repeated work, and similar situations. It does not call something a problem merely because it could be improved: it looks for a cause and evidence that explain the impact.

The result states which part of the change could be expensive, in which scenario it would be noticeable, and what should be measured or reviewed. It is an analysis report; it does not modify code or apply optimizations automatically.

`performance.md` contains scope, audited tiers, baseline and date, findings,
optional acknowledged trade-offs, and a tally. Every number is measured or
marked `estimated — verify with {method}`; even High/Critical findings can use
explicit estimates. Runtime diagnostics replace estimates with measurements
where possible. A scope with no performance surface after the tier filter, or an
empty diff, produces `Not Applicable` with a justification. See
[review scope and fix selection](../review-triage.md) for combined runs.

The command checks the finished report itself: the template structure, the
`Critical`/`High`/`Medium`/`Low`/`Informational` subset and its `Summary:` tally,
a tally that matches the findings, and that every cited path exists. When the
worker cannot produce a valid report, the command tries up to 3 different
approaches and then asks you how to continue, with an option to stop.

`performance.md` is staged alone and committed in one local commit only when the
project's ignore rules do not ignore it. An ignored report stays on disk, and
nothing is force-added or pushed. A new run regenerates the report from scratch;
an interrupted run is not resumed. The command ends with `Performance audit done.`.

[`/sai-deep-review`](sai-deep-review.md) runs this audit as one cycle of the same coordinator, in parallel with the other activated audits. Inside that run, the audit asks you only what nothing else can answer: a worker question is answered from the repository and listed as an assumption, and is put to you through the picker only when nothing answers it and the answer would change the report (the other audits keep running meanwhile), and an audit that fails or runs out of attempts is reported as failed while the others finish.
