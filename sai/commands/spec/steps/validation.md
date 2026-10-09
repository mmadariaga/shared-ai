# Spec Step — Validation

Active step: validation. Verify the artifacts and compose the decision summary,
then return the `validation` progress event.

1. Run verification (`steps/common.md` § Verification) and correct every
   failure.
2. Run the cited-path gate.
3. Compose the decision summary and the validation report (§ Completion).

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

Hold two things for the phase's `completed` result, which the coordinator
prints: the decision summary as its `summary`, and every Rule #1 and Rule #2
warning as an ordered `validation_report.warnings` entry (`spec_assertion`,
`other_side`, `disagreement`; an empty list when there are none) per
`@sai/policies/spec-phase-contract.md`.

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
