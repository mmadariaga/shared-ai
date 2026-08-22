**Complexity**: high (2 modified capabilities, 7 delta requirements, more than 8 affected paths, no new dependency)

## Why

The per-harness idea-list-render binding is install-time harness glue, like `boot.md`, but it is currently filed under the routed-worker binding tree even though it is not a worker binding. Relocating its source and installed destination together removes the misleading ownership boundary, keeps wrapper fetches symmetric with boot adapters, and retires recognized historical copies of the old installed path without deleting user edits.

## What Changes

- Move the Claude and opencode idea-list-render sources from `sai/orchestration/workers/bindings/{claude,opencode}/` to `sai/adapters/{claude,opencode}/`.
- Project each harness's adapter to `adapters/{harness}/idea-list-render.md` in its matching installation.
- Add hash-gated retirement records for the superseded installed path `orchestration/workers/bindings/idea-list-render.md`, with the three exact raw-blob SHA-256 variants for each harness.
- Update the Claude and opencode `sai-explore` wrappers to fetch their harness-qualified adapter path.
- Rewrite repository tests and the explore specification scenario that encodes the old location; preserve worker-template sources, all seven routed worker destinations, and their 17 wrapper fetch lines.
- Preserve idea-list behavior, native-panel semantics, coordinator-only emission, lifecycle state, ownership markers, and cross-harness parity.

## Capabilities

### New Capabilities

- None

### Modified Capabilities

- `explore-idea-list`: the idea-list render binding is owned and loaded as a harness adapter rather than a routed worker binding; its behavior remains unchanged.
- `command-runner-layout`: the adapter-seam naming rule and deterministic projection rule are widened to include harness-specific non-worker adapter glue alongside each boot adapter.

## Impact

- `sai/adapters/claude/idea-list-render.md` — moved source.
- `sai/adapters/opencode/idea-list-render.md` — moved source.
- `sai/orchestration/workers/bindings/claude/idea-list-render.md` — removed source path.
- `sai/orchestration/workers/bindings/opencode/idea-list-render.md` — removed source path.
- `sai/install-manifest.json` — source/destination projection updates and two hash-gated retirement records.
- `commands/claude/sai-explore.md` — harness-qualified Fetch path.
- `commands/opencode/sai-explore.md` — harness-qualified Fetch path.
- `test/install-manifest.test.js`, `test/install-retirement-step-3.test.js` — remove inert old-location carve-outs and assert the new projection/retirement contract.
- `test/install-claude.test.js`, `test/install-opencode.test.js` — update harness source and destination assertions.
- `test/worker-matrix-projection.test.js` — keep idea-list rendering outside the routed worker matrix while asserting its adapter destination.
- `test/uninstall-enumeration.test.js`, `test/uninstall-execution.test.js` — assert retired old-path inventory and new adapter inventory.
- `test/doctor-fetch-resolution.test.js`, `test/doctor-harness-inventory.test.js` — update active fetch-resolution and harness-inventory assertions for the relocated adapter source and destination.
- `AGENTS.md` — update the source-tree layout descriptions from orchestration-owned idea-list glue to adapter-owned glue.

No application dependency is introduced. The installer, doctor, uninstall, collision, and drift safeguards continue to derive from the manifest. The old path is removed only when its bytes match a recognized managed hash; an edited or unknown copy is preserved.

## Proposal Research Documentation

**Local files**:
- `sai/install-manifest.json:345-372,510-537,1086-1102` — adapter projection pattern, current render rows, and retirement record shape.
- `sai/adapters/claude/boot.md`, `sai/adapters/opencode/boot.md` — harness adapter seam.
- `sai/orchestration/workers/bindings/claude/idea-list-render.md`, `sai/orchestration/workers/bindings/opencode/idea-list-render.md` — current harness-specific render bindings.
- `commands/claude/sai-explore.md`, `commands/opencode/sai-explore.md` — wrapper Fetch paths.
- `test/install-manifest.test.js`, `test/install-retirement-step-3.test.js`, `test/install-claude.test.js`, `test/install-opencode.test.js`, `test/worker-matrix-projection.test.js`, `test/uninstall-enumeration.test.js`, `test/uninstall-execution.test.js` — projection and retirement invariants.
- `openspec/specs/explore-idea-list/spec.md`, `openspec/specs/command-runner-layout/spec.md`, `openspec/specs/neutral-binding-destination/spec.md`, `openspec/specs/orchestration-source-layout/spec.md` — governing capability contracts. The command-runner layout currently confines harness-specific naming to boot paths and its carve-out covers only the old worker-binding tree and managed agents, so this change must widen that requirement. The neutral-binding-destination requirement covers only the seven routed worker filenames, and orchestration-source-layout:46 governs canonical routed-worker bindings; the new binding is explicitly non-worker, so neither requires a delta for this file's canonical ownership.
- `docs/adr/0101-exact-git-blob-corpus-for-binding-retirements.md`, `docs/ddr/0123b-retirement-records-cover-every-historical-content-variant.md` — retirement hash rules.
- `AGENTS.md:39-42,76-79` — repository layout documentation.
- `GLOSSARY.md` — existing terms including Harness Boot Adapter, Idea Progress List, Fetch Namespace, and Worker Matrix.

**External URLs**: None.

## Additional Notes

- Retirement hashes are raw Git-blob content SHA-256 digests with no line-ending normalization. Claude: `238b0fd7ef14b3f155e4bee008be9883948ad9b17e8a9477e79f0d013e878f23`, `792d0614a8a724ef19364976195ba8f6f0d08e70bc4d5db68eee0343603f54b0`, `8376ebfd6f8c59709d65a6d79be0dfbf10baaeb6f282bd76442a302c26f30b37`. opencode: `af9f1b8915db80210f9595c1adf7568c695401ba059f03e408c99e6273856347`, `5d26dd5bb555d525c4e7658fc021cb70a0dcdf90f248d020c51b2409ddf9a348`, `74516e0219b92fc12be50b19d411af5031861ced9616e794630f32b1386a7dbf`.
- The six variants were correlated with shipped manifest revisions: the initial projection was introduced in `1497d8c`; later variants remained projected through revisions including `94be1a1f`.
- `sai/orchestration/workers/bindings/` remains because `worker-template.md` is intentionally unchanged. The 17 routed-worker Fetch lines remain byte-identical.
- The relocation is an install-path migration, but no public API or runtime behavior changes; it is not marked **BREAKING**.
