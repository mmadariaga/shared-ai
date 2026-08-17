**Complexity**: medium (1 modified capability, 6 requirements, 3 affected source files)

## Why

Post-setup customization currently applies one selection and terminates, forcing users to rerun setup to customize another subset. Back navigation already works internally but is not discoverable on most selection screens, and persistence failures are currently flattened into a successful setup exit.

## What Changes

- Return to the post-setup customization menu after each successful customization pass, resetting all pass-specific selections so the next pass can choose a different harness, scope, targets, or settings.
- Print each produced diagnostic once per materialization pass, including a persistence-failed pass, from `runPostSetupMenu` before returning to the menu or terminating, leaving setup orchestration responsible only for outcome-to-exit-code mapping so diagnostics are not duplicated; passes with no diagnostics print none.
- Preserve cancellation and settings-unavailable exits, but make persistence failure terminate with a non-zero process exit code.
- Add an opt-in navigator guard that prevents empty confirmation only for the model-customization checklist; preserve the installer’s existing empty-confirm exit behavior.
- Render a default key legend on every non-menu model-customization selection screen so the existing left-arrow/Esc back affordance is visible, with single- and multi-select wording appropriate to each mode.

## Capabilities

### New Capabilities

<!-- No new capability is introduced; the existing model customization menu is extended. -->

### Modified Capabilities

- `model-customization-menu`: cycle successful post-setup passes, report per-pass diagnostics, distinguish persistence failure from successful exit, block empty target confirmation in the opt-in checklist, and expose back navigation through selection-screen legends.

## Impact

- `bin/model-customization.js`: post-setup state-machine cycling, per-pass diagnostics, checklist configuration, and selection-screen legends.
- `bin/install-flow.js`: opt-in empty-confirm navigation behavior and default key-legend forwarding from `promptSelect`.
- `bin/setup.js`: post-setup diagnostics ownership and persistence-failure exit mapping.
- `openspec/changes/cyclic-post-setup-menu/specs/model-customization-menu/spec.md`: delta requirements and scenarios for cycling, diagnostics, exit codes, empty selection, and visible back navigation.
- Existing model-customization and navigator tests will need coverage for repeated passes, outcome mapping, opt-in empty confirmation, and legends.

## Proposal Research Documentation

**Local files**:

- `bin/model-customization.js`
- `bin/install-flow.js`
- `bin/setup.js`
- `test/model-customization-menu.test.js`
- `test/navigator-back-navigation.test.js`
- `test/install-flow-navigator.test.js`
- `test/install-codegraph.test.js`
- `test/canonical-opencode-agent-behavior.test.js`
- `openspec/specs/model-customization-menu/spec.md`
- `openspec/changes/cyclic-post-setup-menu/specs/model-customization-menu/spec.md`
- `sai/install-manifest.json`
- `GLOSSARY.md`

**External URLs**: None.

## Additional Notes

- The menu is already a back-navigable state machine; cycling adds only the successful-pass re-entry transition.
- A legend is preferred over a selectable Back row because every screen already resolves the BACK sentinel and a row would complicate checklist toggling and settings/catalog validation.
- A later pass is not transactional with earlier passes: cancellation or failure preserves overrides already persisted by earlier successful passes.
- The installer’s first screen remains an intentional empty-confirm exit and must not inherit the checklist-only guard.
- The CLI is not translated; all new strings remain in English to match the existing UI.
- A customization pass ends after its selected-target operations have been attempted; `runPostSetupMenu` owns rendering that pass's diagnostics, while `bin/setup.js` only maps the final outcome to the process exit code.
- A pass with skipped targets but no persistence failure is still a successful pass and therefore still returns to the menu; only persistence failure prevents re-entry.
