# SAI Learnings — shared-ai

Durable execution-observed facts about the shared-ai prompt and installer repository.

## Stack

- **bin/install-flow.js**: Existing legacy opencode configurations are augmented with missing managed agents instead of being returned unchanged, while user-configurable low-cost entries are preserved and validated only when they are namespaced managed entries.
  *Observed:* introduce-implement-coordinator-worker — comparing existing `explore`, `executor`, and `budget` entries with placeholder shapes rejected valid user configuration; limiting collision validation to namespaced entries made the merge pass.
- **configs/opencode.jsonc**: Nested low-cost opencode helper dispatch requires `subagent_depth: 2` and `opencode-go/glm-5.1` in the repository's live probe configuration.
  *Observed:* introduce-implement-coordinator-worker — depth 1 rejected nested calls and `deepseek-v4-flash` produced no usable nested payload; depth 2 with GLM 5.1 completed both nested calls without file writes.

## Conventions

- **sai/install-manifest.json**: Manifest consumers and fixtures use the canonical JSON path, nested `destination: { class, path }` values, optional single-string `overrides`, and absolute resolved destination paths.
  *Observed:* extract-sai-orchestration-core — blind test fixtures inferred a `.jsonc` path, flattened destinations, collection-shaped overrides, and relative paths; aligning them with the manifest contract produced the valid GREEN suite.
- **commands/claude/sai-3-implement.md**: Structural assertions track the supported wrapper metadata `model: opus` and `effort: medium` rather than a provider-specific model identifier or stale effort value.
  *Observed:* extract-sai-orchestration-core — obsolete exact metadata expectations caused unrelated baseline failures; matching the current wrapper metadata restored the coordinator suite.

## Avoid

## Test Command
