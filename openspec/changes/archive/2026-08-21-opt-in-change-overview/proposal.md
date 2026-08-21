**Complexity**: high

## Why

`change-overview.md` is currently generated on design completion even when the caller did not request an overview, because the overview-language flow supplies an implicit English default. This makes an expensive derived artifact and its lifecycle state unavoidable; making the crystallization gate the explicit opt-in surface keeps overview work intentional while preserving direct `--overview-lang` selection and the existing localized-generation path.

## What Changes

- Treat one explicit `--overview-lang <language>` occurrence as a direct language selection and opt-in signal for overview generation, while retaining gate 9 as the `sai-explore` crystallization-time opt-in surface when the flag is absent.
- Keep the existing parser validation, argument preservation, fast-track handling, and explicit-language suppression of explore gate 9.
- Retain gate 9 as an always-evaluated crystallization gate: offer do-not-create plus English and, for non-English ambient language, the translated endonym; selecting do-not-create opts out and selecting a language opts in.
- Preserve the selected flag or gate value in the selector-dispatched Auto design envelope, while omitting the flag entirely when do-not-create is selected.
- Make the design progress plan, Continue route, overview progress event, and terminal reconciliation conditional on opt-in.
- Keep the existing generator contract, overview state vocabulary, archive/status consumers, and `sai-1-spec` behavior unchanged; an unopted-in run may leave an existing overview stale.
- Do not add a flag, a persisted language preference, or any new `.openspec.yaml` key.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `overview-language-flag`: distinguish an absent option from an explicit language while retaining validation and argument semantics.
- `explore-overview-language-gate`: retain gate 9 as the always-evaluated crystallization-time opt-in selector while preserving explicit-flag suppression.
- `explore-crystallization-block`: always record the gate result as a language value or `None` in single and sliced handoffs.
- `supervised-pipeline-forwarding`: preserve the language-bearing chain and omit the language flag for unopted-in chains.
- `design-coordinator`: select the conditional progress plan and terminal route without changing the two-string envelope.
- `coordinator-progress-ownership`: make the `/sai-2-design` reconciliation trigger conditional on overview opt-in (overview-generation terminal when opted in; no-generation design terminal when not).
- `pipeline-design-phase-chaining`: make supervised design continuation and completion conditional on the flag.
- `localized-overview-generation`: dispatch the unchanged generator only for an explicitly selected language, whether selected by the flag or gate 9.
- `change-overview-synchronization`: constrain materialization and regeneration state transitions to opted-in runs while allowing stale existing overviews.

## Impact

- `sai/commands/explore/body.md` and `sai/commands/explore/instructions.md` — option parsing, gate 9, crystallization output, and Auto forwarding.
- `sai/commands/design/worker.md` and `sai/commands/design/coordinator.md` — presence-aware parsing, conditional plan, generation route, and terminal reconciliation.
- `openspec` capability specifications covering the explore handoff, supervised chaining, design coordinator, coordinator progress ownership, localization, and overview synchronization.
- `sai/policies/todo-structure.md` — dual `/sai-2-design` reconciliation triggers aligned with coordinator-progress-ownership.
- Structural contract tests for explore forwarding/crystallization, design coordinator/worker parity, and overview generation/state behavior.
- Existing overview consumers (`sai-archive` and `sai-status`) remain compatibility boundaries and are not changed.

## Proposal Research Documentation

**Local files**:

- `sai/commands/explore/body.md`
- `sai/commands/explore/instructions.md`
- `sai/commands/explore/launcher.md`
- `sai/commands/design/coordinator.md`
- `sai/commands/design/worker.md`
- `sai/commands/design/change-overview.md`
- `sai/commands/design/invocation.md`
- `sai/orchestration/command-runner.md`
- `sai/orchestration/worker-core.md`
- `sai/orchestration/workers/bindings/claude/worker-template.md`
- `sai/orchestration/workers/bindings/opencode/worker-template.md`
- `sai/commands/archive/instructions.md`
- `sai/commands/status/body.md`
- `openspec/specs/overview-language-flag/spec.md`
- `openspec/specs/explore-overview-language-gate/spec.md`
- `openspec/specs/explore-crystallization-block/spec.md`
- `openspec/specs/supervised-pipeline-forwarding/spec.md`
- `openspec/specs/pipeline-design-phase-chaining/spec.md`
- `openspec/specs/design-coordinator/spec.md`
- `openspec/specs/localized-overview-generation/spec.md`
- `openspec/specs/change-overview-synchronization/spec.md`
- `openspec/specs/change-overview-generation-routing/spec.md`
- `openspec/specs/change-overview-artifact/spec.md`
- `openspec/schemas/sai-workflow/schema.yaml`
- `test/explore-pipeline-selector.test.js`
- `test/design-coordinator-worker.test.js`
- `test/change-overview-contract.test.js`
- `GLOSSARY.md`

**External URLs**: None.

## Additional Notes

- `--overview-lang English` is direct explicit opt-in and must generate in English; omission supplies no default and leaves the result to gate 9 during explore crystallization.
- No language value is persisted. The existing overview generator remains Fetch-driven, single-file, and five-field; only its dispatch eligibility changes.
- Opted-out initial runs leave overview materialization absent/unmaterialized. Opted-out source edits do not promise regeneration and may leave an existing overview stale; they must not falsely report it as newly current.
- Existing `overview.state`, `overview.failure_kind`, and `overview.failure_details` semantics remain the only lifecycle carriers. No disabled or opt-out state is introduced, and archive/status continue their current state/file conjunction behavior.
- The proposal and all delta specifications are written in English; `sai-1-spec` remains outside the feature.
