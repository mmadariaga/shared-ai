# SAI Learnings — shared-ai

Durable execution-observed facts about the shared-ai prompt and installer repository.

## Stack

- **bin/install-flow.js**: Opencode installation is a file projection: the owned-copy installer honors `projection.sourcePath` (no basename-derived source), and the binding-derived roster is an opencode binding validator (`validateOpencodeWorkerBindings`) that runs before any destination mutation so malformed or duplicate bindings fail write-free. The derived registration-default/census surface is retired.
  *Observed:* opencode-markdown-worker-agents — replacing the census/registration surface with file-projected owned-copy agents required the roster validator to fail closed pre-mutation.
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
- **test/implement-coordinator-worker.test.js**: Customized opencode worker configuration entries stay byte-identical (no prompt injection, no missing worker keys added); opencode worker registration is asserted from the projected `agents/opencode/*.md` files, not the config sample.
  *Observed:* opencode-markdown-worker-agents — the worker-shapes-in-config and prompt-injection assertions were rewritten to the file-based surface.
- **test/implementation-harness-bindings-step-3.test.js**: Harness-preservation assertions for opencode are file-based: the implementation surface includes `agents/opencode/sai-3-implementation-worker.md` (and excludes the Claude counterpart), fresh merges leave no worker key, customized worker config entries stay byte-identical (no prompt injection), and uninstall preserves the config while removing owned files with their sidecars.
  *Observed:* opencode-markdown-worker-agents — the config-map merge/prompt assertions were replaced by file-projection and byte-identity assertions.
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
- **test/install-opencode.test.js**: Opencode worker registration assertions are file-based — the projected `agents/opencode/*.md` files (mode/model/variant/permission.task frontmatter, canonical contract-fetch body, ownership sidecar hash), not the configuration agent map; retired census/registration-default surfaces must not be asserted.
  *Observed:* opencode-markdown-worker-agents — 12 stale config-map assertions across five suites failed until the test surface was completed to the file-based projection.
- **test/install-claude.test.js**: Derivation-failure coverage uses isolated binding and configuration filesystem probes rather than mutating the immutable registration defaults.
  *Observed:* derive-opencode-agent-census-from-bindings — isolated probes exercised malformed census paths while keeping canonical defaults read-only.
- **bin/doctor.js**: Doctor validates each projected opencode worker agent file against its bundled `agents/opencode/<worker>.md` source by SHA-256 compatibility — missing → error with re-install remediation, incompatible → error with rename-or-remove remediation, exact-compatible → ok — and its record messages carry the remediation wording (re-install / rename or remove) directly, not only the recommendation field.
  *Observed:* opencode-markdown-worker-agents — the written probes assert the remediation phrasing on `record.message`, so the messages must embed it.
- **commands/claude/sai-explore.md**: Explore requires scoped `Bash(openspec:*)` and `Bash(git:*)` capabilities alongside its routed dispatch tools; bare shell and direct write capabilities remain forbidden.
  *Observed:* add-sai-explore-pipeline-supervision — capability-level assertions that preserved scoped Bash matched the required worker and research flow.
- **commands/opencode/sai-explore.md**: Routed spec-worker behavior is enabled by fetching the existing `sai-1-spec-proposal-worker` skill; the thin wrapper does not need a literal task-dispatch token.
  *Observed:* add-sai-explore-pipeline-supervision — the exact worker-skill fetch matched the routed binding contract and kept the wrapper thin.
- **Worker proxy retirement**: Routed wrappers fetch neutral installed binding paths directly; obsolete proxy skills are represented only by `skills`-class hash-gated retirement records, so modified user copies remain preserved.
  *Observed:* restore-coordinator-instruction-loading
- **bin/install-manifest.js**: Retirement validation and expansion must keep exact per-harness proxy-skill IDs, lowercase 64-character SHA-256 digests, and separate `sai`/`skills` destination roots while leaving neutral binding projections active.
  *Observed:* restore-coordinator-instruction-loading

- **test/apply-coordinator-verification.test.js**: Structural contract tests must anchor section extraction to the exact Markdown heading when the section name can also appear in preceding prose.
  *Observed:* remove-preserved-scratch-acknowledgement-gate — an unanchored recovery-section lookup matched an earlier prose mention; anchoring to the `### Known-False Report Recovery` heading restored the focused and full-suite passes.
- **sai/instructions/apply.md**: A Step with only test-file implementation scope requires a single dispatch when split routing would prohibit the implementation dispatch from editing the only plan-authorized file.
  *Observed:* remove-preserved-scratch-acknowledgement-gate — the split implementation boundary could not execute test-only GREEN; one bounded dispatch completed the RED/GREEN cycle within the declared file.
- **openspec/schemas/sai-workflow/schema.yaml**: The tasks artifact's `instruction` field is a YAML block scalar with 6-space indentation, so a mandated multi-line replacement spans several lines and shifts the remaining instruction lines; `openspec instructions tasks --change <name>` reads both the schema `instruction` and the `templates/tasks.md` template from disk, serving as a combined regression check for both surfaces in one invocation.
  *Observed:* declare-file-change-type-in-tasks — replacing the single-line `**Files Affected**` instruction line with the 4-line change-type wording required block-scalar continuation (schema.yaml:118-121), and the command confirmed both the instruction and the template emit the new format.

- **test/*-coordinator-worker.test.js**: Coordinator-worker structural suites assert stale model pins (`glm-5.2`, `minimax-m3`, `claude-opus-4-8`) and a legacy Major-promotion accessibility wording that the committed wrappers and agents no longer carry (`deepseek-v4-flash` / `opus`); those `npm test` failures pre-date any applied change.
  *Observed:* parameterize-decision-record-index-machinery — apply-time `npm test` showed 465/473 passing; the 8 failures were proven pre-existing because the files those tests read are byte-identical to HEAD.

## Avoid

- **configs/opencode.jsonc**: Do not assert managed-worker registration from the configuration agent map — the sample carries no `agent.sai-*-worker` keys; worker membership is file-based (projected `agents/opencode/*.md` files plus the binding-derived roster).
  *Observed:* opencode-markdown-worker-agents — 12 stale config-map assertions across five suites failed until rewritten to the file-based surface.

## Test Command

npm test
*Observed:* remove-legacy-inline-command-loaders
