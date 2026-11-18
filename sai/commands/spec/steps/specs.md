# Spec Step — Specs

Active step: specs. Write the capability delta specs, then report the `specs`
step.

For each capability under `proposal.md`'s `## Capabilities`, write one delta
spec from `openspec instructions specs --change "<name>" --json`, written
from its `template`, `instruction`, and `rules`. Every requirement carries at least
one scenario. The step is done when every listed capability has its delta spec.

## Exact values in scenarios

Each scenario's THEN states the **exact observable values** its behavior
produces: the literal a test can compare the output with, such as a status or
error code, a header, a configuration key, a field name, or an output format.
"The system returns an error" lets a test accept any error, so a wrong value
passes unnoticed; the THEN names the value instead. Scenario titles never change
for this rule, because `scenario-coverage.js` links tests to scenarios by their
normalized titles.

- **Sourced value.** When the Ready to Propose block or the repository gives the
  value, write it literally, as the source states it, for every such value the
  behavior produces. A literal you pin stays under Rule #2 of `steps/common.md`.
- **Per-run value.** When the value varies per run (a timestamp, a generated
  identifier), state its format, such as ISO 8601 or UUID v4, instead of a literal.
- **No exact value.** When the behavior produces none (an ordering, the presence
  of an element), leave the THEN as written.
- **Unsourced value.** When the behavior needs an exact value that neither the
  block nor the repository provides, write a value that follows the project's
  conventions, never a question to the coordinator, and keep it for the decision
  summary (`steps/validation.md` § Completion) with the capability, the scenario
  title, and the value.
- **Input differs from code.** When the block's value differs from the value the
  current code produces, the THEN carries the block's value. Keep the difference
  for the decision summary with both values.

A refinement run applies this rule to every scenario of the change's delta
specs, the ones the feedback does not touch included.

When `.openspec.yaml` sets `skip_specs: true`, the change has no spec: write no
file under `specs/` and report the `specs` step.
