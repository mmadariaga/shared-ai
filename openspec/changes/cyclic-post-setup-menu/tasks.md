## Step 1: Extend the shared navigator without changing existing defaults

**Routing**: layer=infra · discipline=app-code · complexity=medium

**Files Affected**:
M bin/install-flow.js
M bin/model-customization.js
M test/install-flow-navigator.test.js
M test/model-customization-menu.test.js

**What Will Be Done**: Add additive navigator options for an opt-in empty-confirm refusal and a nullable selection footer, while preserving existing positional calls and defaults. Route the default single-select legend through `promptSelect`, apply the post-setup menu's explicit no-footer binding in the same step, retain the installer checklist's omitted guard, and cover the shared behavior with focused navigator tests. Reference `openspec/changes/cyclic-post-setup-menu/specs/model-customization-menu/spec.md` for the navigator contract.

**Testing Strategy**: Run the navigator and model suites directly and assert the enabled multi-select guard, the disabled legacy branch, default single-select footer forwarding, explicit footer suppression, unchanged installer first-screen behavior, the seven production `promptChoice` sites, the three default `promptSelect` bindings, and the explicit post-setup menu no-footer override in this step's snapshot.

**Existing Tests Broken**: `test/install-flow-navigator.test.js` — runtime; `test/model-customization-menu.test.js` — runtime

## Step 2: Integrate cyclic passes, diagnostics, and setup exit mapping

**Routing**: layer=infra · discipline=app-code · complexity=medium

**Files Affected**:
M bin/model-customization.js
M bin/setup.js
M test/model-customization-menu.test.js
M test/navigator-back-navigation.test.js

**What Will Be Done**: Wrap the existing adapter-driven customization path in a fresh-state pass loop, wire the model checklist's opt-in navigator guard and selection-screen bindings, and centralize ordered diagnostic rendering at each pass boundary. Keep adapter materialization attempts classified and exhaustive after the first persistence failure, then make setup map only the final outcome to process status. Reference `openspec/changes/cyclic-post-setup-menu/specs/model-customization-menu/spec.md` for the pass, outcome, and navigation behavior.

**Testing Strategy**: Exercise injected TTY, prompt, adapter, and filesystem seams for repeated successful passes, fresh state reset, later-pass cancellation preserving earlier overrides and exiting 0, cancellation from every navigable screen stopping without another screen, back from harness/scope/target/settings reopening only its predecessor without materialization, non-TTY early skip, empty target enumeration with the exact scope notice and no zero-row checklist, settings unavailability, exactly-once settings selection, identical settings across selected targets and `Both` scope, empty-selection non-invocation, skipped and failed outcome-array invariants, mixed outcomes, exactly-once diagnostics including persisted-only zero output and menu re-entry, unexpected-exception propagation, and non-zero persistence-failure exit; run the focused model and navigator suites followed by `npm test`.

**Existing Tests Broken**: `test/model-customization-menu.test.js` — runtime; `test/navigator-back-navigation.test.js` — runtime

## Required Documentation

### Local files

openspec/changes/cyclic-post-setup-menu/proposal.md
bin/model-customization.js
bin/install-flow.js
bin/setup.js
bin/install-manifest.js
sai/install-manifest.json
test/model-customization-menu.test.js
test/navigator-back-navigation.test.js
test/install-flow-navigator.test.js
test/canonical-opencode-agent-behavior.test.js
test/install-codegraph.test.js
test/navigator-raw-input-session.test.js
GLOSSARY.md
package.json

### Spec files

openspec/changes/cyclic-post-setup-menu/specs/model-customization-menu/spec.md
openspec/specs/model-customization-menu/spec.md
openspec/specs/tasks-routing-metadata/spec.md
openspec/specs/tasks-scaffold-format/spec.md
openspec/specs/tasks-existing-test-impact/spec.md
openspec/specs/tasks-required-documentation/spec.md
openspec/specs/tasks-implementation-context/spec.md
openspec/specs/change-overview-synchronization/spec.md
openspec/specs/change-overview-generation-routing/spec.md
openspec/specs/design-decision-provenance/spec.md
openspec/specs/design-risk-ordering/spec.md

### External URLs

None

## Implementation Context

**Stack**: Node.js CLI package version 1.0.0 with declared runtime `>=18`, built-in `node:test`, and `jsonc-parser`; no application framework is declared.

**Conventions**:

- `runPostSetupMenu` receives injectable TTY, prompt, project-root, package-root, and filesystem-related seams through an options object so tests can avoid hard exits and global mutation.
- Claude Code and OpenCode stay behind independent adapters exposing enumeration, settings selection, and local materialization operations rather than a shared target-file model.
- Target inventories come from the canonical `sai/install-manifest.json` projections; command enumeration uses declared package sources instead of installed global directories.
- Tests use Node's built-in runner and execute focused files directly with explicit `node --test` paths.

**Avoid**:

- Do not hardcode worker or command inventories; derive them from manifest projections on every pass.
- Do not collapse `skipped` and `persistence-failed` into successful setup or print target diagnostics from `bin/setup.js`.
- Do not make the empty-confirm guard global; the installer first checklist intentionally omits the opt-in.
- Do not merge Claude and OpenCode settings or materialization into a normalized adapter implementation.

**Test Command**:

`npm test`

Scoped: `node --test test/<file>.test.js [test/<file>.test.js ...]`
