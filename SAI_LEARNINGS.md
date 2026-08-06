# SAI Learnings — shared-ai

Durable execution-observed facts about the shared-ai prompt and installer repository.

## Stack

- **bin/install-flow.js**: Fresh opencode configuration installs must merge the binding-derived managed-agent registry after copying the static config, and must resolve that census before destination mutation so invalid bindings or defaults fail without partial writes.
  *Observed:* derive-opencode-agent-census-from-bindings — the preflight preserved fresh-install registration and customized entries while keeping malformed census failures write-free.
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
- **test/implement-coordinator-worker.test.js**: Assertions for customized managed-worker records must include the canonical registration prompt when the installed entry lacks one.
  *Observed:* deterministic-worker-contract-delivery — the legacy promptless expectation failed after prompt-bearing merge; updating it made the full suite pass.
- **test/implementation-harness-bindings-step-3.test.js**: Harness-preservation assertions must expect the canonical registration prompt on managed worker entries while retaining user-owned runtime fields.
  *Observed:* deterministic-worker-contract-delivery — the legacy promptless expectation failed after prompt-bearing merge; updating it made the full suite pass.
- **test/manual-opencode-contract-smoke.js**: A direct runtime smoke probe must guard its entry point from automatic `node --test` discovery while preserving direct runtime-unavailable exit `2`.
  *Observed:* deterministic-worker-contract-delivery — `npm test` loaded the manual probe and failed on exit `2`; a direct-execution guard preserved manual behavior and the full-suite pass.
- **sai/instructions/design.md**: The shared design feedback contract owns normalized complete `interfaces.md` comparison and conditional Architecture Snapshot presentation across routed and inline adapters.
  *Observed:* render-architecture-snapshot-in-sai-2 — the Step 2 task scope omitted this file, but the GREEN contract required the shared behavior and the lifecycle suite passed.
- **sai/instructions/explore.md**: The supervised review contract may retain compatibility wording for legacy structural assertions without changing its bounded convergence semantics.
  *Observed:* add-pipeline-review-convergence-loop — production-only compatibility wording preserved the focused and full suite results after the contract replacement.
- **sai/policies/artifact-feedback-gate.md**: The canonical gate keeps supervised machine-feedback semantics single-sourced and preserves routed coordinator ownership, compatibility wording, and the Copilot inline boundary; structural consumers fetch this policy rather than duplicate its judgment rules.
  *Observed:* feedback-gate-prompt-single-emission — adding routed ownership wording and restoring compatibility phrases made the combined 107-test suite and full 454-test suite pass while preserving machine semantics.
- **test/design-coordinator-worker.test.js**: Structural design assertions must recognize the explicit worker no-prompt prohibition and Markdown-bold terminal navigation wording rather than rejecting those contract phrases.
  *Observed:* feedback-gate-prompt-single-emission — updating stale lexical assertions kept the routed design contract and the full design suite aligned.
- **test/install-opencode.test.js**: Registering a managed worker requires synchronized install, doctor, opencode configuration, and full-suite expectations.
  *Observed:* sai-8-accessibility-coordinator-worker-split — the accessibility worker registration exposed stale fixed lists and configuration fixtures; updating the related expectations restored all 427 tests.
- **test/install-claude.test.js**: Derivation-failure coverage uses isolated binding and configuration filesystem probes rather than mutating the immutable registration defaults.
  *Observed:* derive-opencode-agent-census-from-bindings — isolated probes exercised malformed census paths while keeping canonical defaults read-only.
- **commands/claude/sai-explore.md**: Explore requires scoped `Bash(openspec:*)` and `Bash(git:*)` capabilities alongside its routed dispatch tools; bare shell and direct write capabilities remain forbidden.
  *Observed:* add-sai-explore-pipeline-supervision — capability-level assertions that preserved scoped Bash matched the required worker and research flow.
- **commands/opencode/sai-explore.md**: Routed spec-worker behavior is enabled by fetching the existing `sai-1-spec-proposal-worker` skill; the thin wrapper does not need a literal task-dispatch token.
  *Observed:* add-sai-explore-pipeline-supervision — the exact worker-skill fetch matched the routed binding contract and kept the wrapper thin.
- **Worker proxy retirement**: Routed wrappers fetch neutral installed binding paths directly; obsolete proxy skills are represented only by `skills`-class hash-gated retirement records, so modified user copies remain preserved.
  *Observed:* restore-coordinator-instruction-loading
- **bin/install-manifest.js**: Retirement validation and expansion must keep exact per-harness proxy-skill IDs, lowercase 64-character SHA-256 digests, and separate `sai`/`skills` destination roots while leaving neutral binding projections active.
  *Observed:* restore-coordinator-instruction-loading

## Avoid

## Test Command

npm test
*Observed:* remove-legacy-inline-command-loaders
