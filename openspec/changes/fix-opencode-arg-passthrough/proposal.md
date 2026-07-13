# Proposal: fix-opencode-arg-passthrough

## Why

In opencode, every change-consuming `sai-*` command (`sai-2-design`, `sai-3-implement`, `sai-4-apply`, `sai-5-review`, `sai-6-security`, `sai-7-performance`, `sai-8-accessibility`, `sai-archive`, `sai-pr`) ignores the change-name argument passed on the command line and unconditionally falls back to the interactive change-picker, even when the user typed `/sai-archive installer-offer-opencode-cli`. The same commands work correctly in Claude Code and GitHub Copilot.

Root cause: opencode substitutes `$ARGUMENTS` only into the wrapper template (the file under `~/.config/opencode/commands/`). The body file fetched by `Fetch @sai/commands/sai-X.md` is read separately by the model, and `$ARGUMENTS` inside it is a literal string. The `change-picker` instruction therefore always sees an empty value in opencode and runs the picker. In Claude Code and Copilot, `$ARGUMENTS` is substituted into the body file directly, which is why the existing flow works there.

## What Changes

- Extend `sai/instructions/change-picker.md` "Invocation trigger" with a new resolution step ABOVE the existing `$ARGUMENTS` check: scan the conversation history for a line matching exactly `**Change-name argument:** <value>`; if `<value>` is non-empty, treat it as the resolved change name and skip the picker entirely. Fall through to the existing `$ARGUMENTS` and picker logic only if the wrapper-echo line is absent or its value is empty or whitespace-only. The scan covers the user message that invoked the command (the wrapper) so the line is reliably found even if tool results or model turns appear afterward.
- Append the same `**Change-name argument:** $ARGUMENTS` line at the end of each of the 9 opencode change-consuming wrapper bodies (`commands/opencode/sai-{2-design,3-implement,4-apply,5-review,6-security,7-performance,8-accessibility,archive,pr}.md`), immediately after the existing `Fetch @sai/commands/sai-X.md and follow those instructions exactly.` line.
- Out of scope (deliberate): `commands/claude/` and `commands/copilot/`. In those harnesses `$ARGUMENTS` is substituted into body files, so the change-picker's existing `$ARGUMENTS` check works and the wrapper-echo line is unnecessary. The harness-universality rule is satisfied because the wrapper-echo line is a harness-specific adapter confined to `commands/opencode/`; no harness-agnostic content is touched and no mirror change is required.
- Out of scope: `sai-1-spec` (creates a change, does not consume one), `sai-backfill` (has its own name-resolution flow per `change-picker`'s existing "Shared Instruction" requirement), `sai-commit`, `sai-explore`, `budget`.
- Mitigation for users with an outdated install (new body + old wrapper, or vice versa): add a one-line note in `INSTALL.opencode.md` telling users to re-run `node bin/install.js` after pulling.

## Capabilities

### New Capabilities

- `opencode-change-arg-passthrough`: opencode-specific wrapper convention that emits a `**Change-name argument:** <value>` line at the end of every change-consuming wrapper body, so the body file (read separately by the model) can recover the value that opencode substituted only into the wrapper template.

### Modified Capabilities

- `change-picker`: extend "Invocation trigger" with a new resolution step that scans the conversation history for the wrapper-echo line `**Change-name argument:** <value>` and, when present and non-empty, treats `<value>` as the resolved change name (substituting for `$ARGUMENTS` for the rest of the consuming command) and skips the picker entirely. Existing `$ARGUMENTS` and picker logic remain the fall-through path.
- `harness-universality`: add a new "Harness-specific adapter" requirement that recognizes, as a mirror-discipline exception, changes that fill a gap in exactly one harness's wrapper or instruction set, where the fix has no meaning (or is actively wrong) in the other harnesses. The wrapper-echo line in this change qualifies; the requirement makes the asymmetry principled rather than self-justified.

## Impact

- **New files**: `openspec/specs/opencode-change-arg-passthrough/spec.md` (new capability spec under the `sai-workflow` schema).
- **Modified specs**: `openspec/specs/change-picker/spec.md` (extend the "Invocation Trigger" requirement with the wrapper-echo check; add a new "Wrapper-Echo Resolution" requirement). `openspec/specs/harness-universality/spec.md` (add a new "Harness-specific adapter carve-out" requirement that recognizes this change category as a mirror-discipline exception).
- **New spec files (under `openspec/changes/fix-opencode-arg-passthrough/specs/`)**: the spec is a `MODIFIED` delta on the existing `harness-universality` spec, not a `NEW` capability — it adds a requirement to an existing capability. The proposal's Capabilities section is the contract: `harness-universality` is listed under Modified Capabilities.
- **Modified files**:
  - `sai/instructions/change-picker.md` (one new resolution step at the top of the "Invocation trigger" section; the rest of the file, including the 0/1/N picker logic, is unchanged).
  - `commands/opencode/sai-2-design.md`, `sai-3-implement.md`, `sai-4-apply.md`, `sai-5-review.md`, `sai-6-security.md`, `sai-7-performance.md`, `sai-8-accessibility.md`, `sai-archive.md`, `sai-pr.md` (append one line each).
  - `AGENTS.md` (update the "Change picker" paragraph to reflect the new wrapper-echo resolution step; otherwise the description becomes stale after the change is applied).
  - `INSTALL.opencode.md` (one-line reinstall hint, optional but recommended).
- **No changes** to `commands/claude/`, `commands/copilot/`, `sai-1-spec`, `sai-backfill`, `sai-commit`, `sai-explore`, `budget`, the `openspec` schema, the installer script, or any shared instruction other than `change-picker.md`.
- **Cost impact**: negligible — one extra literal line per opencode wrapper template (not the body, so the model's body context is unaffected), and the change-picker adds at most a single-line substring scan against the conversation history per change-consuming command invocation. No measurable effect on the hot path.

## Proposal Research Documentation

**Local files**:
- `sai/instructions/change-picker.md` (current "Invocation trigger" rule; 0/1/N logic; "Resolved name substitution" — the resolution-step addition slots above the existing `$ARGUMENTS` check)
- `commands/opencode/sai-archive.md` (representative opencode wrapper; current shape `description:` frontmatter + `## Sai Archive` heading + two Fetch directives, no trailing arg line)
- `commands/opencode/sai-{2-design,3-implement,4-apply,5-review,6-security,7-performance,8-accessibility,pr}.md` (same shape — all 9 are the 9 change-consuming wrappers in scope)
- `commands/opencode/sai-1-spec.md` (out-of-scope wrapper — does not consume a change; confirming no echo line needed)
- `sai/commands/sai-archive.md` and `sai/commands/sai-{2-design,...,pr}.md` (the body files fetched by the opencode wrappers — confirm `$ARGUMENTS` appears as a literal in the body, not as a substituted value)
- `openspec/specs/change-picker/spec.md` (existing capability to MODIFY — the "Invocation Trigger" requirement at line 3 is the anchoring point for the new resolution step. The "Shared Instruction, No Duplication" requirement at line 61 is not modified by this change; the new resolution step is a one-line addition to the same shared file, not a duplicate.)
- `openspec/specs/opencode-remember-path-fix/spec.md` (precedent for an opencode-only capability spec that fixes a behavior gap the cross-harness spec did not cover)
- `openspec/specs/harness-universality/spec.md` (mirror discipline — the new "Harness-specific adapter carve-out" requirement is added here as a recognized mirror-discipline exception, so the wrapper-echo line being opencode-only is a principled carve-out rather than a self-justified exception. The current spec is silent on adapter categories, which is why this change introduces the category.)
- `openspec/specs/command-wrappers/spec.md` (existing harness-aware wrapper spec — confirms the cross-harness contract; no change needed there because the opencode-only echo line is local to `commands/opencode/`)
- `AGENTS.md` (Harness universality and Mirror discipline conventions; the "Change picker" paragraph in this change will also be updated to reflect the new wrapper-echo resolution step)
- `INSTALL.opencode.md` (existing opencode install doc — one-line reinstall hint to be added)

**External URLs**: (none — the opencode `$ARGUMENTS` substitution behavior and Claude Code / Copilot substitution behavior are harness facts; no external documentation was consulted)

## Additional Notes

- The change-picker spec is harness-agnostic; the new resolution step is harness-agnostic too (it reads a literal line from "the conversation history", with no mention of any harness). Only the convention that emits the line is opencode-specific — captured in the new `opencode-change-arg-passthrough` spec.
- The new line is a string contract between the wrapper and the change-picker. Future opencode wrappers for new change-consuming `sai-*` commands MUST emit it; the `opencode-change-arg-passthrough` spec pins this requirement so it is discoverable from `openspec/specs/`.
- The change-picker's existing "Shared Instruction, No Duplication" requirement (line 61 of `openspec/specs/change-picker/spec.md`) is unchanged: the new resolution step is a one-line addition to the same shared file, not a duplicate.
- `sai-1-spec` and `sai-backfill` are out of scope by design: `sai-1-spec` creates a new change (no name to pass through), and `sai-backfill` has its own name-resolution flow per the existing "Shared Instruction, No Duplication" requirement's `sai-backfill` exception.
- Verification after the change: re-run `node bin/install.js` to refresh `~/.config/opencode/commands/`, then `/sai-archive installer-offer-opencode-cli` should archive without showing the picker, and `/sai-archive` (no arg) should still show the picker. Regression check on Claude Code and Copilot: re-run one change-consuming command in each and confirm the existing pass-through still works.
- Known inconsistency deferred to a follow-up change (out of scope here): the `commands/opencode/sai-explore.md` wrapper description (frontmatter) says "Optionally pass a change name to explore an existing change", but its body does NOT fetch the change-picker or validate a change name — the description is misleading. The new spec captures the actual behavior in a scenario under `opencode-change-arg-passthrough`, but the description-text fix is deferred because it touches a wrapper frontmatter that mirror discipline would force into Claude/Copilot, expanding the change scope beyond the opencode-only arg-passthrough bug.
- The "harness-specific adapter" carve-out added to `harness-universality/spec.md` makes this asymmetry principled rather than self-justified: changes that fill a gap in exactly one harness's wrapper/instruction set, where the fix has no meaning (or is actively wrong) in the other harnesses, are now a recognized mirror-discipline exception. The wrapper-echo line qualifies because opencode's `$ARGUMENTS` substitution is a unique opencode behavior; the gap and the fix are both opencode-specific.
