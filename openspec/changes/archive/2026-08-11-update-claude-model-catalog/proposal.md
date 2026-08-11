**Complexity**: medium (2 modified capabilities, no breaking change, 4 affected paths)

## Why

The static Claude Code settings catalog is stale relative to the current CLI model and effort selectors, and its consumer assumes every model has an effort list. Updating the catalog and supporting a model-only selection now keeps the TTY customizer aligned with the available Claude aliases while preserving the deliberate static-catalog boundary.

## What Changes

- Extend the static Claude Code catalog with `fable` and `haiku`, add `max` to the `opus` and `sonnet` effort sets, and represent `haiku` with no `efforts` array.
- Make Claude settings entry construction, selection, and catalog validation support both combined model/effort entries and model-only entries; preserve the combined-frame UX for effort-bearing models.
- Allow Claude local overrides to omit the top-level `effort` line when a model has no effort selector, while preserving existing local bodies and non-tunable frontmatter.
- Keep Claude discovery static and leave the OpenCode adapter and live-discovery path unchanged.
- Add coverage for the expanded catalog, model-only selection, validation, and effort-line omission.

## Capabilities

### New Capabilities

<!-- None. -->

### Modified Capabilities

- `agent-customization-menu`: expand Claude settings selection to include model-only catalog entries and forward an optional effort.
- `project-local-agent-overrides`: support Claude overrides whose selected model has no effort tunable, removing only an existing top-level effort line when necessary.

## Impact

- `bin/agent-customization.js`: static Claude catalog, combined-frame entry construction/validation/selection, and Claude frontmatter materialization.
- `test/agent-customization-menu.test.js`: catalog, selector, and persistence behavior coverage.
- `openspec/specs/agent-customization-menu/spec.md`: Claude settings and persistence contract delta.
- `openspec/specs/project-local-agent-overrides/spec.md`: optional Claude effort mapping and preservation contract delta.

No new dependency, API, global-agent, OpenCode, or live-discovery surface is introduced.

## Proposal Research Documentation

**Local files**: `bin/agent-customization.js:22-27,45-88,116-162,172-205,388-412`, `test/agent-customization-menu.test.js:354-410,1810-2109`, `openspec/specs/agent-customization-menu/spec.md:70-140`, `openspec/specs/project-local-agent-overrides/spec.md:19-58`, `openspec/schemas/sai-workflow/schema.yaml:41-66`, `GLOSSARY.md:97-107`, `openspec/changes/archive/2026-08-10-persist-project-agent-overrides/specs/agent-customization-menu/spec.md`, `openspec/changes/archive/2026-08-10-persist-project-agent-overrides/specs/project-local-agent-overrides/spec.md`

**External URLs**: None.

## Additional Notes

- Effort-bearing Claude entries remain displayed as `<model> | <effort>` and return both keys. A no-effort entry is displayed as its model alone and returns only `{ model }`.
- The catalog remains static because the Claude CLI exposes no mechanizable model listing in this environment; the Anthropic Models API is not an alias-compatible or subscription-compatible source for this selector.
- `effort` is a Claude tunable. When it is absent from the selected settings, materialization removes a top-level effort line from the cloned or existing local file without changing other frontmatter or body bytes.
