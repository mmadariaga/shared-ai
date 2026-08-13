**Complexity**: high (1 capability renamed, 13 requirements, 11 affected paths, no breaking change)

## Why

The post-setup customization flow already tunes worker agents end-to-end (menu → harness → checklist → settings → project-local override), and every shipped harness command already carries the same tunable frontmatter keys the flow patches (`model` plus `effort` for Claude Code, `model` plus `variant` for opencode) — yet commands are unreachable from the menu because enumeration is hardcoded to the manifest's agents class. Project-local command precedence is already documented and behaves exactly like the agent case, so the persistence mechanism transfers without invention.

## What Changes

- The `agent-customization-menu` capability is renamed to `model-customization-menu` and restated around model selection applied to both workers and commands; the retired spec moves to `openspec/specs/_archived/agent-customization-menu/spec.md`.
- A dedicated scope screen after harness selection offers `Workers`, `Commands`, or `Both`, keeping single-family runs on bare checklist labels.
- The target checklist enumerates commands from the package sources declared by the manifest's commands-class projections (`commands/claude/*.md`, `commands/opencode/*.md`) rather than from the installed global directory; in `Both` mode rows carry a type prefix — `worker: <name>` / `command: <name>` — that doubles as the visual grouping and as the unique key separating the OpenCode `budget` worker from the `budget` command.
- Command overrides write to `.claude/commands/<command>.md` / `.opencode/commands/<command>.md` beside the existing agent overrides, using the same-named installed global command as the source when the project-local destination is absent and patching an existing project-local file in place.
- `runNavigator`, `promptChecklist`, `promptSelect`, `patchFrontmatter`, `atomicReplace`, `CLAUDE_SETTINGS_CATALOG`, and the OpenCode provider/model/variant selection are reused unchanged; the manifest's projections are not modified, only the way they are read for enumeration.
- The implementation module `bin/agent-customization.js` and its main test file `test/agent-customization-menu.test.js` are renamed to `bin/model-customization.js` and `test/model-customization-menu.test.js` along with the capability, and the `require` sites in `bin/setup.js`, `test/navigator-back-navigation.test.js`, `test/canonical-opencode-agent-behavior.test.js`, and the renamed test file itself are updated to the new module path. `test/navigator-back-navigation.test.js` and `test/canonical-opencode-agent-behavior.test.js` keep their names (they are not capability-named) and are edited in place.

## Capabilities

### New Capabilities

- `model-customization-menu`: TTY-only post-setup customization menu and isolated harness adapters that apply a selected model and optional effort/variant to project-local worker and command overrides, with an explicit scope screen and per-family checklist labeling. This is the renamed `agent-customization-menu` capability.

### Modified Capabilities

- None. The sibling `opencode-settings-selection` capability stays as it is.

## Impact

- `bin/agent-customization.js` → `bin/model-customization.js`
- `bin/setup.js`
- `openspec/specs/agent-customization-menu/spec.md` → `openspec/specs/_archived/agent-customization-menu/spec.md`
- `openspec/specs/model-customization-menu/spec.md` (new)
- `test/agent-customization-menu.test.js` → `test/model-customization-menu.test.js`
- `test/navigator-back-navigation.test.js`
- `test/canonical-opencode-agent-behavior.test.js`
- `GLOSSARY.md`

Entries without an arrow are edited in place and keep their current names; arrow entries list a move and count as two affected paths — the source and the destination — so the eight bullets above cover eleven literal paths.

## Proposal Research Documentation

**Local files**: `bin/agent-customization.js`; `bin/install-flow.js`; `sai/install-manifest.json`; `commands/claude/sai-2-design.md`; `commands/opencode/sai-2-design.md`; `commands/claude/budget.md`; `commands/opencode/budget.md`; `INSTALL.opencode.md`; `INSTALL.claude.md`; `docs/adr/0119-shared-raw-readline-navigator-engine-in-install-flow.md`; `openspec/specs/agent-customization-menu/spec.md`; `openspec/specs/opencode-settings-selection/spec.md`; `openspec/specs/project-local-agent-overrides/spec.md`; `openspec/specs/copilot-capability-archival/spec.md`; `openspec/specs/archive-completed-specs/spec.md`; `openspec/changes/archive/2026-08-11-archive-copilot-capability-specs/proposal.md`; `test/agent-customization-menu.test.js`; `test/navigator-back-navigation.test.js`; `test/canonical-opencode-agent-behavior.test.js`; `GLOSSARY.md`.

**External URLs**: None.

## Additional Notes

- The manifest's commands projections (`claude-commands`, `opencode-commands`) are directory copies: `source: commands/{harness}`, `include: ["*.md"]`, `destination.class: "commands"`. Enumeration reads the package sources they declare, mirroring how the agent path derives names from the projections while differing per destination class.
- Both harnesses ship exactly 16 commands; opencode ships exactly 10 workers (7 routed workers plus `explore`, `executor`, `budget`) and claude ships exactly 7 workers. The opencode `budget` name collides between worker and command; the `Both`-mode type prefix is what separates them.
- `commands/claude/sai-2-design.md` declares `model: claude-opus-4-8`, which is absent from the settings catalog (`opus`/`sonnet`/`fable`/`haiku`); customizing it silently normalizes the model to a selected catalog value.
- `commands/claude/budget.md` and `commands/opencode/budget.md` declare only `description` in their frontmatter; customizing them pins a model (and effort/variant) where today the command inherits the session's.
- `opencode-settings-selection` (line 47 and its scenario at lines 65-67) describes the per-target local-override operation as "defined in `agent-customization-menu`"; that descriptive reference is accepted staleness per the explicit constraint that the sibling capability stays as it is. The reference is descriptive provenance, not a normative rule: it names where the override operation is defined, that definition is preserved verbatim under `openspec/specs/_archived/agent-customization-menu/spec.md`, and the operative rules are re-stated normatively in `model-customization-menu` (Persistent local override) and `project-local-agent-overrides`, so no behavior depends on resolving the old name.
- The retirement move of the old capability spec follows the `_archived/` convention established by `archive-completed-specs` and exercised by `copilot-capability-archival`; existing `_archived/` content is not touched.
- Existing project-local override files are the source that is read and patched, so re-running customization preserves earlier body edits — the pre-existing agent behavior, extended to commands.
- The spec-phase GLOSSARY.md edit adds the **Customization Target** term (Language section and Relationships) and updates the **Model Variant** entry's phrase "post-setup agent customizer" to "post-setup model customizer"; no glossary entry is named after either capability.
