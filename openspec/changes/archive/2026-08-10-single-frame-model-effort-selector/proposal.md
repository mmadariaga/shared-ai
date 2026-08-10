**Complexity**: medium (1 modified capability, 2 requirements, 3 file paths, no breaking change)

## Why

After `shared-model-settings-selection` hoisted settings selection out of the per-agent loop, model+effort selection still spans two stacked navigable frames per customization run — the model prompt renders one frame, then the effort prompt renders a second (`bin/agent-customization.js:18-22`). The user wants one selection surface: a single navigable frame whose options each carry a model together with an effort, collapsing the last two frames into one.

## What Changes

- Replace the two sequential `promptChoice` calls in `fakeSelectSettings` (`bin/agent-customization.js:18-22`) with a single `promptChoice` invocation whose option list combines every placeholder model with every placeholder effort; the one confirmed entry resolves to the `{model, effort}` settings object. The exact entry-label format is left to the implementation — the spec pins no new literal
- The single-frame selector still runs exactly once per customization run for the whole checklist-confirmed subset (the `Shared settings selection` select-once and apply-to-all contract is unchanged), and the effort→`variant`/`effort` tunable mapping in `createAdapter` is reused unchanged
- Preserve the cancellation contract: `q`/Ctrl-C or a null result at the single combined frame aborts the run with zero agents configured, and the flow completes normally without hard-exiting (the configurator's non-exit contract is unchanged)
- Preserve the empty-subset contract: an empty checklist confirmation skips the selector entirely and completes without configuring any agent
- Add zero new runtime dependencies; the TTY-only gate and the adapter's three-operation boundary (enumeration, settings selection, local-override creation) are unchanged — only the selector's frame count changes from two per run to one per run
- Amend `openspec/specs/agent-customization-menu/spec.md` via this change's delta: the `Fake settings selection` requirement collects both choices through exactly one navigable single-select frame; the `Navigable cancellation aborts customization` requirement anchors its settings surface on the single combined frame

No **BREAKING** changes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `agent-customization-menu` (`openspec/specs/agent-customization-menu/spec.md`): the fake settings selector collects the placeholder model and effort choices through exactly one navigable single-select frame per run instead of two stacked frames; the cancellation requirement's settings surface becomes the single combined frame

## Impact

- `M` `bin/agent-customization.js` — `fakeSelectSettings` (lines 18-22) collapses its two `promptChoice` calls into one combined-frame call and parses the confirmed entry into `{model, effort}`; nothing else in `runPostSetupMenu` changes
- `M` `test/agent-customization-menu.test.js` — the two-prompt assertions convert to one-combined-frame assertions: `fakeSelectSettings asks model options first then effort options` (lines 307-320), `adapter selectSettings drives exactly two prompts` (lines 322-336), the per-agent prompt-consumption loop (lines 338-366), the traversal answer stream (lines 400-438), and the null-at-selection cancellation prompt count (lines 585-611)
- `M` `openspec/specs/agent-customization-menu/spec.md` — main spec amended at apply time by this change's delta

## Proposal Research Documentation

**Local files**:

- `bin/agent-customization.js:18-22,64-99` — `fakeSelectSettings`'s two sequential `promptChoice` calls (the two stacked frames to collapse) and `runPostSetupMenu`'s select-once flow
- `openspec/specs/agent-customization-menu/spec.md` — the main spec this change amends: `Fake settings selection` ("collects BOTH a placeholder model choice and a placeholder effort choice through navigable single-select lists", lines 99-113) and `Navigable cancellation aborts customization` ("the model or effort selection", lines 144-166)
- `test/agent-customization-menu.test.js:307-336` — the two-prompt `fakeSelectSettings`/`selectSettings` assertions to convert; lines 585-611 — the null-at-model-selection cancellation test whose prompt count lands on the single combined frame
- `test/install-flow-navigator.test.js:227-232` — the navigator engine's frame semantics (one rendered selection surface per keypress session), grounding "frame" as one navigable selection surface
- `openspec/changes/archive/2026-08-10-shared-model-settings-selection/proposal.md` — the prior slice that reduced 2n frames to 2 and established the select-once contract this change builds on
- `openspec/changes/archive/2026-08-10-shared-model-settings-selection/design.md:71,122` — "2n stacked navigable frames become 2"; the manual-verification step pins "2 navigable frames total"
- `openspec/schemas/sai-workflow/templates/specs.md` — delta spec format (ADDED/MODIFIED/REMOVED/RENAMED)

**External URLs**: None — the change is entirely grounded in this repository.

## Additional Notes

- **Frame-count progression**: `navigable-model-customizer` introduced per-agent model+effort prompting (2n frames); `shared-model-settings-selection` hoisted selection out of the loop (2 frames); this change collapses the last two frames into one.
- **Combined-entry encoding**: the spec pins the contract (one frame, one confirmation, both values collected) and leaves the exact entry-label format to the implementation — consistent with the prior slice's "the spec pins no new literal" convention. The natural shape is the Cartesian product of the placeholder model options and effort options, expected model-major (all effort entries for the first model, then all for the second), matching today's model-first-then-effort interaction order; ordering is implementation detail, not pinned.
- **Adapter API shape preserved**: enumeration, settings selection, and local-override creation remain separate adapter operations; `selectSettings` keeps returning `{model, effort}` — only the selector's internal frame count changes (two → one).
- **No glossary update**: the customization-flow vocabulary (agent-selection checklist, settings selector) is already established in the capability spec; no new domain term is introduced.
- **No new ADR proposed**: the change is a small, contained UI restructure whose behavior is pinned by the delta spec; no decision meets the ADR/DDR criteria.
- **Verification**: `openspec validate --change single-frame-model-effort-selector` plus reading the delta against `bin/agent-customization.js` and the converted test assertions.
