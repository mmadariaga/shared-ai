**Complexity**: high (4 capabilities, no breaking change)

## Why

`change-overview.md` is a human-oriented review projection, but the current overview-generation flow can produce it only in English. An invocation-scoped language flag lets users request a localized overview without changing normative OpenSpec artifacts or persisting a language preference.

## What Changes

- Add optional `--overview-lang <language>` parsing to the shared `sai-explore` and `sai-2-design` flows.
- Default overview generation to English when the flag is absent and report a clear validation error when its value is missing.
- Strip the flag and value before change-name resolution while preserving `--fast-track` regardless of argument order.
- Pass the selected language to the budget-routed Change Overview generator for the current invocation and apply it only to `change-overview.md`.
- Forward the selected language from a supervised `sai-explore start-pipeline` run into its chained `sai-2-design` worker; the normal isolated-chat transition does not retain it.
- Keep Claude Code and opencode wrappers, worker bindings, documentation, and contract tests behaviorally equivalent.

## Capabilities

### New Capabilities

- `overview-language-flag`: Parse, validate, and remove an optional invocation-scoped `--overview-lang <language>` argument in the shared explore and design flows.
- `localized-overview-generation`: Supply the selected language to Change Overview generation and regeneration while leaving normative artifacts and the existing generator result envelope unchanged.
- `supervised-pipeline-forwarding`: Preserve the selected language when `sai-explore start-pipeline` chains the current change into `sai-2-design`.
- `harness-parity`: Provide equivalent flag behavior, forwarding, documentation, and contract coverage for Claude Code and opencode.

### Modified Capabilities

- None.

## Impact

- Shared command and phase instructions: `sai/commands/sai-explore.md`, `sai/instructions/explore.md`, `sai/commands/design/coordinator.md`, and `sai/instructions/change-overview.md`.
- Design worker and harness-specific worker bindings: `sai/orchestration/workers/sai-2-design-worker.md`, `sai/orchestration/workers/bindings/claude/design-worker.md`, and `sai/orchestration/workers/bindings/opencode/design-worker.md`.
- Claude Code and opencode wrappers: `commands/claude/sai-explore.md`, `commands/opencode/sai-explore.md`, `commands/claude/sai-2-design.md`, and `commands/opencode/sai-2-design.md`.
- Contract tests covering explore supervision, design coordinator/worker transport, and overview generation: `test/explore-pipeline-supervision.test.js`, `test/design-coordinator-worker.test.js`, and `test/change-overview-contract.test.js`.
- No new dependency, persisted language field, normative artifact localization, or `sai-1` behavior.

## Proposal Research Documentation

**Local files**: `GLOSSARY.md`; `sai/commands/sai-explore.md`; `sai/instructions/explore.md`; `sai/orchestration/workers/sai-2-design-worker.md`; `sai/commands/design/coordinator.md`; `sai/instructions/change-overview.md`; `commands/claude/sai-explore.md`; `commands/opencode/sai-explore.md`; `commands/claude/sai-2-design.md`; `commands/opencode/sai-2-design.md`; `sai/orchestration/workers/bindings/claude/design-worker.md`; `sai/orchestration/workers/bindings/opencode/design-worker.md`; `openspec/specs/explore-pipeline-token/spec.md`; `openspec/specs/pipeline-phase-transition/spec.md`; `openspec/specs/pipeline-design-phase-chaining/spec.md`; `openspec/specs/change-overview-generation-routing/spec.md`; `test/explore-pipeline-supervision.test.js`; `test/design-coordinator-worker.test.js`; `test/change-overview-contract.test.js`.

**External URLs**: None.

## Additional Notes

- A language value is free-form and invocation-scoped; validation requires one non-empty CLI value and does not introduce a maintained language registry.
- A change-consuming `sai-2-design` invocation supplies the change name before `--overview-lang <language>`; the language flag may be combined with `--fast-track` in either order. The flag and value must be removed before resolving the change name.
- Duplicate `--overview-lang` occurrences and invocations that leave no change name after parsing must fail with a clear validation error.
- A later `sai-2-design` invocation or regeneration must receive `--overview-lang` again if localization is desired. No equivalent language key may be added to `.openspec.yaml`.
- The selected language is a rendering instruction for free-text prose in the Change Overview projection. Its section headings, Architecture Snapshot, requirements, scenarios, paths, commands, state values, and generator result keys remain verbatim English/source values; proposal, specs, design, tasks, interfaces, and other normative content remain English.
- The existing overview lifecycle remains authoritative: only the design worker owns state transitions and the overview file, and the generator keeps its current five-field result contract and single-file write scope.
- The normal isolated-chat transition after exploration cannot carry ephemeral language state; only the supervised `start-pipeline` chain forwards it. A later retry after a failed or cancelled design invocation is a new invocation and must receive the flag again.
- The exact parity documentation surfaces are the four Claude Code/opencode command wrappers' argument hints and forwarding text plus the shared `sai/commands/sai-explore.md` and `sai/commands/design/coordinator.md` flag and envelope contracts.
