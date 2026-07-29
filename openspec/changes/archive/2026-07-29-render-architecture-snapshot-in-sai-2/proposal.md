**Complexity**: medium

## Why

The sai-2 design review currently requires readers to reconstruct the planned public architecture from detailed step contracts, making naming, placement, and flow mistakes harder to spot before implementation. A concise architecture snapshot in `interfaces.md`, shown at the feedback checkpoint and redisplayed only after an effective interface change, provides a fast and portable review surface without introducing another artifact.

## What Changes

- Add an Architecture Snapshot subsection under `## Target State` in `interfaces.md`.
- Define a concise inventory of planned public classes, interfaces, methods, and project-root-relative paths.
- Include ASCII flows that show relationships and execution flows between the planned public surfaces.
- Print the snapshot immediately before the initial feedback loop.
- After feedback, print the snapshot again only when the effective content of `interfaces.md` changed; treat identical regeneration as unchanged.
- Preserve `## Step N` sections as authoritative for step attribution, signatures, and test assertions.
- Keep the behavior consistent across Claude Code, opencode, and GitHub Copilot without changing application code.

## Capabilities

### New Capabilities

- `architecture-snapshot-rendering`: Generate and display a feedback-aware architecture snapshot for sai-2 design interfaces.

### Modified Capabilities

<!-- No existing capability has been identified whose published requirement is being changed; the sai-2 behavior is captured as a new capability. -->

## Impact

- `sai/instructions/design.md` — define the snapshot content, placement, comparison, and display rules.
- `sai/commands/sai-2-design.md` — preserve the coordinator feedback lifecycle and consume the worker's existing summary without adding a payload field.
- `sai/orchestration/workers/sai-2-design-worker.md` — require snapshot generation and effective-content comparison as part of the worker-owned interface artifact work.
- `sai/orchestration/inline-invocation.md` — preserve the Copilot inline path and parity with routed design flows.
- `sai/policies/artifact-feedback-gate.md` — keep the snapshot aligned with the existing design feedback loop.
- `openspec/schemas/sai-workflow/schema.yaml` — keep the workflow schema's `interfaces.md` generation contract aligned with the snapshot behavior.
- `openspec/schemas/sai-workflow/templates/interfaces.md` — preserve the canonical `interfaces.md` Target State structure while making the snapshot location explicit.
- No application source, dependency, configuration, or deployment changes.

## Proposal Research Documentation

**Local files**:

- `sai/instructions/design.md`
- `sai/commands/sai-2-design.md`
- `sai/orchestration/coordinator-contract.md`
- `sai/orchestration/workers/sai-2-design-worker.md`
- `sai/orchestration/inline-invocation.md`
- `sai/policies/artifact-feedback-gate.md`
- `openspec/schemas/sai-workflow/schema.yaml`
- `openspec/schemas/sai-workflow/templates/interfaces.md`
- `openspec/changes/archive/2026-07-24-enrich-design-artifact-format/interfaces.md`
- `openspec/changes/archive/2026-07-27-introduce-design-coordinator-worker/interfaces.md`
- `commands/claude/sai-2-design.md`
- `commands/opencode/sai-2-design.md`

**External URLs**: None.

## Additional Notes

- The snapshot is part of `interfaces.md`, not a new top-level artifact.
- The worker owns technical artifact generation and comparison; the coordinator prints the worker's existing summary and does not receive a new terminal payload field.
- Paths in the snapshot are relative to the project root.
- ASCII flows are intentionally portable across Claude Code, opencode, and GitHub Copilot.
