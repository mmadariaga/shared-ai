**Complexity**: high

## Why

Four command cards still depend on a conversation-history wrapper-echo scan even though the boot adapter already forwards the same invocation arguments in the opaque envelope. This creates a transport mismatch in opencode, where `$ARGUMENTS` is not substituted inside a fetched card, and leaves the active picker and wrapper specifications describing a channel that the target architecture no longer needs.

## What Changes

- Replace transcript-based change-name acquisition in the shared change picker and status picker with envelope-field resolution, while retaining the existing 0/1/N selection behavior, prompts, option order, and unbounded invalid-input retries.
- Make the apply, archive, PR, and status cards consume `arguments_value` from the invocation envelope instead of relying on `$ARGUMENTS` substitution in fetched card content.
- Remove the trailing labelled wrapper-echo line from all 16 opencode `sai-*` wrappers, while retaining both envelope fields and leaving Claude Code wrapper sources unchanged; no Copilot wrapper surface exists in this repository.
- Remove the archive fast-track post-picker strip whose only purpose was to repair a flag captured by the transcript scan; preserve command-owned fast-track parsing and every other fast-track gate.
- Update active wrapper, picker, fast-track, and routed-binding specifications so they no longer require or test the retired label channel.
- Record the architectural decision in a new ADR that supersedes ADRs 0033, 0034, 0035, and 0049 without editing those historical records.

## Capabilities

### New Capabilities

- `envelope-only-card-resolution`: Defines envelope-owned resolution for the four remaining fetched cards and the archive fast-track boundary.

### Modified Capabilities

- `change-picker`: Remove conversation-history wrapper-echo scanning and make `arguments_value` authoritative while retaining `wrapper_echo_value` as an opaque envelope field; preserve the picker machinery.
- `status-picker`: Apply the same envelope-only input rule while preserving the dedicated "See all" branch and `> BULK-MODE ACTIVE` signal.
- `opencode-change-arg-passthrough`: Retire the label-line convention for current and future opencode wrappers; preserve the invocation envelope.
- `command-wrapper-body`: Remove label-line content and universal source-precedence semantics from the wrapper body contract while retaining envelope placement and fields.
- `thin-wrappers`: Remove label-line allowances and examples from the shared wrapper template contract.
- `sai-fast-track-flag`: Remove only the archive post-picker cleanup that repaired scan contamination.
- `design-harness-bindings`: Replace the design binding's legacy label-extraction probe with envelope forwarding evidence.

## Impact

The downstream implementation will modify the shared picker policies, the four fetched cards, the 16 opencode wrapper files, wrapper and binding regression tests, the active specifications listed above, and a new ADR/index entry. As a non-normative documentation consequence, it MAY also update the resolution-precedence prose in `AGENTS.md`; that prose is not an additional capability surface. The supported boot adapters remain byte-for-byte envelope forwarders; `wrapper_echo_value` remains an envelope field and is not removed. Claude Code wrapper sources are not modified. No `commands/copilot/` surface exists in this repository, so Copilot is a non-goal and no Copilot files are added or changed. No dependency, API, or runtime service is introduced.

The observable picker contract is intentionally preserved: an empty `arguments_value` still reaches the zero/one/multiple picker, one-change confirmation retains its existing yes/no semantics, the multiple-change prompt retains CLI order and unbounded re-prompting, and status still offers "See all" first on the 2+ branch. Existing installed wrappers may continue to emit an inert label until reinstalled; that compatibility residue is accepted and has no effect on envelope resolution.

## Proposal Research Documentation

**Local files**:

- `AGENTS.md`
- `GLOSSARY.md`
- `sai/adapters/opencode/boot.md`
- `sai/policies/change-picker.md`
- `sai/policies/status-picker.md`
- `sai/commands/review/worker.md`
- `sai/commands/apply/invocation.md`
- `sai/commands/archive/body.md`
- `sai/commands/pr/body.md`
- `sai/commands/status/body.md`
- `commands/opencode/sai-1-spec.md`
- `commands/opencode/sai-2-design.md`
- `commands/opencode/sai-3-implement.md`
- `commands/opencode/sai-4-apply.md`
- `commands/opencode/sai-5-review.md`
- `commands/opencode/sai-6-security.md`
- `commands/opencode/sai-7-performance.md`
- `commands/opencode/sai-8-accessibility.md`
- `commands/opencode/sai-archive.md`
- `commands/opencode/sai-backfill.md`
- `commands/opencode/sai-build.md`
- `commands/opencode/sai-commit.md`
- `commands/opencode/sai-explore.md`
- `commands/opencode/sai-pr.md`
- `commands/opencode/sai-status.md`
- `commands/opencode/sai-worktree.md`
- `openspec/specs/change-picker/spec.md`
- `openspec/specs/status-picker/spec.md`
- `openspec/specs/opencode-change-arg-passthrough/spec.md`
- `openspec/specs/command-wrapper-body/spec.md`
- `openspec/specs/thin-wrappers/spec.md`
- `openspec/specs/sai-fast-track-flag/spec.md`
- `openspec/specs/sai-build-command/spec.md`
- `openspec/specs/design-harness-bindings/spec.md`
- `docs/adr/0000-INDEX.md`
- `docs/adr/0033-echo-line-format-and-placement.md`
- `docs/adr/0034-resolution-precedence-wrapper-echo-first.md`
- `docs/adr/0035-harness-specific-adapter-carve-out.md`
- `docs/adr/0049-fast-track-flag-strip-before-change-picker.md`
- `docs/adr/0075-normalized-invocation-envelope-and-lifecycle-payload.md`
- `docs/adr/0136-opaque-boot-request-and-card-selection-contract.md`
- `docs/adr/0151-composition-constructs-successor-envelopes-directly.md`
- `docs/adr/0153b-build-composition-minted-segment-envelopes.md`
- `test/command-launcher-card.test.js`
- `test/install-opencode.test.js`
- `test/design-coordinator-worker.test.js`
- `test/implement-coordinator-worker.test.js`
- `test/apply-routed-architecture.test.js`
- `test/build-coordinator.test.js`
- `test/explore-pipeline-selector.test.js`

**External URLs**: None.

## Additional Notes

- The new ADR belongs to the `adr` record family: the decision concerns transport and command architecture, not a Domain Invariant. It supersedes ADRs 0033, 0034, 0035, and 0049. Historical ADRs remain immutable and are superseded by relationship metadata in the new record and the ADR index.
- The six already-envelope-migrated routed workers are reference behavior and are not part of the implementation target. The change must not remove `wrapper_echo_value` from the boot envelope.
- Copilot is a non-goal because this repository has no `commands/copilot/` wrapper surface; the change neither assumes those files exist nor creates them.
- The source-grounding literals for the preserved contract are `Use change '{name}'?`, `Which change?`, `No active changes found. Run `/sai-1-spec` to create one.`, `> BULK-MODE ACTIVE`, and the `--fast-track` token. Their existing spelling and semantics remain normative.
