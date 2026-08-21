**Complexity**: high

## Why

The sai-1 spec worker and sai-2 design worker currently carry a second, worker-owned artifact-review path even though sai-explore already owns the manual and supervised Review Engine surfaces. Removing that cold reviewer path makes artifact review single-sourced in sai-explore, eliminates duplicate review counters and retry semantics, and lets the routed progress steps rely on explicit external findings evidence rather than inferred completion.

## What Changes

- Remove the worker-owned automatic planning-artifact review loop from the spec and design worker contracts and their planning-artifact-review-loop requirements.
- Make sai-explore's manual Review Engine and supervised in-session Review Engine rounds the only artifact-review surfaces for the planning artifacts; workers consume externally supplied findings blocks and remain the artifact writers.
- Relocate the supervised marker prefix grammar to the explore-pipeline-supervision capability, where its dispatch and envelope responsibilities are owned.
- Preserve the spec worker's six-step plan and the design worker's seven-step plan, including their `review` steps, coordinator-owned rendering, monotonic progress marks, and the evidence-marked reconciliation carve-out.
- Require review progress evidence to come from an external findings block with the shared contract's base-form `Summary: High=0 Medium=<count> Low=<count>` line; absence of findings or prose SHALL never be interpreted as `High=0`.
- Narrow the shared artifact-review contract scope to manual Explore reviews and supervised in-session rounds without changing its finding fields, severity vocabulary, identifiers, or Summary tally.
- Add an explicit review-loop mention to the interactive artifact feedback gate while preserving its existing question, two options, ordering, and iteration behavior.
- As a later implementation-phase repository-hygiene action, move `openspec/changes/suppress-worker-review-under-supervision/design.md` and `openspec/changes/suppress-worker-review-under-supervision/implementation.md` to `openspec/changes/archive/2026-08-20-suppress-worker-review-under-supervision/` and remove the resulting empty source directory.

## Capabilities

### New Capabilities

<!-- No new capabilities. -->

### Modified Capabilities

- `planning-artifact-review-loop`: remove the eight worker-loop requirements and make externally supplied Explore findings the worker feedback input.
- `review-step-evidence-marking`: source the spec/design `review` progress mark from validated external findings-block evidence.
- `spec-proposal-worker`: retain the six-step progress contract while removing worker review dispatch and consuming external findings only.
- `design-planning-worker`: retain the seven-step progress contract while removing worker review dispatch and consuming external findings only.
- `explore-pipeline-supervision`: own the supervised marker grammar and sole supervised artifact-review lifecycle.
- `review-finding-format`: scope the shared finding contract to manual and supervised Explore review surfaces.
- `artifact-feedback-gate`: add the review-loop presentation note without changing the interactive question or choices.

## Impact

The later implementation phase will update the following instruction and policy surfaces: `sai/commands/spec/worker.md`, `sai/commands/design/worker.md`, `sai/commands/explore/instructions.md`, `sai/policies/artifact-review-contract.md`, and `sai/policies/artifact-feedback-gate.md`. The corresponding canonical OpenSpec capabilities listed above will be synchronized with those source contracts. It will also perform the repository-hygiene move of the two named artifacts from `openspec/changes/suppress-worker-review-under-supervision/` to `openspec/changes/archive/2026-08-20-suppress-worker-review-under-supervision/`, then remove the empty source directory; that move has no capability delta of its own. Audit commands (`sai-5-review`, `sai-6-security`, `sai-7-performance`, and `sai-8-accessibility`) and `sai-build` are explicitly out of scope. No source, configuration, or existing change artifact is changed during this spec phase.

## Proposal Research Documentation

**Local files**:

- `openspec/specs/planning-artifact-review-loop/spec.md`
- `openspec/specs/review-step-evidence-marking/spec.md`
- `openspec/specs/spec-proposal-worker/spec.md`
- `openspec/specs/design-planning-worker/spec.md`
- `openspec/specs/explore-pipeline-supervision/spec.md`
- `openspec/specs/review-finding-format/spec.md`
- `openspec/specs/artifact-feedback-gate/spec.md`
- `sai/commands/spec/worker.md`
- `sai/commands/design/worker.md`
- `sai/policies/artifact-review-contract.md`
- `sai/policies/todo-structure.md`
- `sai/commands/explore/instructions.md`
- `sai/policies/artifact-feedback-gate.md`

**External URLs**: None.

## Additional Notes

- The external findings block is the output of an already completed sai-explore review transaction and is pasted or forwarded through the existing artifact feedback gate; the worker does not create a reviewer or infer evidence from ordinary feedback text.
- The base Summary line remains `Summary: High=<count> Medium=<count> Low=<count>`. A valid `High=0` line is explicit evidence; an absent line, absent findings, or non-review prose is not evidence.
- This proposal creates only proposal/spec planning artifacts. The named archive move and empty-source-directory removal are explicitly deferred to the later implementation phase and MUST NOT occur while this spec phase is authoring artifacts.
