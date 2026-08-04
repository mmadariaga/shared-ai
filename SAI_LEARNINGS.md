# SAI Learnings — shared-ai

Durable execution-observed facts about the shared-ai prompt and installer repository.

## Stack

- **bin/install-flow.js**: Fresh opencode configuration installs must merge the managed-agent registry after copying the static config so newly registered workers are available while existing entries remain configurable.
  *Observed:* sai-5-review-coordinator-worker-split — copying the static config alone omitted the review worker; merging managed agents made fresh-install registration and smoke checks pass.
- **opencode wrapper metadata**: Wrapper-facing documentation and structural tests use both the human-readable `GLM 5.2` wording and the runtime model ID `opencode-go/glm-5.2` when documenting the declared runtime.
  *Observed:* simplify-routed-phase-coordination — replacing coordinator-profile assertions exposed the two representations; retaining both made the documentation and runtime-ID checks pass.
- **configs/opencode.jsonc**: Nested low-cost opencode helper dispatch requires `subagent_depth: 2` and `opencode-go/glm-5.1` in the repository's live probe configuration.
  *Observed:* introduce-implement-coordinator-worker — depth 1 rejected nested calls and `deepseek-v4-flash` produced no usable nested payload; depth 2 with GLM 5.1 completed both nested calls without file writes.
- **bin/install-manifest.js**: Harness-matrix projection tests must provide destination roots for every manifest destination class, even when asserting one source projection.
  *Observed:* share-vscode-inline-coordinator — a fixture with only the `sai` root failed on the unrelated `commands` class; supplying all five roots made the projection assertion runnable.

## Conventions

- **sai/install-manifest.json**: Harness-specific command projections must exclude routed review sources from Copilot while Claude Code and opencode receive them; Copilot remains on the inline review path.
  *Observed:* sai-5-review-coordinator-worker-split — the routed review projections initially matched Copilot's shared command sources; partitioning the manifest preserved the inline boundary and made parity checks pass.
- **commands/claude/sai-3-implement.md**: Structural assertions track the supported wrapper metadata `model: opus` and `effort: medium` rather than a provider-specific model identifier or stale effort value.
  *Observed:* extract-sai-orchestration-core — obsolete exact metadata expectations caused unrelated baseline failures; matching the current wrapper metadata restored the coordinator suite.
- **sai/install-manifest.json**: Copilot inline entrypoints and their installed adapter projection must be updated together; doctor and full-suite checks fail when wrappers resolve an unprojected adapter.
  *Observed:* share-vscode-inline-coordinator — Step 2 entrypoints caused three doctor failures until Step 3 added the Copilot-only projection.
- **test/implementation-harness-bindings-step-3.test.js**: Copilot orchestration assertions allow exactly `sai/orchestration/inline-invocation.md` and continue rejecting workers and bindings.
  *Observed:* share-vscode-inline-coordinator — the former blanket no-orchestration assertion rejected the intentional inline exception; exact-source filtering restored the suite.
- **opencode.json/opencode.jsonc doctor fixtures**: Clear both configuration files before writing malformed fixture inputs because doctor resolves `opencode.json` ahead of `opencode.jsonc`, and installer-generated output can otherwise mask the intended case.
  *Observed:* preserve-custom-opencode-agents — clearing both files before each malformed fixture produced the expected error records.
- **sai/instructions/design.md**: The shared design feedback contract owns normalized complete `interfaces.md` comparison and conditional Architecture Snapshot presentation across routed and inline adapters.
  *Observed:* render-architecture-snapshot-in-sai-2 — the Step 2 task scope omitted this file, but the GREEN contract required the shared behavior and the lifecycle suite passed.
- **sai/instructions/explore.md**: The supervised review contract may retain compatibility wording for legacy structural assertions without changing its bounded convergence semantics.
  *Observed:* add-pipeline-review-convergence-loop — production-only compatibility wording preserved the focused and full suite results after the contract replacement.
- **sai/policies/artifact-feedback-gate.md**: Supervised machine-feedback semantics remain single-sourced in the canonical gate; explore references the adapter and routes worker input without duplicating its judgment rules.
  *Observed:* add-sai-explore-pipeline-supervision — removing duplicated explore semantics and keeping the canonical policy as the source made the focused supervision suite pass.
- **commands/claude/sai-explore.md**: Explore requires scoped `Bash(openspec:*)` and `Bash(git:*)` capabilities alongside its routed dispatch tools; bare shell and direct write capabilities remain forbidden.
  *Observed:* add-sai-explore-pipeline-supervision — capability-level assertions that preserved scoped Bash matched the required worker and research flow.
- **commands/opencode/sai-explore.md**: Routed spec-worker behavior is enabled by fetching the existing `sai-1-spec-proposal-worker` skill; the thin wrapper does not need a literal task-dispatch token.
  *Observed:* add-sai-explore-pipeline-supervision — the exact worker-skill fetch matched the routed binding contract and kept the wrapper thin.

## Avoid

## Test Command

npm test
*Observed:* remove-legacy-inline-command-loaders
