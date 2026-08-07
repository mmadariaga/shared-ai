**Complexity**: high (6 modified capabilities, ~14 files, zero installed base)

## Why

The two harness projections are asymmetric: Claude Code ships plain markdown agent files with ownership sidecars, while opencode performs a surgical JSONC merge of seven managed worker registrations (mode, model, variant, permission, prompt) into the user's `opencode.json`/`opencode.jsonc`. The projection seam for markdown agents is already generic on the destination side (`destinationRoots` exposes the `agents` destination class per harness at `bin/install-flow.js:569-571`, resolving to `~/.config/opencode/agents/`), and manifest `ownership: "owned"` carries the sidecar-based lifecycle (create, reuse exact-compatible, fail closed on incompatible) that replaces the hand-rolled `promptMissing` injection branch — accepting that a user-edited agent file blocks reinstall until reverted, unlike the JSONC branch which kept installing while preserving the entry. The opencode worker registrations never landed on main (introduced in `db59127`, present only on `experimental`), so the installed base is zero and no migration path is required. Projecting the seven workers as owned markdown agent files removes the managed-worker half of the JSONC merge while keeping the JSONC merge for what it is actually needed for: `subagent_depth`, `permission.external_directory`, and the three helper agents.

## What Changes

- Project the seven opencode workers (`sai-1-spec-proposal-worker`, `sai-2-design-worker`, `sai-3-implementation-worker`, `sai-5-review-worker`, `sai-6-security-worker`, `sai-7-performance-worker`, `sai-8-accessibility-worker`) as owned markdown agent files under `~/.config/opencode/agents/`, mirroring the Claude agent projection exactly.
- Add seven `owned-copy` rows to `sai/install-manifest.json` (source `agents/opencode/*.md`, destination class `agents`, harness `opencode`, ownership `owned`), mirroring the seven Claude rows at `sai/install-manifest.json:29-35`.
- Create the seven `agents/opencode/*.md` source files with `mode`, `model`, `variant` (where applicable), and `permission.task` frontmatter, and the canonical worker contract fetch in the body.
- Retire the derived registration defaults in `bin/install-flow.js`: `OPENCODE_REGISTRATION_DEFAULTS`, `getOpencodeManagedAgents`, the `OPENCODE_MANAGED_AGENTS` export, `expectedRegistrationPrompt`, and the registration-default half of `deriveOpencodeAgentCensus`; retain the binding-dispatch validation (one initial `task(subagent_type: ...)` per binding, expected dispatch prompt, unique names, full roster coverage) as an opencode binding validator mirroring `validateClaudeWorkerBindings`.
- Prune the managed-worker half of `mergeOpencodeAgents`: remove the `...getOpencodeManagedAgents()` spread (`bin/install-flow.js:826`) and the `promptMissing` injection branch (`bin/install-flow.js:836-843`); leave the permission classification and the `explore`/`executor`/`budget` add-if-absent merge intact.
- Prune the seven `agent.sai-*-worker` keys from the canonical sample `configs/opencode.jsonc` (the fresh-install merge source) and the "Required namespaced implementation agents" block in `printOpencodeConfigMessage`.
- Doctor (`bin/doctor.js:354`): `managedOpencodeAgentRecords` validates the seven projected agent files against their bundled sources (missing → error, incompatible → error, compatible → ok) instead of reading the config agent map.
- Uninstall: `enumerateOpencode` already covers the `agents/` destination root, so the seven opencode `owned-copy` rows are enumerated automatically with the existing owner-sidecar hash guard; no functional change expected.
- Docs: rewrite the managed-worker JSONC contract paragraphs in `INSTALL.opencode.md` (sections `### Managed implementation agents` and `### Deterministic routed worker contract prompts`, plus the inline JSONC samples at lines ~109 and ~212), the asymmetry statements in `INSTALL.claude.md`, and the opencode sections of `docs/adr/0077-harness-specific-worker-bindings.md` and `docs/adr/0088-implementation-harness-projection-boundaries.md`.
- Tests: replace the census/registration-default assertions in `test/install-opencode.test.js` (1617 lines, including `CURRENT_CENSUS`/`OPENCODE_MANAGED_AGENTS` fixtures) and update the doctor and harness-binding test suites to file-based validation.
- Not breaking: the registrations never shipped on main, so no retirement rules are needed for leftover `agent.sai-*-worker` config keys, and no migration path is required.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `opencode-agent-census`: retire the derived registration defaults and their census validation against binding dispatch prompts; the binding roster validation is retained
- `managed-worker-registry`: project the seven opencode workers as owned markdown agent files with mode, model, variant, and `permission.task` frontmatter instead of deriving `OPENCODE_MANAGED_AGENTS` from bindings joined with registration defaults
- `opencode-worker-system-prompt`: the canonical worker contract moves from the JSONC registration `prompt` field into the projected markdown agent body
- `implementation-harness-bindings`: doctor and uninstall enumerate projected opencode agent files instead of config agent-map entries; the `sai-3-implementation-worker` config entry becomes a projected agent file
- `design-harness-bindings`: the canonical opencode design-worker definition moves from the sample configuration into the projected markdown agent file, and its collision/ownership semantics follow the file surface
- `opencode-agent-preservation`: doctor validates projected worker agent files instead of config-map name presence; the ADR 0077/0088 opencode sections describe the file projection

## Impact

- `bin/install-flow.js` — remove census/registration-default surface, retain binding validation, prune the JSONC worker merge half and the guidance block, and make the `owned-copy` path harness-neutral: honor each projection's declared `source` path (today `installClaudeManagedWorker` hardcodes `agents/claude/` at line 543 and `installProjection` discards `projection.sourcePath` at lines 578-585, which would silently project Claude bytes into the opencode agents directory) and neutralize the Claude-flavored function names and error messages
- `bin/doctor.js` — `managedOpencodeAgentRecords` switches from config agent-map presence to projected-file compatibility
- `sai/install-manifest.json` — seven new `owned-copy` rows for `agents/opencode/`
- `agents/opencode/*.md` — seven new source files (mirror of `agents/claude/*.md`)
- `configs/opencode.jsonc` — the seven `agent.sai-*-worker` keys removed; `subagent_depth`, `permission`, and the three helper agents retained
- `INSTALL.opencode.md`, `INSTALL.claude.md` — managed-worker narrative rewritten
- `docs/adr/0077-harness-specific-worker-bindings.md`, `docs/adr/0088-implementation-harness-projection-boundaries.md` — opencode sections rewritten
- `test/install-opencode.test.js`, `test/doctor-opencode-agent-preservation-step-2.test.js`, `test/implementation-harness-bindings-step-3.test.js` — assertions updated
- Explicitly not touched: `skills/`, `commands/`, `sai/orchestration/` worker contracts and bindings, `bin/install-manifest.js`, the `explore`/`executor`/`budget` JSONC merge, permission classification, and every Claude projection.
- No new dependencies; no breaking change.

## Proposal Research Documentation

**Local files**:
- `bin/install-flow.js` — census derivation (278-324), registration defaults (124-171), `mergeOpencodeAgents` (802-881), `destinationRoots` (569-571), owned-copy dispatch (573-588), guidance (668-690), exports (1009-1031)
- `bin/install-manifest.js` — manifest expansion and `owned-copy` strategy support
- `bin/doctor.js` — `managedOpencodeAgentRecords` (354-408) and `managedClaudeWorkerRecords` (317-352)
- `bin/uninstall-flow.js` — `manifestEntries` owned-copy handling (21-67), `enumerateOpencode` (87-90)
- `sai/install-manifest.json` — seven Claude agent rows (29-35) as the mirror shape; `opencode-config` row (36)
- `configs/opencode.jsonc` — the seven worker keys (40-103) to prune
- `agents/claude/*.md` — reference frontmatter for the projected worker shape
- `sai/orchestration/workers/bindings/opencode/spec-worker.md` — the task-dispatch surface the binding validator checks
- `INSTALL.opencode.md` (237-253 and inline samples), `INSTALL.claude.md` (37, 84, 136)
- `docs/adr/0077-harness-specific-worker-bindings.md`, `docs/adr/0088-implementation-harness-projection-boundaries.md`
- `openspec/specs/{opencode-agent-census,managed-worker-registry,opencode-worker-system-prompt,implementation-harness-bindings,design-harness-bindings,opencode-agent-preservation,opencode-config-install,installer-and-documentation-alignment,accessibility-worker-installation}/spec.md` — main-spec surface for the delta
- `test/install-opencode.test.js` — census and registration-default test surface
- `GLOSSARY.md`

**External URLs**: none

## Additional Notes

- The owned-copy path is NOT yet harness-generic on the source side: `installClaudeManagedWorker` (`bin/install-flow.js:542-543`) hardcodes the source directory to `agents/claude/`, and `installProjection` (`bin/install-flow.js:578-585`) discards `projection.sourcePath` and re-derives the source by destination basename. Because the seven opencode filenames are identical to the Claude ones, an opencode row with `source: "agents/opencode/sai-2-design-worker.md"` would silently project the Claude file's bytes (Claude frontmatter, `tools` field, no `permission.task`) with no error or collision. The change MUST make the owned-copy path install the bytes of the declared `projection.sourcePath` and MUST neutralize the Claude-flavored function names and error messages. The owner-sidecar lookup by agent filename stays valid because the seven filenames are identical across harnesses.
- Owned-copy lifecycle (identical to Claude): create when absent with owner sidecar; reuse when exact-compatible; fail closed with rename-or-remove remediation when incompatible; guarded uninstall removes only when the sidecar hash matches. The guarantee is fail-closed **non-overwrite, not reinstall persistence**: a user-edited agent file is never overwritten, but the next install THROWS until the edit is reverted or the file removed — whereas the JSONC add-if-absent branch kept installing while preserving the user's entry. Trade-off accepted: the author's per-worker model routing is re-applied once to the projected markdown files, and any subsequent reinstall on this machine requires reverting or removing those edits first. The fail-closed lifecycle is **decided** by this change's specs (it mirrors the Claude managed-agent lifecycle), so `/sai-2-design` conforms to it; the alternatives (reused-user-owned without a sidecar, separating the canonical definition from a user override) would require revising the four normative lifecycle requirements in `managed-worker-registry`, `opencode-worker-system-prompt`, `implementation-harness-bindings`, and `design-harness-bindings`, and are therefore out of scope here — a future spec change, not a design decision.
- Two capabilities beyond the four named in the request (`design-harness-bindings` and `opencode-agent-preservation`) were added during specing: both main specs normatively assert the retiring JSONC config-entry mechanism (the design worker's canonical configuration definition and doctor's config-map name-presence validation), so leaving them unmodified would leave the main specs self-contradictory after the JSONC merge half is pruned; they are inseparable from the four named capabilities' surface.
- The author's personal model routing currently in `opencode.jsonc` must be re-applied once into the projected markdown files (e.g. `sai-3-implementation-worker.md`); the owned-copy lifecycle then never overwrites it, at the cost that reinstall blocks until the edits are reverted (see the trade-off note above).
- A user-customized worker agent file is expected to remain in doctor error (reported incompatible with its bundled source) for as long as the customization differs — this is accepted, mirroring the existing Claude behavior for edited managed agents, and guarded uninstall still preserves the edited file.
- `reasoningEffort` is not a property of the opencode schema at any level; it is absent from this repository and out of scope.
- No retirement rule is added for leftover `agent.sai-*-worker` JSONC keys: no released configuration contains them, and opencode deep-merges markdown agents with the JSONC per field (markdown wins declared keys, JSONC-only keys survive), so only the author's machine could carry a residual key and it is removed by hand.
- The `accessibility-worker-installation` main spec's phrase "the opencode projection SHALL include its task-dispatch metadata" is satisfied by the projected markdown agent file (the dispatchable definition); that spec needs no delta.
- `uninstall-flow.js` assetType naming (`claude-managed-agent`) is cosmetic and already harness-neutral in behavior; renaming it is optional.
