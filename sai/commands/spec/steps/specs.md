# Spec Step — Specs

Active step: specs. Write the capability delta specs, then report the `specs`
step.

For each capability under `proposal.md`'s `## Capabilities`, write one delta
spec from `openspec instructions specs --change "<name>" --json`, written
from its `template`, `instruction`, and `rules`. Every requirement carries at least
one scenario. The step is done when every listed capability has its delta spec.
