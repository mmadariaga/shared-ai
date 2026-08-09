**Complexity**: medium (2 capabilities, 10 requirements, 3 file paths, no breaking change)

## Why

The post-setup model customizer (`bin/agent-customization.js`) prompts via numbered type-a-number input — the exact interaction pattern ADR 0010 already rejected for the installer (`docs/adr/0010-readline-over-npm-for-interactive-checklist.md:21`) — and loops every agent with two prompts each (20 prompts for the 10 opencode agents). The installer already ships the raw-readline navigable list (`bin/install-flow.js:452`); the configurator should match it, closing a parity gap between two sibling tools.

## What Changes

- Replace the numbered-input `promptChoice` in the configurator with navigable single-select menus (`>` cursor, arrow-key navigation, Enter/space confirm) across the main menu, the harness picker, and the per-agent model/effort selection
- Add a navigable multi-select agent-selection checklist (up/down, space toggle, Enter confirm) run after harness selection and before per-agent configuration, defaulting to all agents of the chosen harness — preserving today's customize-all behavior while allowing a subset
- Factor the raw-readline navigator in `bin/install-flow.js` into one shared engine backing both the existing `promptChecklist` and a new exported `promptSelect(question, options)`, with zero new runtime dependencies per ADR 0010
- Keep `promptSelect` on the `(question, options) -> option` signature so the injected `promptChoice` seam and the existing `test/agent-customization-menu.test.js` behaviors stay green
- Preserve the configurator's TTY contract: `runPostSetupMenu` keeps returning `'skipped'` on non-TTY runs instead of adopting the installer's hard exit, so `setup.js` completes normally
- Model/effort option lists remain the walking-skeleton placeholders (`<model>`, `<model-alt>`, `<effort>`, `<effort-alt>`); real model catalogs are out of scope

No **BREAKING** changes.

## Capabilities

### New Capabilities

- `shared-readline-navigator`: one raw-readline keypress engine in `bin/install-flow.js` backing the existing `promptChecklist` and a new exported `promptSelect` navigable single-select menu, built-in modules only per ADR 0010

### Modified Capabilities

- `agent-customization-menu` (`openspec/specs/agent-customization-menu/spec.md`): all configurator selections move from numbered type-a-number input to navigable single-select menus; a new navigable agent-selection checklist scopes per-agent configuration to the user-selected subset (default all); the non-TTY `'skipped'` contract and the fake placeholder-settings contract are preserved

## Impact

- `M` `bin/install-flow.js` — factor the raw-readline keypress engine shared by `promptChecklist` and the new exported `promptSelect`; `promptChecklist`'s externally observable interaction (arrow/space/enter, `>` cursor, `[x]` markers) is unchanged
- `M` `bin/agent-customization.js` — replace numbered `promptChoice` with navigable `promptSelect` as the default behind the injected seam; insert the agent-selection checklist after harness selection; keep the non-TTY `'skipped'` return
- `M` `test/agent-customization-menu.test.js` — the existing injected-seam tests stay green; the suite is extended for the checklist and navigable-selection behaviors
- No new runtime npm dependencies: the `npx github:` zero-dependency install model (ADR 0010) is preserved, and ADR 0031's single declared dependency (`jsonc-parser`) is untouched

## Proposal Research Documentation

**Local files**:

- `bin/install-flow.js:452` — `promptChecklist`, the raw-readline navigable multi-select engine the configurator must mirror and the natural host for the shared engine
- `bin/agent-customization.js:13,80-100` — the numbered `promptChoice` seam to replace and the `runPostSetupMenu` flow where the checklist and navigable menus slot in
- `test/agent-customization-menu.test.js:90` — the `promptChoice`-injected test seam (stub `async (question, options) => option`, driven by pre-computed answer arrays) that must stay green
- `docs/adr/0010-readline-over-npm-for-interactive-checklist.md:15,21` — the raw-readline precedent, the TTY-guard rationale (`setRawMode` throws an opaque `TypeError` without it), and the rejection of numbered menus as worse UX
- `openspec/specs/agent-customization-menu/spec.md` — the main spec this change modifies (post-setup menu, TTY-only interaction, exclusive harness selection, complete traversal, fake settings selection, non-persistent fake override)
- `openspec/specs/npx-installer/spec.md:20,29-30,35-39` — the checklist's already-spec'd contract: navigable `readline` checklist, arrow/space/enter, built-in modules only
- `sai/install-manifest.json:29-45` — the 7 Claude + 10 opencode `agents`-class projections from which each harness's agent set (and therefore the checklist's default selection) is derived
- `bin/setup.js:128,171` — `runPostSetupMenu` wiring: invoked with exactly `{projectPath}` after the readline closes; the returned `'skipped'` is ignored and only a throw maps to `'post-setup-failure'`

**External URLs**: None — the change is entirely grounded in this repository.

## Additional Notes

- **Seam compatibility is the constraint that shapes the signature.** `promptSelect` keeps the `(question, options) -> option` contract of the current numbered `promptChoice` (resolves the selected option string, not an index), so the existing injection seam — tests pass a stub through `runPostSetupMenu({ projectPath, isTTY, promptChoice })` and assert one resolved call per option — remains a drop-in. The default behind the seam switches from the numbered implementation to `promptSelect`; injected stubs are unaffected.
- **The checklist defaults to all selected**, so a user who simply confirms keeps today's customize-everything behavior; a subset is an explicit narrowing. The empty-selection case completes customization without configuring any agent.
- **The configurator deliberately diverges from the installer on non-TTY.** The installer hard-exits with `Error: interactive mode requires a TTY...` (ADR 0010 consequence); the configurator keeps returning `'skipped'` so `setup.js` completes normally (`bin/setup.js:171-175`). The TTY check must still gate every navigable surface, because `setRawMode` throws without a TTY.
- **Abort semantics inside the configurator are a REQUIRED sai-2 design decision**: `q`/Ctrl-C cancel semantics for `promptSelect` and the agent checklist — whether they decline the current menu, complete customization, or cancel the run — SHALL be pinned in `design.md` at sai-2. The engine-level exit-policy separation pinned by the `shared-readline-navigator` requirement "Shared raw-readline navigator engine" guarantees the configurator is never force-exited through the shared functions; what the configurator does with a cancellation outcome stays open until sai-2 settles it, and the delta specs SHALL be updated after the design settles.
- **The space-key pattern shift across adjacent surfaces is a deliberate interaction choice.** Space confirms the highlighted option in the single-selects (main menu, harness picker, model/effort) and toggles selection in the agent checklist — both behaviors are pinned by the delta specs (`promptSelect` space-confirm scenario; "Navigable agent-selection checklist" space-toggle scenario). Whether the checklist surface renders a legend or hint for the toggle is an interaction choice for sai-2 to carry into `design.md`.
- **`promptChecklist` is currently internal to `bin/install-flow.js`** (not exported); the refactor keeps its externally observable behavior intact per `npx-installer` while moving it onto the shared engine, and adds `promptSelect` to the existing `module.exports`.
- **No glossary update:** navigable menus/checklists are general UI concepts, excluded from `GLOSSARY.md` by the glossary format's scope rule; no new domain term is introduced.
- **No new ADR proposed:** ADR 0010 already records the raw-readline zero-dependency decision; the shared-engine placement and the checklist-defaults choice are design decisions subject to the ADR/DDR check at sai-2.
- **Verification:** correctness is verified by `openspec validate` and by reading the deltas against `bin/install-flow.js:452`, `bin/agent-customization.js:13,80-100`, and `test/agent-customization-menu.test.js:90`.
