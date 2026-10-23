# Spec Step — Validation

Active step: validation. Verify the artifacts and compose the decision summary,
then report the `validation` step.

1. Run verification (`steps/common.md` § Verification) and correct every
   failure.
2. Run the cited-path gate.
3. Compose the decision summary and the warnings (§ Completion).

## Cited-path gate

Fetch @sai/policies/tool-resolution.md, resolve `check-cited-paths.js` by it,
and run `node <tool> sai-1 <change-name> --cwd <project-root>`. A non-zero exit
blocks: fix every cited evidence path in `proposal.md` and `specs/**` (the
tool's basename candidates are suggestions; it never rewrites artifacts) and
re-run until it passes.

When no candidate exists, continue without the gate and add the line
`Cited-path gate skipped: check-cited-paths.js not found` to the decision
summary. This gate is the one exception to the policy's stop rule.

## Completion

Hold two things for your report, which the coordinator reads: the decision
summary as its `summary`, and every Rule #1 and Rule #2 warning as an ordered
`warnings` entry (`spec_assertion`, `other_side`, `disagreement`; an empty list
when there are none). The coordinator prints every warning after the summary in
the form below, and the user decides which side is stale.

```text
⚠ Consistency warning — not auto-resolved; you decide which side is stale.

  • Spec assertion    : <spec_assertion>
  • <other_side label> : <other_side>
  • Disagreement      : <disagreement>
```

`other_side` carries the already-labelled source or proposal location; the
coordinator preserves it verbatim.

Recompute the decision summary from the current `proposal.md` and `specs/**`
alone, never from conversation:

- **Scope** — one line per capability under `## Capabilities`, New and
  Modified.
- **Requirements** — one line per requirement, grouped by capability.
- Omit an empty block or group entirely.
- At most 15 non-blank lines, counting any `Reconciled proposal:` or
  `Cited-path gate skipped:` line. When the items do not fit, trim the
  Requirements block first and end with
  `+N more — see openspec/changes/{name}/specs/**`, where N is the number of
  omitted items.
