**Complexity**: medium (8 files, 2 new capabilities)

## Why

The four SAI documentation surfaces — GLOSSARY.md, SAI_LEARNINGS.md, the ADR index, and the DDR index — are already single-sourced and project-agnostic, and every sai-* command already fetches the canonical format file it needs. The uncovered audience is the ambient agent: a session that is not running a SAI command, which edits GLOSSARY.md without the format, writes an ADR without the index convention, or never learns SAI_LEARNINGS.md exists. This change installs a project-agnostic orientation index at the harness root that points that audience at each surface's canonical format file.

## What Changes

- Adds `sai/SAI_AGENTS.md` — a project-agnostic orientation index with one entry per SAI documentation surface (canonical location, purpose, writer, and a resolver-free relative pointer to the canonical format file), conditional-presence wording, no restated normative rules, and no harness named inside the file.
- Adds a `root` destination class to the installer's destination-class resolution, resolving to the harness root — a one-line sibling entry to `config` that keeps `config` meaning configuration.
- Adds an `sai-agents-index` projection to `sai/install-manifest.json` that installs the file at the harness root (`SAI_AGENTS.md`) on both harnesses with `strategy: copy`, `recursive: false`, `ownership: managed`, `drift: content` — inheriting doctor missing-file detection, drift detection, and uninstall cleanup with no installer code beyond the destination-class resolution.
- Adds the new file and projection to the AGENTS.md and README.md structure tables.
- Adds `test/sai-agents-index-document.test.js` — a content test pinning the indexed surface set and the absence of harness names in the orientation index.

## Capabilities

### New Capabilities
- `sai-agents-index-document`: the SAI_AGENTS.md content contract — one entry per SAI documentation surface (GLOSSARY.md, SAI_LEARNINGS.md, ADR index, DDR index) giving canonical location, purpose, writer, and a resolver-free relative pointer to the canonical format file; conditional-presence wording; no normative rule restated (a one-sentence purpose at most, never structure or append/supersede behavior); no harness named inside the file.
- `sai-agents-install-projection`: the manifest projection and destination-class resolution that installs the orientation index at the harness root on both harnesses, inheriting doctor missing-file detection, drift detection, and uninstall cleanup.

### Modified Capabilities
<!-- none -->

## Impact

- `sai/SAI_AGENTS.md` (new) — canonical orientation-index source
- `sai/install-manifest.json` — new `sai-agents-index` projection
- `bin/install-flow.js` — `root` class added to the `destinationRoots()` map
- `bin/uninstall-flow.js` — `root` class added to both inline destination-class maps
- `bin/doctor.js` — `root` class added to both inline destination-class maps
- `AGENTS.md` — structure table and Installation section gain the file and projection
- `README.md` — structure table gains the file and projection
- `test/sai-agents-index-document.test.js` (new) — content test pinning the indexed surface set and harness neutrality

Deployment effect: the next install writes `SAI_AGENTS.md` to each installed harness root (`~/.claude/` and `~/.config/opencode/`). No harness auto-loads the file; reach depends on a manual pointer in each consumer project's own agent instructions, which is outside this change.

## Proposal Research Documentation

**Local files**: bin/install-flow.js (`destinationRoots()` at :522-524, `installProjection` at :526-530, install entrypoints at :600-615); bin/doctor.js (`inventoryHarness` expectedEntries and sweep roots at :178-200, managed worker/agent records at :326-332 and :373-379); bin/uninstall-flow.js (`manifestEntries` at :21-66, inline destination-class maps at :70 and :76); bin/install-manifest.js (manifest validation at :65-66, `expandRule` destination lookup at :139-140); sai/install-manifest.json (44 projections; `opencode-config` root-resolving entry at line 46); sai/policies/glossary-format.md; sai/policies/sai-learnings-format.md; sai/instructions/implement.md (:99-100 ADR/DDR index maintenance); sai/instructions/_templates/adr-index.md; test/index-template-parity.test.js; AGENTS.md (structure table, Installation section); README.md (installation, uninstall, doctor sections); GLOSSARY.md.

**External URLs**: none

## Additional Notes

- The destination-class map is duplicated across five sites: `destinationRoots()` in bin/install-flow.js:523, two inline literals in bin/uninstall-flow.js (:70, :76), and two in bin/doctor.js (:326-332, :373-379). All five must gain `root` resolving to the harness root; the manifest loader throws `No destination root for class root on {harness}` at expansion when a class is unknown (bin/install-manifest.js:139-140).
- The doctor unexpected-file sweep (bin/doctor.js:186-190) scans only `commands/`, `sai/`, `skills/`, and `agents/` under the harness root, so a root-level file produces no false positives. The missing-file check derives from the same manifest `expectedEntries`, so the new projection gains absence detection for free.
- Uninstall derives its deletion set from the same manifest expansions, so the installed file is removed on uninstall like every other managed projection — no special case needed.
- The four surfaces and their writers: GLOSSARY.md (spec-phase bootstrap/append, planning-phase appends) ← sai/policies/glossary-format.md; SAI_LEARNINGS.md (sai-4-apply Learnings Promotion Pass) ← sai/policies/sai-learnings-format.md; ADR index (sai-3-implement Step 3 index maintenance) ← sai/instructions/_templates/adr-index.md; DDR index (sai-3-implement Step 3) ← sai/instructions/_templates/ddr-index.md. implementation.md is deliberately not indexed: it is a per-change artifact under openspec/changes/{name}/, owned end-to-end by sai-3-implement and sai-4-apply, not a durable project-level surface an ambient agent encounters or mismaintains.
- test/index-template-parity.test.js pins parity between the adr-index and ddr-index templates — a pair-parity pattern that does not apply to the single universal orientation index. The document capability is machine-verified by the new content test (surface-set pin + no-harness-name assertion); the manifest-driven install/doctor/uninstall tests cover the projection surface.
- sai/ itself is never recursively projected — every manifest projection from sai/ targets a specific subtree (commands, instructions, policies, orchestration). sai/SAI_AGENTS.md is deliberately a loose file outside all of them, installed by its own dedicated root-class projection.
- Format pointers in the index are installed-relative: from the harness root, `sai/policies/glossary-format.md` resolves, while the same strings do not resolve from the repository source path `sai/SAI_AGENTS.md` (where the relative path would be `policies/...`). This dangling-at-source state is expected — the source copy is not the resolution context — and the content test resolves pointers against a simulated install layout, never its own directory.
- Glossary terms appended during this phase: **Ambient Agent**, **Destination Class**, **Orientation Index**.
