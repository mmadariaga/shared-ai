**Complexity**: high (18 capabilities, BREAKING agent-block removal)

## Why

The three generic opencode agents (`explore`, `executor`, `budget`) are the last agents defined in configuration rather than as agent files. Their definitions live in the `agent` block of the shipped `configs/opencode.jsonc` (`configs/opencode.jsonc:24-40`) and are merged into existing user configs by the installer (`mergeOpencodeAgents`, `bin/install-flow.js:752-820`), while the seven opencode workers already moved to projected markdown agent files under the slice-0 `tunable-seed` strategy. The agent surface is split across two mechanisms and two install strategies, and the shipped comment invites users to tune the model — exactly the tunable ownership contract slice 0 established for agent files. With the file projection in place the config definitions are redundant, and a spike proves the agent file wins for declared keys, so a tuned config model is silently ignored once the file exists.

## What Changes

- **BREAKING** — Remove the `agent` block (`explore`, `executor`, `budget`) from `configs/opencode.jsonc`; the file keeps `$schema`, `subagent_depth`, and `permission` unchanged. No agent is defined in the shipped opencode config when this change lands.
- Add `agents/opencode/explore.md`, `agents/opencode/executor.md`, and `agents/opencode/budget.md` — managed agent files with `mode: subagent` and the placeholder low-cost model `opencode-go/deepseek-v4-flash`, projected under the existing `tunable-seed` strategy via three new manifest projections. The agent names are preserved exactly because the routed worker bindings authorize the `budget` and `explore` task targets by name.
- Narrow the installer's opencode-config path to the SAI external-directory permission concern: `mergeOpencodeAgents`/`copyOpencodeConfig` no longer insert or touch any agent key, the "Added opencode agent keys to …" line and the agent snippet in the parse-failure fallback print are removed, and the `OPENCODE_AGENT_KEYS` / `OPENCODE_PLACEHOLDER_MODEL` constants are retired with their consumers.
- Emit a non-fatal migration notice when the user's own config already carries `agent.{explore,executor,budget}`: the keys are now redundant (the projected agent file wins for declared keys, including `model`), the tuned model belongs in the agent file's `model` line, which the `tunable-seed` lifecycle preserves; the user's config is never edited.
- Realign documentation: `INSTALL.opencode.md` bash/PowerShell blocks, the model-resolution lines in the three opencode budget skills, `AGENTS.md`, and the ADR records (`docs/adr/0029-jsonc-parser-surgical-merge-for-opencode-agent-block.md` becomes historical; `docs/adr/0030-opencode-json-over-jsonc-merge-precedence.md` is recorded as superseded in respect of agents while its precedence continues to govern the permission merge).
- Modify the fifteen main capability specs that pin `agent.{explore,executor,budget}.model` resolution in `opencode.jsonc` or the agent-block merge behavior.

## Capabilities

### New Capabilities

- `opencode-generic-agent-files`: explore, executor, and budget shipped as managed agent files with the placeholder low-cost model, projected under the slice-0 `tunable-seed` strategy, with no agent defined in the shipped config.
- `opencode-agent-migration-notice`: installer guidance for installations that already carry `agent.{explore,executor,budget}` in their own config — names the redundant keys, states the file-wins precedence, points at the agent file as the tuning surface, and leaves the user's config untouched.
- `sai-install-documentation`: manual install instructions (`INSTALL.opencode.md`), skill documentation (the three opencode budget skills), repo documentation (`AGENTS.md`), and the config-merge ADR records realigned to the new location.

### Modified Capabilities

- `opencode-config-install`: the agent-key merge is retired; the merge targets only the SAI external-directory permission, keeping the surgical jsonc-parser behavior, the `opencode.json`-over-`opencode.jsonc` precedence, and the parse-failure fallback; the "Report which keys were added" and "Add-if-missing per agent key" requirements are removed; the ADR 0029/0030 records are updated.
- `opencode-config-message`: the parse-failure fallback message verifies the SAI permission instead of agent settings; the agent snippet and model comment no longer appear.
- `opencode-agent-preservation`: the "Missing opencode agents are bootstrapped with repository defaults" requirement is removed (no agent key is ever inserted); user-owned agent definitions remain untouched; the ADR 0077/0088 collision-policy statement changes from "merge covers the helper agents plus the permission" to "merge covers only the permission".
- `managed-worker-registry`: the canonical-sample requirement changes from "the three helper-agent keys remain unchanged" to "no agent key at all remains in the sample".
- `installer-config-guidance`: the census-projection and census-guidance requirements are removed (the agent map no longer exists; the agent files are the projection); the preservation-first merge requirement is restated as permission-only.
- `budget-subagent-platform-bindings`: the opencode binding resolves the model from the `budget` agent file's frontmatter, not `agent.budget.model`; the config-template entry requirement is removed.
- `opencode-budget-explorer-triggers`: the description-frontmatter format and the model-resolution scenario point at the agent file, not `agent.explore.model` in `opencode.jsonc`.
- `opencode-budget-executor-triggers`: same realignment for the executor skill.
- `opencode-budget-cost-model-docs`: the "Model resolution" bullets in all three cost-model sections describe the agent-file frontmatter mechanism.
- `apply`: the step-execution subagent's model resolution for opencode is the `budget` agent file's frontmatter.
- `npx-installer`: the existing-config branch prints permission guidance instead of manual instructions for the `agent` section.
- `install-command-overwrite`: the "copyOpencodeConfig agent-key merge notice" is replaced by the permission-merge messaging and the migration notice; the "Added opencode agent keys to …" line is retired.
- `install-distribution`: the `INSTALL.opencode.md` agent-block snippet requirement is replaced by the permission-only merge documentation; the obsolete `install-flow-opencode-config-snippet` requirement (which mandated a `"subagent"` block in the parse-failure print) is retired.
- `executor-opencode-skill`: the `opencode.jsonc agent entry` requirement (which mandated an `agent.executor` block in `opencode/opencode.jsonc`) is retired; the executor agent is now provisioned as the projected agent file `agents/opencode/executor.md`.
- `shared-ai-uninstall`: the "excluded targets are never touched" requirement is reformulated — its "leaving the merged agent keys intact" scenario wording pinned the retired agent-key merge; the re-added scenario states that config files remain excluded targets and any agent keys present are left intact since the installer never merges agent keys into the config.

### Reviewed and found unaffected

- `implementation-harness-bindings` — its external-directory permission contract (`openspec/specs/implementation-harness-bindings/spec.md:100`) is precisely the behavior that survives; the merge narrows to it unchanged.
- `install-uninstall-enumeration-parity`, `source-layout`, `docs-sync` — path names and enumeration contracts are unchanged; `configs/opencode.jsonc` still exists and is still the config source.
- The seven opencode worker agent files, their bindings, the `tunable-seed` strategy, and `GLOSSARY.md`'s **Managed Worker** term — none change; the generic agents are covered by the existing "helper agents" doc term.

## Impact

**Shipped config**:

- `M` `configs/opencode.jsonc` — `agent` block removed; `$schema`, `subagent_depth`, `permission` unchanged

**New source agents**:

- `A` `agents/opencode/explore.md`
- `A` `agents/opencode/executor.md`
- `A` `agents/opencode/budget.md`

**Installer**:

- `M` `sai/install-manifest.json` — three new `agents`-class projections (`strategy: tunable-seed`) for the generic agent files; the `opencode-config` merge-jsonc rule stays
- `M` `bin/install-flow.js` — `mergeOpencodeAgents` narrowed to the permission concern; `copyOpencodeConfig` drops the agent-key insertion and the "Added opencode agent keys to …" line and emits the migration notice; `printOpencodeConfigMessage` loses the agent snippet; `OPENCODE_AGENT_KEYS` and `OPENCODE_PLACEHOLDER_MODEL` retired

**Documentation**:

- `M` `INSTALL.opencode.md` — agent-block snippet in the bash/PowerShell paths removed; merge statement becomes permission-only; generic agent files documented under `~/.config/opencode/agents/`
- `M` `skills/opencode/budget-explorer/SKILL.md`, `skills/opencode/budget-executor/SKILL.md`, `skills/opencode/budget-subagent/SKILL.md` — model-resolution lines point at the agent-file frontmatter
- `M` `AGENTS.md` — opencode subagent model resolution no longer described via `opencode.jsonc`
- `M` `docs/adr/0029-jsonc-parser-surgical-merge-for-opencode-agent-block.md`, `docs/adr/0030-opencode-json-over-jsonc-merge-precedence.md`, `docs/adr/0000-INDEX.md` — ADR status records updated

**Specs and tests**:

- `A` eighteen delta spec files under `openspec/changes/relocate-generic-opencode-agents/specs/` (3 new + 15 modified capabilities)
- `M` the fifteen main specs listed under Modified Capabilities
- `M` `test/install-opencode.test.js` — agent-key merge and placeholder assertions replaced with permission-merge, migration-notice, and agent-file seed assertions (e.g. `AGENT_PLACEHOLDER` at `test/install-opencode.test.js:385`); `M` `test/install-manifest.test.js` — projection-count and strategy assertions for the three new rows

**Explicitly not touched** — the seven opencode and seven Claude worker agent files, the routed worker bindings under `sai/orchestration/workers/bindings/`, the `tunable-seed` strategy and its ownership contract, the SAI external-directory permission handling in the installer, the user's own `opencode.json`/`opencode.jsonc`, and `GLOSSARY.md`.

## Proposal Research Documentation

**Local files**:

- `configs/opencode.jsonc:24-40` — the agent block being removed
- `bin/install-flow.js:20-21` — `OPENCODE_AGENT_KEYS`, `OPENCODE_PLACEHOLDER_MODEL`
- `bin/install-flow.js:752-820` — `mergeOpencodeAgents` (agent-key insertion + `classifySaiPermission`)
- `bin/install-flow.js:822-852` — `copyOpencodeConfig` (copy-if-absent, json-over-jsonc, added-keys line)
- `bin/install-flow.js:620-640` — `printOpencodeConfigMessage` (agent snippet fallback)
- `sai/install-manifest.json:36-43` — the seven worker projections and the `opencode-config` merge-jsonc rule
- `INSTALL.opencode.md:81-114` — agent-file copy block and the hand-written agent block in the bash path
- `INSTALL.opencode.md:229` — the "configuration merge covers only the helper agents … and the external-directory permission" statement
- `skills/opencode/budget-explorer/SKILL.md:19`, `skills/opencode/budget-executor/SKILL.md:35`, `skills/opencode/budget-subagent/SKILL.md:39` — model-resolution via `agent.<keyword>.model`
- `sai/orchestration/workers/bindings/opencode/spec-worker.md:11` and the six sibling bindings — budget/explore target authorization by name
- `docs/adr/0029-jsonc-parser-surgical-merge-for-opencode-agent-block.md` and `docs/adr/0030-opencode-json-over-jsonc-merge-precedence.md` — the config-merge ADR records
- `openspec/specs/opencode-config-install/spec.md`, `opencode-config-message/spec.md`, `opencode-agent-preservation/spec.md`, `managed-worker-registry/spec.md:99-110`, `installer-config-guidance/spec.md`, `budget-subagent-platform-bindings/spec.md`, `opencode-budget-explorer-triggers/spec.md`, `opencode-budget-executor-triggers/spec.md`, `opencode-budget-cost-model-docs/spec.md`, `apply/spec.md:37-53`, `npx-installer/spec.md:121-131`, `install-command-overwrite/spec.md:21-43`, `install-distribution/spec.md:45-50`, `executor-opencode-skill/spec.md:21-30`, `shared-ai-uninstall/spec.md:128-141` — the main specs that pin the retired mechanism or the post-slice-0 wording that references it
- `openspec/changes/archive/2026-08-07-agent-projection-seed-on-create/proposal.md` and `specs/agent-projection-strategy/spec.md`, `specs/opencode-agent-preservation/spec.md` — the slice-0 dependency contract
- `openspec/changes/archive/2026-08-07-opencode-markdown-worker-agents/proposal.md` — the change that moved the workers to agent files and kept the JSONC merge for "subagent_depth, permission.external_directory, and the three helper agents"
- `openspec/changes/archive/2026-07-12-opencode-config-agent-merge/proposal.md` — the change that introduced the agent-key merge
- `openspec/specs/implementation-harness-bindings/spec.md:100` — the surviving permission contract

**External URLs**:

- `https://opencode.ai/docs/agents/` — consulted for the config-vs-file precedence spike (docs confirm the two definition paths and frontmatter `model` resolution but do not state the precedence explicitly)

## Additional Notes

- **Spike result (isolated `HOME` + `opencode debug agent`, 2026-08-07)**: with both an `agent.explore` config entry and a global `agents/explore.md` file present, the resolved agent takes `description`, `prompt`, and `model` from the **file**, while config-only keys (`tools`, `options`) survive. The precedence question is settled: the file wins for declared keys. The migration notice therefore warns (file wins, so a tuned config model is ignored) rather than being merely advisory. This matches the deep-merge claim in the archived `opencode-markdown-worker-agents` proposal.
- The three agent names are preserved exactly because the worker agent frontmatter (`permission.task: { explore: allow, budget: allow }`) and the routed opencode bindings authorize those targets by name; a rename would be a silent breakage.
- The seeded model in the three files is `opencode-go/deepseek-v4-flash` — the value of `OPENCODE_PLACEHOLDER_MODEL`, which is what the merge previously inserted. Installations that already carry the merged keys therefore see the same default model in the new files. The sample config's `glm-5.1` value is retired with the agent block.
- Trade-offs accepted: existing installations carry a definition in two places (config key + agent file) until the user removes the keys by hand, and the shipped placeholder model reaches new installations only (slice-0 trade-off).
- `mergeOpencodeAgents` is narrowed rather than deleted because it also verifies and inserts the `~/.config/opencode/sai/**` external-directory permission and emits its preservation messages; the function name may be kept or renamed as an implementation detail.
- `GLOSSARY.md` is unchanged: **Managed Worker** remains worker-specific (its slice-0 definition already describes tunable-frontmatter ownership), and the three generic agents are covered by the existing "helper agents" doc term used in `opencode-agent-preservation`.
