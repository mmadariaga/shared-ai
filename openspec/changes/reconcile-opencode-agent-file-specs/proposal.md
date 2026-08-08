**Complexity**: high (5 modified capabilities; prose-only, no code)

## Why

Two main specs currently assert opposite doctor behavior: `openspec/specs/install-doctor-diagnostics/spec.md:9` requires doctor to validate worker presence in the opencode configuration agent map, while `openspec/specs/opencode-agent-preservation/spec.md:25` forbids exactly that. The shipped implementation follows the latter (`bin/doctor.js` compares projected file bytes and emits no config-agent record), so the surviving prose describes machinery that no longer exists and is the authority a future implementer would follow.

## What Changes

- Retire the configuration agent-map presence check and the registration-default obligations in `openspec/specs/install-doctor-diagnostics/spec.md` (the heaviest edit of the change): requirement "Doctor validates every binding-dispatched worker" (lines 8-21) and the registration-default scenarios (lines 26-32, 45-47) move to REMOVED Requirements; the census-coverage requirement (lines 23-36) is re-expressed over manifest-projected agent files, scoped to the guarantee doctor actually enforces — a record per projected file — because the binding-to-projection alignment is enforced by no runtime check; the desync case is recorded as an explicit open gap; the derivation-failure requirement (lines 38-47) is re-expressed over install-manifest load and expansion failures, matching `bin/doctor.js:367-412`
- Correct the purpose (line 5) and the config-flavored doctor regression scenario (lines 49-51) in `openspec/specs/opencode-agent-preservation/spec.md`; the re-expressed scenario covers all three projected-file outcomes (compatible, missing, incompatible) and the requirement statement names the projected-file outcomes alongside the surviving config guarantees, so the requirement body and its scenario describe the same surface; the file-validation and ownership requirements are already current and stay untouched
- Restate the contract-fetch parity claim in `openspec/specs/opencode-worker-system-prompt/spec.md` (lines 29-42) over projected files, frontmatter, body, and bundled source instead of doctor record fields and configuration projection, and define its purpose (line 4)
- Correct the purpose of `openspec/specs/opencode-agent-census/spec.md` (line 4), which still promises explicit registration defaults that its own requirement at line 9 forbids; this purpose-only change intentionally ships no delta file because the validator rejects purpose-only deltas, so the correction is carried in this proposal
- Correct the stale projection counts in `openspec/specs/agent-projection-strategy/spec.md` (purpose line 4, requirement line 10, scenario lines 12-16): the manifest declares 17 tunable-seed agent projections (7 Claude + 10 opencode) since `2026-08-08-relocate-generic-opencode-agents` added `explore`, `executor`, and `budget` as agent projections, while the spec still pins 14 (7 + 7); the count is factual drift — the relocation change added three projections without updating the spec — not a protected legacy-term mention, so the `owned-copy` retirement prose is preserved while the counts are corrected
- Change no implementation code — the defect is confined to specification prose

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `install-doctor-diagnostics` (`openspec/specs/install-doctor-diagnostics/spec.md`): the agent-map presence check and the registration-default obligations are retired; census coverage is re-expressed over projected agent files with the binding-to-projection alignment desync recorded as an explicit open gap; derivation-failure handling is re-expressed over install-manifest expansion
- `opencode-agent-preservation` (`openspec/specs/opencode-agent-preservation/spec.md`): the purpose is corrected, the requirement statement names the three projected-file outcomes, and the doctor regression scenario is re-expressed over projected files
- `opencode-worker-system-prompt` (`openspec/specs/opencode-worker-system-prompt/spec.md`): the purpose is defined and the contract-fetch parity requirement is restated over projected files, frontmatter, body, and bundled source
- `opencode-agent-census` (`openspec/specs/opencode-agent-census/spec.md`): the purpose is corrected to drop the retired explicit-registration-defaults promise; this purpose-only change intentionally ships no delta file (see Additional Notes)
- `agent-projection-strategy` (`openspec/specs/agent-projection-strategy/spec.md`): the stale 14-projection counts (7 Claude + 7 opencode) in purpose, requirement, and scenario are corrected to 17 (7 Claude + 10 opencode); the `owned-copy` retirement statements are preserved

### Reviewed and found unaffected

- `agent-sidecar-removal` (`openspec/specs/agent-sidecar-removal/spec.md`) — deliberately documents the retired sidecar machinery; out of scope, not stale
- `agent-tunable-ownership` (`openspec/specs/agent-tunable-ownership/spec.md`) — its legacy-term mentions are the intentional record of the retirement, and its projection counts are Claude-only and current (7); out of scope

### Deferred defects (follow-up change: `correct-agent-projection-counts`)

- `agent-install-diagnostics` (`openspec/specs/agent-install-diagnostics/spec.md:25`) — "all 7 Claude and all 7 opencode managed agent destinations": the opencode count is now 10 since `2026-08-08-relocate-generic-opencode-agents` added the three generic agent projections
- `managed-worker-registry` (`openspec/specs/managed-worker-registry/spec.md:33,40,44`) — "the 14 agent projections", "the 14 agent rules", and "the seven opencode tunable-seed projections": the manifest declares 17 tunable-seed agent projections (7 Claude + 10 opencode)

These carry the identical factual-count defect class this change corrects in `agent-projection-strategy`; they are deferred rather than widened into this change, and the named follow-up change owns them.

## Impact

**Spec prose only — no code, manifest, agent, or test files change:**

- `M` `openspec/specs/install-doctor-diagnostics/spec.md` — purpose corrected; two requirements re-expressed (with the alignment desync recorded as an open gap); four requirement entries retired into REMOVED Requirements
- `M` `openspec/specs/opencode-agent-preservation/spec.md` — purpose corrected (line 5); requirement statement and doctor regression scenario re-expressed over projected files (lines 42-51)
- `M` `openspec/specs/opencode-worker-system-prompt/spec.md` — purpose corrected (line 4); contract-fetch parity requirement restated (lines 29-42)
- `M` `openspec/specs/opencode-agent-census/spec.md` — purpose corrected (line 4); no delta file
- `M` `openspec/specs/agent-projection-strategy/spec.md` — stale 14-projection counts corrected to 17 in purpose, requirement, and scenario (lines 4, 10, 12-16)

## Proposal Research Documentation

**Local files**:

- `openspec/specs/install-doctor-diagnostics/spec.md:8-47` — the three obsolete requirements; the heaviest edit of the change
- `openspec/specs/opencode-agent-preservation/spec.md:5,49-51` — stale purpose and the config-flavored doctor regression scenario
- `openspec/specs/opencode-worker-system-prompt/spec.md:4,29-42` — purpose and the over-strong parity claim
- `openspec/specs/opencode-agent-census/spec.md:4,9` — purpose contradicted by its own requirement
- `openspec/specs/agent-projection-strategy/spec.md:4,10,12-16` — stale 14-projection counts (7 Claude + 7 opencode); the manifest declares 17, because the relocation change added the three generic-agent projections without updating the spec
- `openspec/changes/archive/2026-08-08-relocate-generic-opencode-agents/specs/opencode-generic-agent-files/spec.md:29-36` — the three generic-agent projections that raised the opencode agent count from 7 to 10 without updating `agent-projection-strategy`
- `bin/doctor.js:314-317,367-412` — `managedBytesMatch` and `managedOpencodeAgentRecords`, the authoritative shipped behavior the specs must match; confirms doctor never parses the opencode configuration (the only config read is `openspec/config.yaml` at `bin/doctor.js:100-106`)
- `bin/install-flow.js:282-304` — `validateOpencodeWorkerBindings`, the live binding-derived install-time roster validation: validates binding files only, with no manifest cross-check (grounds the recorded open gap: a binding without a projection is never detected at runtime)
- `test/doctor-opencode-agent-preservation-step-2.test.js:113-214` — doctor regression suite: file-based roster parity, customized/missing file records, and config-independence (absent, unparsable, non-object-root, malformed-agent-map configs all keep doctor green)
- `sai/install-manifest.json:36-45` — the ten opencode `tunable-seed` agent projections (seven workers + `explore`, `executor`, `budget`) that doctor covers
- `sai/orchestration/workers/bindings/opencode/` — the seven binding files whose dispatched workers the projections must cover
- `openspec/changes/archive/2026-08-07-agent-projection-seed-on-create/` — the change that introduced tunable-seed and retired owned-copy; its deltas show the current live text of the four specs was not reconciled against doctor
- `openspec/specs/agent-sidecar-removal/spec.md` — deliberately documents the retired sidecar machinery; out of scope, not stale
- `openspec/schemas/sai-workflow/templates/specs.md` — delta spec format
- `openspec/specs/opencode-config-install/spec.md:34` — the config merge covers only the SAI external-directory permission; no agent keys

**External URLs**: None — the change is entirely grounded in this repository.

## Additional Notes

- **Purpose corrections are apply-time main-spec edits, and each must be an individually-checkable task item.** `openspec archive` / the sync flow does not propagate a delta `## Purpose` section onto an existing main spec (it warns and moves on), and the validator rejects a delta file that carries only a Purpose section ("No delta sections found"), so `opencode-agent-census` intentionally ships no delta file — its purpose change is represented only here, and validation output showing no delta for it is expected, not a defect. The four corrected purpose lines are carried verbatim by this note (three of them also by their delta's `## Purpose` section, which the parser tolerates); the implementation phase MUST expand each of the four rewrites into its own individually-checkable task item in `implementation.md` (one per main spec), so each correction is a verifiable step rather than ambient prose:
  - `openspec/specs/install-doctor-diagnostics/spec.md:4` — from "TBD: Define install and doctor diagnostics for the complete binding-derived opencode worker census." to "Define doctor diagnostics over the complete manifest-projected opencode agent census: every manifest-projected opencode agent file receives a doctor record — missing, incompatible, or compatible — so that no projected worker is silently absent from the doctor report, with the installer's binding-derived roster validation as the install-time counterpart."
  - `openspec/specs/opencode-agent-preservation/spec.md:5` — from "Define name-based ownership and default bootstrapping for installer-provisioned opencode agents." to "Define file-based ownership for installer-provisioned opencode agents — the installer never writes configuration agent keys, and doctor and uninstall identify managed agent files by body-and-non-tunable-frontmatter identity under the tunable-seed lifecycle."
  - `openspec/specs/opencode-worker-system-prompt/spec.md:4` — from "TBD: Define explicit root-aware contract system prompts for managed opencode workers." to "Define the literal root-aware contract fetch that every projected opencode worker agent file SHALL carry in its body — `Fetch @sai/orchestration/workers/<worker-name>.md and follow it exactly.` — resolved project-local before user-global and preserved across projection, install, and doctor validation."
  - `openspec/specs/opencode-agent-census/spec.md:4` — from "TBD: Define the binding-derived census and explicit registration defaults for managed opencode agents." to "Define the binding-derived roster of managed opencode workers and its install-time validation as the sole source of managed opencode worker membership."
- **Census coverage is re-expressed, not deleted, and scoped to what the shipped doctor actually guarantees**: doctor SHALL emit a record for every manifest-projected opencode agent file (`bin/doctor.js:367-412`), which is the guarantee that `opencode-agent-preservation`'s file-validation requirement alone would not carry. "Every binding-dispatched worker is visible to doctor" holds exactly while the manifest's projection set stays aligned with the binding-derived roster; that alignment is not enforced at runtime — doctor reads only the manifest, and `validateOpencodeWorkerBindings` checks bindings only (`bin/install-flow.js:282-304`) — so the desync case is an explicit open gap, recorded in the delta's scenario "A binding without a projection is invisible to doctor". Design.md SHOULD carry it as an Open Question: installer roster validation cross-checking the projection set, with tests. (This scoping was prompted by review feedback that the first draft asserted a guarantee its own scenario disproved.)
- **`agent-projection-strategy` was added to scope during review**: the spec's "14 projections (7 + 7)" count is a factual drift — `2026-08-08-relocate-generic-opencode-agents` added `explore`, `executor`, and `budget` as agent projections (manifest now 17: 7 Claude + 10 opencode, `sai/install-manifest.json:29-45`) without updating the spec — not a legacy-term retirement mention. The original non-goal protected only the intentional retirement record; the count correction preserves all `owned-copy` retirement prose.
- **Deferred defects are listed in the Capabilities section**: `agent-install-diagnostics` and `managed-worker-registry` carry the identical factual-count drift class this change corrects in `agent-projection-strategy` — a false count of a MUST-constrained set is a factual defect, not a protected retirement record. They are deferred rather than widened into this change, and the named follow-up change `correct-agent-projection-counts` owns them.
- **Registration-default obligations move to REMOVED Requirements** rather than being rewritten, because explicit registration defaults have no successor concept to preserve; the REMOVED entries keep the retirement trail auditable.
- **The "Existing opencode agent definitions are user-owned" requirement is kept untouched** — its no-agent-key-write guarantee still protects user configurations that carry legacy keys; only the config-flavored doctor regression scenario is re-expressed.
- **Contingency check result:** doctor does cover every binding-dispatched worker — the manifest's ten opencode `tunable-seed` agent projections (`sai/install-manifest.json:36-45`) include all seven workers the bindings dispatch, so no code fix had to be split out; the alignment desync is recorded as an open gap instead (see the census-coverage note).
- **No glossary update:** the existing `Managed Worker` entry already describes tunable-frontmatter ownership and needs no change; no new domain term is introduced.
- **Verification:** the change ships no test delta; correctness is verified by `openspec validate` and by reading the specs against `bin/doctor.js:367-412`, `bin/install-flow.js:282-304`, and `test/doctor-opencode-agent-preservation-step-2.test.js:113-214`.
- **Trade-off accepted:** REMOVED Requirements sections lengthen the specs in exchange for an auditable retirement trail.
