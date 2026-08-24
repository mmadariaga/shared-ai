**Complexity**: high (4 modified capabilities — rubric S1 ≥ 4; narrow mechanical rename, no breaking change)

## Why

Composition commands carry the `meta-` prefix in their internal identity (`meta-review`: directory `sai/commands/meta-review/`, routed `command_name: meta-review`) while keeping their historical user-facing token (`/sai-review`). `/sai-build` breaks that symmetry: its internal composition identity is still plain `build`, colliding conceptually with the numbered phase family and reading as a phase rather than a meta-composition.

## What Changes

- Rename the internal composition identity of the build command from `build` to `meta-build`, mirroring the existing `meta-review` naming criterion:
  - Move the whole cards directory with `git mv`: `sai/commands/build/` → `sai/commands/meta-build/` (no semantic content edits in that pass).
  - Set routed `command_name: meta-build` in `commands/claude/sai-build.md`, `commands/opencode/sai-build.md`, and the project-local override `.opencode/commands/sai-build.md`; retarget each bootstrap fetch to `@sai/commands/meta-build/command-bootstrap.md`.
  - Edit the routed-names line identically in both boot adapters (`sai/adapters/claude/boot.md`, `sai/adapters/opencode/boot.md`): list entry `build` → `meta-build` and card example `@sai/commands/build/coordinator.md` → `@sai/commands/meta-build/coordinator.md`, kept byte-identical across harnesses.
- Update internal self-references inside `sai/commands/meta-build/command-bootstrap.md` and `coordinator.md` if any name the old path; mentions of the `/sai-build` user token stay intact.
- Update every test and fixture referencing the old internal name/path without weakening assertions (~10 test files plus `fixtures/thin-command-wrappers-baseline.json`), so doctor, inventory, and the wrapper baseline verify against `meta-build`.
- Reflect the new internal name in docs (`AGENTS.md`, `README.md`, `GLOSSARY.md`) under harness universality.
- Not changed: the `/sai-build` user token, wrapper filenames (`sai-build.md`), descriptions, argument hints, behavior, artifacts, models, or phase order. ADRs (`docs/adr/*`) and `sai/install-manifest.json` are untouched (generic projections resolve the new path). No `sai-meta-build.md` file ever appears.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `sai-build-registration`: requirements pinning routed name `build`, envelope `command_name: build`, and card path `sai/commands/build/*` change those references to `meta-build`; registration semantics unchanged.
- `thin-wrappers`: the composition-wrapper-template requirement's build scenario changes the pinned bootstrap fetch path and envelope value to `meta-build`; wrapper shape unchanged.
- `orchestration-core`: chained-composition and behavior-preserving-extraction requirements referencing the build coordinator by routed name or `sai/commands/build/` path change those references; semantics untouched.
- `bounded-recovery-policy-home`: the recovery-role coordinator membership list changes the enumerated card path from `sai/commands/build/coordinator.md` to `sai/commands/meta-build/coordinator.md`; membership count and policy home unchanged.

## Impact

- **Cards**: `sai/commands/build/*` moved wholesale to `sai/commands/meta-build/*` via `git mv` (history preserved).
- **Wrappers**: `commands/claude/sai-build.md`, `commands/opencode/sai-build.md`, project-local `.opencode/commands/sai-build.md` (fetch path + `command_name` only).
- **Boot adapters**: one routed-names line per harness, edited byte-identically.
- **Tests/fixtures**: ~10 files under `test/` (coordinator paths, launcher mapping `'build'` → `'meta-build'`, doctor inventory/install parity, model-customization taxonomy, orchestration-source-layout fixture) plus `fixtures/thin-command-wrappers-baseline.json` (via the folder-mapping used by `test/command-launcher-card.test.js`).
- **Docs**: `AGENTS.md`, `README.md`, `GLOSSARY.md` (**Build Command** entry gains the internal-identity note; *Avoid* aliases unchanged).
- **Untouched by design**: `docs/adr/*` (immutable historical record; 2 files mention build), `sai/install-manifest.json` (generic recursive projections resolve the new directory), archived changes under `openspec/changes/archive/`.

## Proposal Research Documentation

**Local files**:

- `sai/adapters/claude/boot.md`, `sai/adapters/opencode/boot.md` (line 8 routed-names list + card example; verified byte-identical)
- `commands/claude/sai-build.md`, `commands/opencode/sai-build.md`, `.opencode/commands/sai-build.md` (envelope `command_name: build`; bootstrap fetch)
- `commands/claude/sai-review.md`, `commands/opencode/sai-review.md` (the mirrored `meta-review` pattern: dir + `command_name: meta-review`)
- `openspec/specs/sai-build-registration/spec.md` (5 requirements; 4 pin routed name/path)
- `openspec/specs/thin-wrappers/spec.md`, `openspec/specs/orchestration-core/spec.md`, `openspec/specs/bounded-recovery-policy-home/spec.md`
- `openspec/specs/sai-fast-track-flag/spec.md`, `openspec/specs/apply-routed-card-set/spec.md` (verified: no routed-name/path citations — only benign `/sai-build` tokens)
- `openspec/specs/sai-build-command/spec.md`, `openspec/specs/sai-command-naming/spec.md` (prose shorthand + token protection)
- `fixtures/thin-command-wrappers-baseline.json` + `test/command-launcher-card.test.js` (baseline reconciles wrapper-minus-bootstrap-call + bootstrap fetches; folder mapping drives path checks)
- Test inventory: `test/build-coordinator.test.js`, `test/doctor-fetch-resolution.test.js`, `test/doctor-harness-inventory.test.js`, `test/explore-pipeline-selector.test.js`, `test/install-claude.test.js`, `test/install-opencode.test.js`, `test/model-customization-menu.test.js`, `test/model-customization-taxonomy.test.js`, `test/orchestration-source-layout-step-2.test.js`
- `GLOSSARY.md` (Build Command term, lines 40–41, 341), `AGENTS.md`, `README.md`
- `sai/commands/build/coordinator.md`, `sai/commands/build/command-bootstrap.md`, `sai/commands/meta-review/*`

**External URLs**: None.

## Additional Notes

- **Handoff scope correction (evidence-based)**: the Ready-to-Propose block pinned spec deltas to six specs. Current sources show `sai-fast-track-flag` and `apply-routed-card-set` contain zero requirements citing the routed name or `sai/commands/build` path (only benign `/sai-build` tokens), so MODIFIED deltas there would be vacuous. Conversely, `sai-build-command` uses "build" extensively as natural-language shorthand bound to the surviving `/sai-build` token — no routed-name or path citation — so it also needs no delta. The validated modified-capability set is exactly the four listed above. Requirement semantics remain unchanged everywhere; only referenced names/paths move.
- **Fixture mechanics**: the wrapper baseline intentionally stores wrapper fetches minus the bootstrap-call directive plus the bootstrap file's own fetches; updating the folder mapping (`'build'` → `'meta-build'`) in `test/command-launcher-card.test.js` keeps the comparison exact.
- **Pre-existing naming asymmetry resolved by precedent**: `meta-review` keeps filename `sai-review.md` and token `/sai-review`; the same relationship applies here (`sai-build.md` / `/sai-build` ↔ `meta-build`).
- **Parity risk**: the boot-adapter routed-names line must remain byte-identical across both harness adapters after the edit; verify with a diff of that single line.
