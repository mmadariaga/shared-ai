**Complexity**: medium (1 modified capability, 6 requirements, modifies existing code only, no new dependencies)

## Why

Selecting n agents in the post-setup model customizer prompts model+effort n times — 2n stacked navigable frames — because fake settings selection runs inside the per-agent traversal loop (`bin/agent-customization.js:89-95`). The agent-selection checklist exists precisely to multi-select; the user wants one selection applied to every picked agent.

## What Changes

- Hoist settings selection out of the per-agent traversal loop in `runPostSetupMenu` (`bin/agent-customization.js:89-95`): `selectSettings` runs exactly once for the confirmed checklist subset, and `createLocalOverride` still runs once per selected agent, all with the same collected model and effort choices
- Preserve the cancellation contract: a null result at the single model/effort selection — or `q`/Ctrl-C — aborts the run with zero agents configured, and the flow completes normally without hard-exiting (the configurator's non-exit contract is unchanged)
- Preserve the empty-subset contract: an empty checklist selection skips the settings selector entirely and completes without configuring any agent
- Add zero new runtime dependencies; the TTY-only gate and the adapter's three-operation boundary (enumeration, settings selection, local override creation) are unchanged — only the selection's invocation count changes from per-agent to per-run
- Amend `openspec/specs/agent-customization-menu/spec.md` via this change's delta: a new `Shared settings selection` requirement; the `TTY-only interaction`, `Complete OpenCode traversal`, `Complete Claude Code traversal`, `Fake settings selection`, and `Navigable cancellation aborts customization` requirements drop the per-agent selection surface

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `agent-customization-menu` (`openspec/specs/agent-customization-menu/spec.md`): fake settings selection is collected exactly once per customization run and applied to every selected agent; the traversal, TTY-gate, and cancellation requirements drop the per-agent selection surface

## Impact

- `M` `bin/agent-customization.js` — the per-agent loop (lines 89-95) keeps only `createLocalOverride`; `selectSettings` moves before the loop; the fake selector's prompt label becomes subset-scoped instead of per-agent
- `M` `test/agent-customization-menu.test.js` — per-agent `selectSettings` assertions convert to select-once + override-per-agent (lines 225-233, 345-360, 488-514); the null-at-selection cancellation test (lines 579-605) now lands the null on the single shared selection
- `M` `openspec/specs/agent-customization-menu/spec.md` — main spec amended at apply time by this change's delta

## Proposal Research Documentation

**Local files**:

- `bin/agent-customization.js:89-95` — the per-agent loop to restructure: `selectSettings` inside the loop, `createLocalOverride` per agent, null abort (lines 90-93)
- `bin/agent-customization.js:18-22,36-54` — `fakeSelectSettings` (per-agent prompt label) and `createAdapter`: the `selectSettings(agentName)` / `createLocalOverride(agentName, settings)` boundary and the effort→variant/effort tunable mapping
- `openspec/specs/agent-customization-menu/spec.md` — the capability spec this change amends: `Fake settings selection` ("collected exactly once per agent", lines 70-83), `Complete OpenCode traversal` (lines 56-61), `Complete Claude Code traversal` (lines 63-68), `Navigable cancellation aborts customization` (lines 115-137), `TTY-only interaction` ("any per-agent navigable selection", line 24)
- `test/agent-customization-menu.test.js:225-233,345-360,488-514` — per-agent `selectSettings` assertions to convert
- `test/agent-customization-menu.test.js:579-605` — the null-at-model-selection cancellation test, which now lands on the single shared selection
- `sai/install-manifest.json` — canonical agents-class projections; grounds the preserved 10-opencode / 7-claude fixture counts
- `openspec/changes/archive/2026-08-09-navigable-model-customizer/specs/agent-customization-menu/spec.md` — the prior delta that established the checklist and the per-agent cancellation wording
- `openspec/schemas/sai-workflow/templates/specs.md` — delta spec format (ADDED/MODIFIED/REMOVED/RENAMED)

**External URLs**: None — the change is entirely grounded in this repository.

## Additional Notes

- **Adapter API shape is preserved**: enumeration, settings selection, and local-override creation remain separate adapter operations; only the settings-selection invocation count changes (once per run). The exact subset-scoped prompt label for the fake selector is left to the implementation — the spec pins no new literal.
- **Trade-off accepted** (per the request): all selected agents share the same model and effort; per-agent granularity within one run is lost.
- **No glossary update**: the customization-flow vocabulary (agent-selection checklist, settings selector) is already established in the capability spec; no new domain term is introduced.
- **Verification**: `openspec validate --change shared-model-settings-selection` plus reading the delta against `bin/agent-customization.js` and the converted test assertions.
