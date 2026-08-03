**Complexity**: high

## Why

After crystallizing a change, users currently transport the handoff into `/sai-1-spec`, return the artifacts to explore for review, and relay findings back through the spec feedback gate. A supervised pipeline can preserve context isolation while removing that transport work and keeping every decision with the user.

## What Changes

- Add the literal `start-pipeline` post-crystallization token for changes in explore's chat-scoped tracked crystallized set.
- On Claude Code and opencode, let the user select exactly one uncompleted tracked change per token, then make explore coordinate its routed `sai-1` spec worker, escalate every worker question to the user, and continue the same worker with the answer.
- Run exactly one independent review pass in a fresh subagent given only the crystallized block and resulting proposal/spec artifacts.
- Submit review findings item-by-item through the existing artifact feedback gate before the normal user-facing gate, with the spec worker applying accepted findings and reporting discards.
- Reuse `review-loop` trigger recognition, preserve tracked-set first-emission order in change selection, suppress duplicate completed work, acknowledge empty or already-completed sets, and leave failed or cancelled spec-worker attempts retryable.
- Report an incomplete independent review without retry or direct repair, while leaving the generated artifacts available to the normal user-facing feedback gate.
- Replace the standalone sai-1 terminal navigation line during supervision with a concise supervised completion result that states sai-2 was not run.
- On GitHub Copilot, acknowledge `start-pipeline` with a supervision-unavailable response and otherwise preserve current explore behavior.
- Amend explore's read-only contract so explore itself never writes files while explicitly permitting dispatched workers to write within their owned change directory.
- Name `start-pipeline` alongside `review-loop` in the crystallization block's keep-window-open recommendation without auto-offering or auto-starting either token.

## Capabilities

### New Capabilities
- `explore-pipeline-supervision`: Coordinates the routed spec worker lifecycle for tracked crystallized changes, preserves terminal behavior, and escalates every worker question without autonomous answers.
- `explore-pipeline-token`: Defines `review-loop`-compatible `start-pipeline` recognition, one-change selection, tracked-set ordering and completion de-duplication, retry behavior, token consent, and harness-specific outcomes.
- `pipeline-independent-review`: Performs one context-isolated ad-hoc review, routes structured findings through a pre-gate feedback adapter, and preserves the iteration-0 user-facing gate even when review fails.

### Modified Capabilities
- `explore-crystallization-block`: Adds `start-pipeline` to the closing keep-window-open recommendation beside `review-loop`.
- `explore-context-isolation`: Distinguishes explore's own no-write guarantee from writes performed by dispatched workers within their owned change directory.
- `artifact-feedback-gate`: Adds a single-sourced machine-feedback adapter that applies review findings without presenting or advancing the user gate.

## Impact

- Shared explore behavior and orchestration contracts under `sai/instructions/` and `sai/orchestration/`.
- Claude Code and opencode explore wrappers/bindings under `commands/claude/`, `commands/opencode/`, `skills/claude/`, and `skills/opencode/`.
- GitHub Copilot explore wrapper behavior under `commands/copilot/` without adding routed worker bindings.
- Installer projections in `sai/install-manifest.json` and structural coverage in `test/`.
- No new external dependency and no change to independently invoked `/sai-1-spec` or `/sai-2-design` behavior.

## Proposal Research Documentation

**Local files**: `sai/instructions/explore.md:1-5,76-168`; `sai/commands/sai-explore.md:1-34`; `commands/claude/sai-explore.md:1-11`; `commands/opencode/sai-explore.md:1-10`; `commands/copilot/sai-explore.prompt.md:1-11`; `sai/commands/spec/coordinator.md:1-26`; `sai/orchestration/coordinator-contract.md:1-45`; `sai/orchestration/worker-lifecycle.md:1-61`; `sai/orchestration/workers/sai-1-spec-proposal-worker.md:1-17`; `sai/orchestration/workers/bindings/claude/spec-worker.md:1-11`; `sai/orchestration/workers/bindings/opencode/spec-worker.md:1-11`; `sai/install-manifest.json:4-35`; `test/spec-coordinator-worker.test.js:62-185`; `GLOSSARY.md:49-70,97-133`; `openspec/specs/explore-post-crystallization-review-loop/spec.md:18-74,99-227`; `openspec/specs/explore-context-isolation/spec.md:8-42`; `openspec/specs/explore-crystallization-block/spec.md:53-70,94-156`; `openspec/changes/archive/2026-08-03-route-sai-1-spec-through-coordinator-worker/specs/spec-coordinator/spec.md:3-23`; `openspec/changes/archive/2026-08-03-route-sai-1-spec-through-coordinator-worker/specs/spec-behavioral-parity/spec.md:3-19`.

**External URLs**: None.

## Additional Notes

- `route-sai-1-spec-through-coordinator-worker` is archived and supplies the routed worker lifecycle this change depends on.
- The tracked crystallized set remains chat-scoped; `start-pipeline` does not discover changes from the repository.
- One review pass is intentionally non-convergent. Automated revision loops and autonomous answers are deferred.
- The pipeline may write only through dispatched workers and only inside the change directory owned by the dispatched spec phase.
- The independent reviewer is an ad-hoc fresh subagent, not a routed lifecycle worker; its result does not extend the shared worker status set or require a reviewer binding.
- Machine-generated review findings invoke the artifact feedback gate capability's dedicated pre-gate adapter, without presenting or advancing the user gate.
