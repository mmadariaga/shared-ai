# Spec Step — Specs

Active step: specs. Write the capability delta specs, then return the `specs`
progress event.

For each capability under `proposal.md`'s `## Capabilities`, write one delta
spec from `openspec instructions specs --change "<name>" --json`, as the
openspec-propose skill's step 6a describes. Every requirement carries at least
one scenario. The step is done when every listed capability has its delta spec.
