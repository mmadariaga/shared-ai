**Complexity**: high

## Why

The `owned-copy` strategy requires byte identity between shipped and installed agent files: a sha256 mismatch throws `Incompatible managed agent at <path>` (`bin/install-flow.js:464-490`) and `doctor` reports the same divergence as an error (`bin/doctor.js:332-352` for Claude and `bin/doctor.js:354-399` for opencode). Any user who tunes a worker's `model`, `effort`, or `variant` — the very thing the harness invites them to do — breaks the next install and the next doctor run. The strategy must be replaced before any new managed agent whose tunables the user is invited to edit can be added at this integration point. The same byte-identity contract is also enforced from the uninstall side at `bin/uninstall-flow.js:42-46`, `bin/uninstall-flow.js:111-118`, and `bin/uninstall-flow.js:188-201`, so the change must replace the parallel `owned-copy` branch and the sidecar-driven `readManagedHash` decision there as well — otherwise uninstall silently stops enumerating the 14 agent files and starts keeping every tuned file as a project-local override.

## What Changes

- Replace the `owned-copy` install strategy with a new `tunable-seed` strategy for all 14 managed agent projections (7 Claude + 7 opencode) on both harnesses; remove `owned-copy` from the `STRATEGIES` validation set in `bin/install-manifest.js:6-11` and from the dispatch path in `bin/install-flow.js:497-507`
- On first install (destination absent), write the shipped source file verbatim, including the shipped tunable values
- On every later install (destination present), overwrite the body and non-tunable frontmatter with the source bytes; preserve the destination's tunable scalar lines (`model`, `effort` for Claude; `model`, `variant` for opencode) using a structural splice, not a positional one. When the source frontmatter contains the same tunable key, the value is replaced in place at the matching key's source position. When the source omits the key, the line is appended immediately after the last top-level scalar in the source frontmatter and before the first nested block (such as `permission:`), so the result is well-formed regardless of how the source's frontmatter shape changed. No tunable line is ever emitted inside a nested block. A destination tunable line whose key is in the harness tunable set is preserved even when the source has no counterpart for that key (so a user who adds `variant: high` to an opencode agent file that ships without `variant` keeps that line on every subsequent install). A destination line whose key is not in the harness tunable set is non-tunable content and is overwritten with the source. An absent tunable key in the destination stays absent — the installer does not re-seed it from source
- Declare the tunable keys once per harness, in installer code, not per projection rule; absence of a tunable key in the destination is a valid user state, never a drift bug
- Replace the parallel `owned-copy` branch in `bin/uninstall-flow.js` (`bin/uninstall-flow.js:42-46`, `bin/uninstall-flow.js:77-85`, `bin/uninstall-flow.js:120-133`, `bin/uninstall-flow.js:188-201`) with a body-and-non-tunable comparison so uninstall keeps enumerating the 14 agent files and uses the same identity rule doctor uses; `readManagedHash` (`bin/uninstall-flow.js:111-118`) and the sidecar-field on uninstall entries are retired
- Delete installed `.<basename>.owner.json` sidecar files on every install under a shape guard (filename matches the sidecar pattern for a known managed agent, and contents parse as a JSON object whose only key is `managedHash` whose value is a 64-character lowercase hexadecimal string); files that match the filename but not the shape are left untouched. The uninstall flow applies the same shape guard to the sidecar adjacent to any agent file it deletes, so users who upgrade from a pre-change installation leave no residue when they uninstall shared-AI
- Delete the `bin/managed-worker-migration.js` module and remove the legacy Claude worker migration code in `bin/install-flow.js` (`migrateLegacyClaudeWorkers`, `LEGACY_CLAUDE_WORKERS`, the `migrateManagedWorkerIdentity` import, the `MANAGED_WORKERS.claude.owner` field, `OWNER_BY_CLAUDE_AGENT`, and the `CLAUDE_*_WORKER_OWNER` constants) — these are the only consumers of the sidecar format
- Update `doctor` so its managed-asset check compares only the body and non-tunable frontmatter; tunable-key differences (presence, value, or absence) are not reported
- When the installer overwrites a destination whose body or non-tunable frontmatter differs from source, emit a console notice naming the file and continue; do not throw

## Capabilities

### New Capabilities

- `agent-projection-strategy`: defines the new install strategy that replaces `owned-copy` for all managed agent projections and removes `owned-copy` from the strategy validation set
- `agent-tunable-ownership`: declares which frontmatter keys the user owns, per harness; defines the seed-on-create / overwrite-managed-on-update extraction-and-splicing rule that preserves user tunables on later installs while treating their absence as a valid user state; and pins the uninstall-side identity rule that uses the same body-and-non-tunable comparison
- `agent-install-diagnostics`: adapts `doctor` and installer reporting to the new ownership contract — body and non-tunable frontmatter are still compared, tunable differences are not, and a modified managed body is a console notice, not an error
- `agent-sidecar-removal`: deletes installed `.<agent>.owner.json` sidecar files under a shape guard on both the install and uninstall paths and retires the code paths that read or write them, including the dedicated legacy-migration module

### Modified Capabilities

- `managed-worker-registry` (`openspec/specs/managed-worker-registry/spec.md`): requirements that pin the `owned-copy` strategy, the `OWNER_BY_CLAUDE_AGENT` map, the `claude.owner` registry field, the "opencode agent rows SHALL mirror the Claude rows' destination shape (`owned-copy` strategy, `owned` ownership)" rule, and the "fail-closed owner dispatch" rule are rewritten to describe the new `tunable-seed` strategy, the per-harness tunable-set declaration, the body-and-non-tunable identity rule, and the console-notice overwrite behavior. The fresh-install byte-preservation contract is restated against the new identity rule (no sidecars; doctor and uninstall use the same body comparison). The Scenario "Existing consumers observe the same Claude values" is removed because the `OWNER_BY_CLAUDE_AGENT` export is retired; the "Claude worker registration and owner sidecar" wording across the spec is removed in favor of "Claude worker registration and tunable-seed projections"
- `opencode-agent-preservation` (`openspec/specs/opencode-agent-preservation/spec.md`): the "Opencode collision-policy documentation matches ownership semantics" requirement is updated to describe the new `tunable-seed` lifecycle (create when absent, overwrite managed body + non-tunable frontmatter on update, leave tunables untouched, emit a console notice rather than blocking with rename-or-remove when the managed body diverges); the `rename-or-remove remediation` wording across the spec is replaced with the new ownership contract
- `opencode-worker-system-prompt` (`openspec/specs/opencode-worker-system-prompt/spec.md`): the "User-owned opencode agent files are never overwritten" requirement is retired and replaced by "User-owned opencode agent files preserve user tunables" which describes the `tunable-seed` lifecycle for projected worker files; the "blocks with rename-or-remove remediation" branch becomes "overwrites the body and non-tunable frontmatter and emits a console notice"; the sidecar-based uninstall guard is replaced with the body-and-non-tunable comparison
- `design-harness-bindings` (`openspec/specs/design-harness-bindings/spec.md`): the "Design binding definitions are collision-safe and ownership-aware" requirement is retired and replaced by "Design binding definitions are ownership-aware" which describes the `tunable-seed` lifecycle. "Incompatible existing file blocks installation with rename-or-remove remediation" becomes "installer overwrites the body and non-tunable frontmatter and emits a console notice, leaving user tunables intact". The "user-edited worker runtime is honored" wording is preserved because tunables are now preserved by the new strategy
- `review-worker-installation` (`openspec/specs/review-worker-installation/spec.md`): the "Claude worker ownership is collision-safe" requirement is rewritten; the "owner dispatch resolves an owner sidecar for every `owned-copy` projection" rule is replaced with "the installer handles each `tunable-seed` projection by writing or overwriting the agent file and, when the body or non-tunable frontmatter differs from source, emitting a console notice"; the "incompatible collision blocks installation" wording becomes "installer overwrites with notice". The `rename-or-remove remediation` and "fails closed on unowned agent" semantics are retired
- `security-worker-installation` (`openspec/specs/security-worker-installation/spec.md`): the "Claude security-worker ownership is collision-safe" requirement is rewritten against `tunable-seed` with the same notice-on-overwrite behavior; the sidecar and the "renames or removes conflicting definition" branch are retired
- `accessibility-worker-installation` (`openspec/specs/accessibility-worker-installation/spec.md`): the "Routed accessibility wrappers and bindings preserve harness parity" requirement is rewritten; "the Claude projection SHALL include the managed worker identity and owner sidecar" becomes "the Claude projection SHALL include the managed worker identity and the new tunable-seed handling"
- `implementation-harness-bindings` (`openspec/specs/implementation-harness-bindings/spec.md`): the extensive Claude and opencode implementation worker sidecar semantics (Requirement "Claude coordinator-worker binding", Requirement "Opencode coordinator-worker binding", Requirement "Managed implementation worker projections") are rewritten against `tunable-seed`. The "create the canonical SAI-namespaced agent and an adjacent `.sai-3-implementation-worker.owner.json` sidecar" rule becomes "create the canonical agent file with its shipped tunables". The "block with rename-or-remove remediation when an incompatible file exists" rule becomes "overwrite the body and non-tunable frontmatter, preserve user tunables, and emit a console notice". The "Guarded uninstall SHALL remove the agent only when the ownership sidecar exists and the current agent hash matches the sidecar" rule is replaced with the new body-and-non-tunable identity rule
- `opencode-agent-census` (`openspec/specs/opencode-agent-census/spec.md`): the "opencode worker roster does not alter other harness paths" requirement is updated; the "Claude Code worker registration and owned-copy projections MUST retain their existing assets, ownership, routing" wording is replaced with "Claude Code worker registration and tunable-seed projections MUST retain their existing assets, tunables, and routing, with the new contract replacing the prior owned-copy / owner-sidecar / rename-or-remove behavior with the tunable-seed / tunable-preservation / body-overwrite-with-notice behavior"

### Reviewed and found unaffected

- `install-uninstall-enumeration-parity` (`openspec/specs/install-uninstall-enumeration-parity/spec.md`): its `managedHashes` references are about the retirement array for the old per-harness binding destinations under `sai/orchestration/workers/bindings/{claude,opencode}/`, not about sidecars. The change does not affect binding retirements, so the capability is preserved as-is. The 30 retired-binding entries in `sai/install-manifest.json:45-264` and the `retirement.managedHashes` validation in `bin/install-manifest.js:108-112` remain in force; `RETIREMENT_DESTINATION_CLASSES` (`bin/install-manifest.js:14`) is still restricted to `sai` and `skills`

## Impact

**Manifest and install contract** — strategy vocabulary changes:

- `M` `sai/install-manifest.json` — the 14 `owned-copy` projection rules become `tunable-seed` rules; `strategy` values for agent projections are the only changes to the projections array
- `M` `bin/install-manifest.js` — `STRATEGIES` validation set drops `owned-copy`, gains `tunable-seed`

**Installer code**:

- `M` `bin/install-flow.js` — replace `ownedManagedWorkerInstaller` (currently `bin/install-flow.js:465-491`) with the seed-on-create / overwrite-managed-on-update installer; remove the `MANAGED_WORKERS` Claude `owner` fields (`bin/install-flow.js:23-66`), `OWNER_BY_CLAUDE_AGENT` (`bin/install-flow.js:75-77`), the `CLAUDE_*_WORKER_OWNER` constants (`bin/install-flow.js:68-74`), `LEGACY_CLAUDE_WORKERS` (`bin/install-flow.js:78-81`), `migrateLegacyClaudeWorkers` (`bin/install-flow.js:83-109`), and the `migrateManagedWorkerIdentity` import (`bin/install-flow.js:12`); update the `installProjection` dispatch (`bin/install-flow.js:497-507`) to route the new strategy and to throw on `owned-copy` (the strategy is retired, not silently aliased)
- `M` `bin/uninstall-flow.js` — replace the `owned-copy` branch in `manifestEntries` (`bin/uninstall-flow.js:42-46`) with the new strategy's body-comparison handling; update `legacyClaudeRecords` (`bin/uninstall-flow.js:77-85`) to drop the `ownerPath` lookup and the legacy sidecar enumeration; replace the sidecar-driven hash guard in `computeClaudeAgentPlanEntry` (`bin/uninstall-flow.js:120-133`) and `deleteEntry` (`bin/uninstall-flow.js:188-201`) with a body-and-non-tunable comparison; retire `readManagedHash` (`bin/uninstall-flow.js:111-118`) and remove it from the module's exports (`bin/uninstall-flow.js:296-313`); the legacy `claude-legacy-agent` asset type is removed because the legacy migration it served is removed
- `D` `bin/managed-worker-migration.js` — the legacy Claude worker migration module; its only consumer is removed above, and the sidecar shape guard makes the rest of its functionality unreachable

**Diagnostics**:

- `M` `bin/doctor.js` — `managedClaudeWorkerRecords` (`bin/doctor.js:322-352`) and `managedOpencodeAgentRecords` (`bin/doctor.js:354-399`) compare only the body and non-tunable frontmatter; the `'rename or remove the conflicting definition, then retry'` remediation is retired because the new installer overwrites the body and continues, so the user no longer has to rename or remove

**Tests**:

- `M` `test/install-claude.test.js` — replace owner-sidecar assertions (currently `test/install-claude.test.js:289-330` and `test/install-claude.test.js:332-396`) with seed/update assertions
- `M` `test/install-opencode.test.js` — replace the Step 1 owned-copy bytes and sidecar tests (`test/install-opencode.test.js:903-1007`) and the Step 3 sidecar assertion (`test/install-opencode.test.js:1114-1130`) with seed/update assertions
- `M` `test/install-manifest.test.js` — update the `STRATEGIES` validation set test (`test/install-manifest.test.js:675`); the retirement block and per-projection manifest tests remain intact
- `M` `test/doctor-opencode-agent-preservation-step-2.test.js` — update the customized-worker assertion (`test/doctor-opencode-agent-preservation-step-2.test.js:138-162`): the doctor still flags body divergence but no longer carries the rename-or-remove remediation, because the new installer overwrites and continues
- `M` `test/uninstall-enumeration.test.js` — replace owned-copy / sidecar enumeration assertions with the new body-comparison-driven enumeration
- `M` `test/uninstall-execution.test.js` — replace sidecar-hash guard assertions with body-and-non-tunable comparison assertions for the `claude-managed-agent` asset type
- `M` `test/uninstall-plan.test.js` — replace `readManagedHash` and `computeClaudeAgentPlanEntry` assertions with the new body-comparison plan-entry assertions; remove the `claude-legacy-agent` and `claude-managed-agent-owner` asset-type assertions
- `M` `test/design-coordinator-worker.test.js` — remove the legacy-migration tests (`test/design-coordinator-worker.test.js:569-580` and `test/design-coordinator-worker.test.js:591-600`)
- `M` `test/implement-coordinator-worker.test.js` — remove owner-sidecar assertions (`test/implement-coordinator-worker.test.js:131`, `test/implement-coordinator-worker.test.js:227`, and `test/implement-coordinator-worker.test.js:601-625`)
- `M` `test/accessibility-coordinator-worker.test.js` — remove the owner-path projection in the enumeration test (`test/accessibility-coordinator-worker.test.js:283` and `test/accessibility-coordinator-worker.test.js:305`)
- `M` `test/implementation-harness-bindings-step-3.test.js` — update the ADR/INSTALL prose reference to the new ownership contract (`test/implementation-harness-bindings-step-3.test.js:242-252`)

**New tests** (one per new capability, scoped to the change's own code paths so the rewrite does not depend on reshuffling the existing test files):

- `A` `test/agent-projection-strategy.test.js` — manifest declares the new strategy and the validation set accepts it
- `A` `test/agent-tunable-ownership.test.js` — seed-on-create, preserve-on-update, ordered preservation, source-omitted-key preservation, absent-stays-absent, uninstall body-comparison identity
- `A` `test/agent-install-diagnostics.test.js` — doctor body-only comparison; installer console notice on body overwrite
- `A` `test/agent-sidecar-removal.test.js` — shape-guard deletes known sidecars; leaves other dotfiles and malformed sidecars alone; legacy-migration module is gone

**Modified capability spec deltas** (one `specs/<name>/spec.md` per Modified Capability listed above, each carrying either a `## MODIFIED Requirements` block when the requirement header is preserved and only the body changes, or a `## ADDED Requirements` plus `## REMOVED Requirements` pair when the requirement is renamed (a retire-and-replace); the existing requirement text in `openspec/specs/<name>/spec.md` is replaced by the change's text — by an in-place modification when the header is preserved, or by retirement-and-addition when the header changes — and the change's `## What Changes` list calls out which line range of each existing spec is affected):

- `A` `openspec/changes/agent-projection-seed-on-create/specs/managed-worker-registry/spec.md`
- `A` `openspec/changes/agent-projection-seed-on-create/specs/opencode-agent-preservation/spec.md`
- `A` `openspec/changes/agent-projection-seed-on-create/specs/opencode-worker-system-prompt/spec.md`
- `A` `openspec/changes/agent-projection-seed-on-create/specs/design-harness-bindings/spec.md`
- `A` `openspec/changes/agent-projection-seed-on-create/specs/review-worker-installation/spec.md`
- `A` `openspec/changes/agent-projection-seed-on-create/specs/security-worker-installation/spec.md`
- `A` `openspec/changes/agent-projection-seed-on-create/specs/accessibility-worker-installation/spec.md`
- `A` `openspec/changes/agent-projection-seed-on-create/specs/implementation-harness-bindings/spec.md`
- `A` `openspec/changes/agent-projection-seed-on-create/specs/opencode-agent-census/spec.md`

**Source agents** — `agents/claude/sai-1-spec-proposal-worker.md`, `agents/claude/sai-2-design-worker.md`, `agents/claude/sai-3-implementation-worker.md`, `agents/claude/sai-5-review-worker.md`, `agents/claude/sai-6-security-worker.md`, `agents/claude/sai-7-performance-worker.md`, `agents/claude/sai-8-accessibility-worker.md`, and the seven opencode counterparts are not modified by this change. They are listed only so the Impact section names the 14 destinations the new strategy governs.

**Explicitly not touched** — `configs/opencode.jsonc`, the agent block within it, and `mergeOpencodeAgents` in `bin/install-flow.js:719-…` are out of scope. No new agent is added, removed, or renamed. Rollout of new default models to existing installations is out of scope. `openspec/specs/install-uninstall-enumeration-parity/spec.md` is reviewed and preserved as-is (its `managedHashes` are about binding retirements, not sidecar retirements).

## Proposal Research Documentation

**Local files**:

- `bin/install-flow.js:1-77` — `MANAGED_WORKERS` registry, `OWNER_BY_CLAUDE_AGENT`, `CLAUDE_*_WORKER_OWNER` constants, `LEGACY_CLAUDE_WORKERS` constant
- `bin/install-flow.js:83-109` — `migrateLegacyClaudeWorkers` (the only consumer of `migrateManagedWorkerIdentity`)
- `bin/install-flow.js:120-247` — `validateClaudeWorkerBindings` / `validateOpencodeWorkerBindings` (proves the worker roster is binding-derived, not registry-derived; the registry's `owner` field is the only thing used by the sidecar machinery)
- `bin/install-flow.js:460-491` — `ownedManagedWorkerInstaller` (the hash guard being replaced)
- `bin/install-flow.js:497-507` — `installProjection` strategy dispatch
- `bin/install-flow.js:568-585` — `installClaude` / `installOpencode` entrypoints
- `bin/install-manifest.js:6-11` — `STRATEGIES` validation set
- `bin/install-manifest.js:14` — `RETIREMENT_DESTINATION_CLASSES` (confirms the `agents` class is intentionally absent from the retirement mechanism; this is why a per-version sha256-based retirement cannot enumerate sidecar contents)
- `bin/install-manifest.js:60-115` — `validateManifest` and `validateRetirements`
- `bin/install-manifest.js:124-179` — `expandRule` / `expandInstallManifest` (the projections array is the only place `strategy` is declared; the new value flows through this unchanged)
- `bin/uninstall-flow.js:21-67` — `manifestEntries` (the `owned-copy` branch at `bin/uninstall-flow.js:42-46` is the sole gate that enumerates managed agent files for removal; once `owned-copy` is gone, the branch is unreachable and uninstall silently stops enumerating the 14 agent files)
- `bin/uninstall-flow.js:77-85` — `legacyClaudeRecords` (uses `ownerPath` to discover legacy agents via their sidecar; the new strategy makes this branch unnecessary)
- `bin/uninstall-flow.js:104-109` — `sha256File` (still used; the change does not touch this helper)
- `bin/uninstall-flow.js:111-118` — `readManagedHash` (the sidecar reader being retired)
- `bin/uninstall-flow.js:120-133` — `computeClaudeAgentPlanEntry` (the sidecar-hash-driven keep/delete decision being replaced by body comparison)
- `bin/uninstall-flow.js:188-201` — `deleteEntry` for the `claude-managed-agent` and `claude-legacy-agent` asset types (the sidecar-hash-driven unlink path being replaced)
- `bin/uninstall-flow.js:296-313` — module exports (remove `readManagedHash`)
- `bin/doctor.js:320-352` — `managedClaudeWorkerRecords` (sha256 equality check; the new check strips tunables before comparing)
- `bin/doctor.js:354-399` — `managedOpencodeAgentRecords` (same pattern; the opencode check derives from the manifest, not from a hard-coded registry)
- `bin/managed-worker-migration.js` — the entire file; its public surface is `inspectManagedWorkerMigration` and `migrateManagedWorkerIdentity`
- `sai/install-manifest.json:29-42` — the 14 `owned-copy` projection rules
- `sai/install-manifest.json:45-264` — the retirements array (confirms no `agents`-class retirement exists and confirms the sha256-only hash contract is what would have to enumerate per-version sidecars)
- `agents/claude/sai-1-spec-proposal-worker.md`, `agents/claude/sai-2-design-worker.md`, `agents/claude/sai-3-implementation-worker.md`, `agents/claude/sai-5-review-worker.md` — Claude frontmatter dialect: `name`, `description`, `model`, `effort`, `tools`
- `agents/opencode/sai-1-spec-proposal-worker.md`, `agents/opencode/sai-2-design-worker.md`, `agents/opencode/sai-3-implementation-worker.md`, `agents/opencode/sai-5-review-worker.md` — opencode frontmatter dialect: `description`, `mode: subagent`, `model`, optional `variant`, nested `permission: { task: { ... } }` block
- `openspec/specs/managed-worker-registry/spec.md:9-121` — the eight requirements that name the `owned-copy` strategy, the `OWNER_BY_CLAUDE_AGENT` map, the `claude.owner` registry field, and the opencode mirror rule
- `openspec/specs/opencode-agent-preservation/spec.md:9-74` — the requirement that pins the `owned-copy` lifecycle in the ADRs (`openspec/specs/opencode-agent-preservation/spec.md:65-74`) and the doctor rename-or-remove remediation (`openspec/specs/opencode-agent-preservation/spec.md:39-53`)
- `openspec/specs/opencode-worker-system-prompt/spec.md:44-61` — the owned-copy lifecycle for projected worker files
- `openspec/specs/opencode-agent-census/spec.md:44-53` — the "Claude Code worker registration and owned-copy projections remain unchanged" rule
- `openspec/specs/design-harness-bindings/spec.md:111-136` — the design worker owned-copy lifecycle
- `openspec/specs/review-worker-installation/spec.md:16-36` — the review worker owner-dispatch rule
- `openspec/specs/security-worker-installation/spec.md:17-30` — the security worker owner-dispatch rule
- `openspec/specs/accessibility-worker-installation/spec.md:8-53` — the accessibility worker routing and parity assertions
- `openspec/specs/implementation-harness-bindings/spec.md:11-87` — the extensive Claude and opencode implementation worker sidecar semantics
- `openspec/specs/install-uninstall-enumeration-parity/spec.md:30-39` — reviewed and confirmed unaffected: the `managedHashes` references are about the retirement array for old per-harness binding destinations, not about sidecars
- `test/install-claude.test.js:1-350` — owner-sidecar assertions and the `Every owned worker resolves to its owner sidecar` test
- `test/install-opencode.test.js:903-1130` — Step 1 owned-copy bytes and sidecar tests; Step 3 sidecar assertion
- `test/install-manifest.test.js:675` — `STRATEGIES` validation set test
- `test/doctor-opencode-agent-preservation-step-2.test.js:1-281` — exact-compatible, customized-body, missing-file, and config-independence cases
- `test/uninstall-enumeration.test.js`, `test/uninstall-execution.test.js`, `test/uninstall-plan.test.js` — the three uninstall test files that consume the sidecar machinery via `manifestEntries`, `readManagedHash`, `computeClaudeAgentPlanEntry`, and `deleteEntry`; the change updates each to use the new body-comparison identity

**External URLs**: None — the change is entirely grounded in this repository.

## Additional Notes

- The `permission:` nested block on opencode agents is non-tunable and is overwritten with the source. It is never parsed as YAML. Extraction operates on the textual pattern `^<key>:\s*<value>$` for the listed tunable keys only.
- The sha256 source-hash sidecar (`{ managedHash: <hex> }`) is intentionally not migrated into a "seed provenance" record. The decision in the change framing is explicit: the sidecars are deleted, not repurposed, because their content varies with every agent version ever shipped and would have to be enumerated per version to be useful as rollout provenance.
- The `permission:` block's wildcard keys (`'*': deny`, `budget: allow`, `explore: allow`, etc.) are overwritable. The user is expected to have their own project-local `permission:` rules on top; agent-file tunability is scoped to the listed scalar keys only.
- Behavior-preservation note for the impact narrative: for any installation whose agent files were never modified, this change is a byte-for-byte no-op. First install writes source verbatim (same as the old `created` path); update with no user changes preserves the same tunable lines (same bytes). All observable risk is concentrated on users who tuned a worker — the same users whose install fails today.
- Glossary follow-up: the existing `Managed Worker` term in `GLOSSARY.md` (line 61) reads "A phase worker whose agent, ownership sidecar, and harness-specific registration are installed and tracked by the shared-AI installer." After this change, the "ownership sidecar" half of that definition is obsolete. The implementation phase is expected to update the term to drop the sidecar reference and add the tunable-frontmatter ownership rule, so the term continues to describe the actual installer contract. This is a glossary edit, not a code change, and is scoped to the implementation step that touches `bin/install-flow.js`.
- Modified-capability delta scope: the nine Modified Capabilities listed above are restated against the new ownership contract in their respective `specs/<name>/spec.md` files under the change directory. Each restatement is either a `## MODIFIED Requirements` block (when the requirement header is preserved and only the body changes — managed-worker-registry, opencode-agent-preservation, opencode-agent-census, review-worker-installation, security-worker-installation, accessibility-worker-installation, implementation-harness-bindings) or a `## ADDED Requirements` plus `## REMOVED Requirements` pair (when the requirement is renamed, a retire-and-replace — managed-worker-registry for two renamed requirements, opencode-worker-system-prompt, design-harness-bindings). The original requirement text in the main `openspec/specs/<name>/spec.md` is replaced by the change's text in either form. The change's `## What Changes` list names which line range of each existing spec is affected. Reviewers reading the change should read each restated requirement in the context of the original spec to confirm the contract change.
