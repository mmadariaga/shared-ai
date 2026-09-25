# Spec Step — Validation

Active step: validation. Verify the artifacts, derive the complexity token, and
compose the decision summary, then return the `validation` progress event.

1. Run verification (`steps/common.md` § Verification) and correct every
   failure.
2. Run the cited-path gate.
3. Derive the complexity token.
4. Compose the decision summary and the validation report (§ Completion).

## Cited-path gate

Fetch @sai/policies/tool-resolution.md, resolve `check-cited-paths.js` by it,
and run `node <tool> sai-1 <change-name> --cwd <project-root>`. A non-zero exit
blocks: fix every cited evidence path in `proposal.md` and `specs/**` (the
tool's basename candidates are suggestions; it never rewrites artifacts) and
re-run until it passes.

When no candidate exists, continue without the gate and add the line
`Cited-path gate skipped: check-cited-paths.js not found` to the decision
summary. This gate is the one exception to the policy's stop rule.

## Complexity Derivation Rubric

Derive the `**Complexity**` token on `proposal.md`'s first line from five
signals in the finished `proposal.md` and `specs/**/*.md`:

- **S1 capabilities** — entries under `## Capabilities`, New plus Modified.
- **S2 requirements** — `### Requirement:` headings across the change's
  `specs/**/*.md`.
- **S3 breaking** — any `**BREAKING**` marker in `## What Changes`.
- **S4 new dependency** — the proposal states that a dependency is introduced.
- **S5 affected paths** — distinct literal file paths listed as affected under
  `## Impact`, excluding paths listed as explicitly untouched. Count literal
  paths, not narrative breadth.

Take the first tier that matches, evaluating `high`, then `medium`, then `low`:

- **high** — S1 ≥ 4, or S2 > 10, or S3, or S4, or S5 > 8.
- **medium** — S1 in 2–3, or S2 in 4–10, or S5 in 3–8.
- **low** — everything else.

`high` is the ceiling: a change larger than `high` still gets `high`.

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
