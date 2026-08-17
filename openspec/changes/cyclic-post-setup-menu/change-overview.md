# Change Overview

## Change Proposal

Post-setup customization currently applies one selection and terminates, so users must rerun setup to customize another subset. Although back navigation already works internally, it is not discoverable on most selection screens, and persistence failures are currently flattened into a successful setup exit. (Source: `proposal.md`, `## Why`.)

## Scope

### In scope

- Re-enter the post-setup customization menu after each successful pass, resetting pass-specific selections so a later pass can choose a different harness, scope, targets, or settings. (Source: `proposal.md`, `## What Changes`; `spec.md`, `Cyclic post-setup customization passes`.)
- Render each pass's diagnostics once, including persistence-failed passes, and leave setup responsible for final outcome-to-exit-code mapping. (Source: `proposal.md`, `## What Changes`; `design.md`, Decision 2.)
- Preserve cancellation and settings-unavailable exits while making persistence failure non-zero; add a checklist-only empty-confirm guard and visible selection-screen legends. (Source: `proposal.md`, `## What Changes`; `spec.md`.)

### Out of scope

- Changing manifest projections, target enumeration sources, adapter-specific settings catalogs, local-override formats, non-interactive setup, or adding a new setup phase. (Source: `design.md`, `Goals / Non-Goals`.)
- Rolling back overrides from earlier successful passes, adding a selectable Back row, changing navigator key semantics, or translating CLI strings. (Source: `design.md`, `Goals / Non-Goals`.)

## Capabilities

### model-customization-menu

The existing `model-customization-menu` capability is modified; no new capability is introduced. (Source: `proposal.md`, `## Capabilities`.)

- A pass that attempts every selected target without a persistence failure returns to the menu. It resets adapter, harness, scope, targets, settings, outcome, and diagnostics state; cancellation, settings unavailability, and persistence failure terminate the loop. Skipped target results are non-fatal. (Source: `spec.md`, `Cyclic post-setup customization passes`.)
- The flow reports `completed`, `skipped`, and `persistence-failed` outcomes with the specified skipped-agent, failed-agent, and ordered diagnostic arrays. Persisted targets produce no diagnostic; skipped and failed targets produce one diagnostic each. (Source: `spec.md`, `Post-setup pass diagnostics and exit status`.)
- A persistence failure does not prevent remaining selected targets from being attempted, but the pass does not re-enter the menu. Unexpected exceptions continue through the existing setup failure path. (Source: `spec.md`, `Post-setup pass diagnostics and exit status`.)
- The model-customization checklist alone enables refusal of empty confirmation. The installer keeps its existing empty-confirm behavior. (Source: `spec.md`, `Opt-in empty-confirm protection`.)
- Model-customization single-select screens expose the default back/cancel legend, the target checklist retains its multi-select legend, and the first post-setup menu explicitly suppresses the back footer. (Source: `spec.md`, `Visible selection-screen back affordance`.)
- Settings are selected once for a non-empty confirmed subset and passed unchanged to every selected target, including both families in `Both` scope. Empty target enumeration returns the exact notice and goes back to scope without rendering a zero-row checklist. (Source: `spec.md`, `Shared settings selection`; `Navigable target-selection checklist`.)

## Target Architecture

The post-setup customizer becomes an explicit repeatable pass machine with one diagnostic owner. `runPostSetupMenu` owns pass rendering and re-entry or termination; `setup.main` maps the final outcome to process status. Independent Claude Code and OpenCode adapters retain their enumeration, settings, and materialization operations. (Source: `design.md`, `## Target State` and `## Context`.)

### Snapshot

```text
setup.main
  -> runPostSetupMenu
       -> promptSelect / promptChecklist
       -> runNavigator
       -> selected harness adapter
            -> enumerate targets
               -> empty target enumeration: print the scope notice and return to scope
               -> selectSettings
               -> materializeLocalOverride (once per selected target)
       -> print pass diagnostics once
       -> completed pass: reset pass state and reopen menu
       -> persistence-failed: stop
  -> map final outcome to process exit status
```

The implementation uses an outer loop and a fresh pass-local record rather than recursive re-entry. Navigator extensions are additive and default-off: `preventEmptyConfirm` is opt-in, omitted legacy calls retain empty-confirm behavior, and an explicit `null` footer suppresses a footer. (Source: `design.md`, Decisions 1, 3, and 4.)

## Key Contracts

### Pass and outcome behavior

- A completed pass has attempted one local-override operation for every selected target and has no persistence failure; it prints its produced diagnostics once, resets pass state, and reopens the menu. A pass with only skipped targets may re-enter. (Source: `spec.md`, `Cyclic post-setup customization passes`; `design.md`, Decision 1.)
- Cancellation, unavailable settings, and non-TTY operation return the stated skipped outcomes. Selecting `Exit` after zero or more successful passes is normal cancellation and exits 0. (Source: `spec.md`, `Post-setup pass diagnostics and exit status`.)
- A persistence-failed pass attempts remaining selected targets once, prints its ordered diagnostics once, does not reopen the menu, and maps to a non-zero setup exit. Earlier successful overrides are not rolled back. (Source: `spec.md`; `proposal.md`, `## Additional Notes`.)

### Diagnostics and materialization

- Each selected target contributes at most one diagnostic: persisted contributes none, skipped contributes `Skipped <name>: installed source is unavailable.`, and failed contributes its non-empty operation diagnostic. Diagnostics retain selected-target order. (Source: `spec.md`, `Post-setup pass diagnostics and exit status`.)
- `runPostSetupMenu` is the sole renderer of pass diagnostics; `bin/setup.js` maps final status and does not duplicate target diagnostics. (Source: `design.md`, Decision 2.)
- `materializeLocalOverride` classifies each operation as `persisted`, `skipped`, or `persistence-failed`; unexpected exceptions use the existing `post-setup-failure` path. (Source: `design.md`, Target State; `spec.md`, `Post-setup pass diagnostics and exit status`.)

### Navigation and settings

- The target checklist refuses empty confirmation only when the model-customization call enables the guard. It invokes settings only after a non-empty confirmation. (Source: `spec.md`, `Opt-in empty-confirm protection`; `Shared settings selection`.)
- Back from harness, scope, target, or settings returns to the immediate predecessor without materializing or completing a pass; cancellation stops the current cycle without another screen. (Source: `spec.md`, `Cyclic post-setup customization passes`.)
- Target lists derive from canonical manifest projections, default to all targets selected, use alphabetical family ordering, and prefix worker/command rows in `Both` scope. (Source: `spec.md`, `Navigable target-selection checklist`; `tasks.md`, `Implementation Context`.)

## File Manifest

The deterministic union of the `Files Affected` entries in `tasks.md` is the following six modified paths. It matches the persisted `design.md` File Manifest; no net-empty path is included. (Sources: `tasks.md`, Steps 1–2; `design.md`, `## File Manifest`.)

### Navigator and selection bindings

- `M bin/install-flow.js` — Step 1; additive navigator options, installer-compatible defaults, and footer forwarding.
  - `runNavigator(options: { mode: 'single'|'multi'; question?: string; options: string[]; defaultSelected: string[]; input?: object; output?: object; footer?: string|null; preventEmptyConfirm?: boolean }) -> Promise<{ status: string; items?: string[] }>`
  - `promptSelect(question: string, options: string[], input?: object, footer?: string|null) -> Promise<string|symbol|null>`
  - `promptChecklist(items: string[], defaultSelected: string[], input?: object, footer?: string, navigatorOptions?: { preventEmptyConfirm?: boolean }) -> Promise<{ status: string; items?: string[] }>` (Source: `design.md`, Target State; `interfaces.md`, Steps 1–2.)

- `M bin/model-customization.js` — Steps 1–2; selection bindings, cyclic passes, diagnostics, and target materialization.
  - `runPostSetupMenu(options?: object) -> Promise<{ status: 'skipped'; reason: 'cancelled'|'settings-unavailable'|'non-tty'; skippedAgents: string[]; diagnostics: string[] } | { status: 'completed'; skippedAgents: string[]; diagnostics: string[] } | { status: 'persistence-failed'; failedAgents: string[]; diagnostics: string[] }>`
  - `createClaudeAdapter(options?: object)` and `createOpencodeAdapter(options?: object)` retain independent enumeration, settings, and materialization operations.
  - `materializeLocalOverride(options: object) -> { status: 'persisted'|'skipped'|'persistence-failed'; diagnostic?: string }` (Source: `design.md`, Target State; `interfaces.md`, Step 2.)

### Setup outcome mapping

- `M bin/setup.js` — Step 2; map the final customization outcome to process exit status without rendering target diagnostics.
  - `main() -> Promise<void>` (Source: `design.md`, Target State; `interfaces.md`, Step 2.)

### Regression coverage

- `M test/install-flow-navigator.test.js` — Step 1 navigator and installer-default coverage.
- `M test/model-customization-menu.test.js` — Steps 1–2 selection, cycling, diagnostics, and outcome coverage.
- `M test/navigator-back-navigation.test.js` — Step 2 back-navigation coverage.

## Review Scenarios

### Re-entry and cancellation

- Complete a pass with all selected target operations attempted: the menu returns with fresh cursor and selection state, and a later `Exit` returns normal cancellation with exit code 0. (Source: `spec.md`, `Cyclic post-setup customization passes`; `Post-setup pass diagnostics and exit status`.)
- Cancel at the menu, harness, scope, target, or settings screen: no additional screen is presented. Back abandons only the current unmaterialized path and returns to its predecessor. (Source: `spec.md`, `Cyclic post-setup customization passes`.)
- Cancel on a later pass: earlier persisted overrides remain and the process exits normally without rollback. (Source: `spec.md`, `Post-setup pass diagnostics and exit status`.)

### Target and settings selection

- Select a scope with no targets: the exact empty-enumeration notice appears, scope selection resumes, and no zero-row checklist or settings selection is invoked. (Source: `spec.md`, `Navigable target-selection checklist`.)
- Deselect every target: the model checklist remains open and settings are not invoked; the installer first screen retains its empty-confirm exit. (Source: `spec.md`, `Opt-in empty-confirm protection`; `Shared settings selection`.)
- Confirm a non-empty subset, including `Both` scope: settings are selected once and identical settings are passed to each selected target in checklist order. (Source: `spec.md`, `Shared settings selection`.)
- Render each single-select and checklist screen: the required back/cancel legend appears, except the first menu's explicitly suppressed back footer. (Source: `spec.md`, `Visible selection-screen back affordance`.)

### Diagnostics and failure

- A completed pass with skipped or failed diagnostics prints each produced diagnostic once before re-entry or termination; a fully persisted pass prints none and still re-enters. Earlier-pass diagnostics are not repeated. (Source: `spec.md`, `Post-setup pass diagnostics and exit status`.)
- On persistence failure, remaining selected targets are still attempted once, diagnostics retain order, the menu does not reopen, and setup exits non-zero without duplicate rendering. (Source: `spec.md`, `Post-setup pass diagnostics and exit status`.)
- An unexpected materialization exception follows the existing failure path and does not require later target attempts or a per-pass diagnostic list. (Source: `spec.md`, `Post-setup pass diagnostics and exit status`.)
- A non-TTY invocation returns before the first menu. (Source: `spec.md`, `Cyclic post-setup customization passes`.)

## Implementation Approach

1. Extend the shared navigator with additive, default-preserving options for empty-confirm refusal and nullable selection footers; route the default single-select legend and explicit post-setup menu no-footer binding, while retaining installer behavior and adding focused tests. (Source: `tasks.md`, Step 1; `design.md`, Decisions 3–4.)
2. Wrap the adapter-driven customization path in a fresh-state pass loop; wire checklist and selection-screen behavior, classify exhaustive target attempts, and render ordered diagnostics at each pass boundary. (Source: `tasks.md`, Step 2; `design.md`, Decisions 1, 2, and 5.)
3. Make setup map only the final customization status to process exit status, then run focused model and navigator suites followed by `npm test`. (Source: `tasks.md`, Step 2, `Testing Strategy` and `Test Command`; `interfaces.md`, Step 2.)

## Approval Summary

- The change uses an explicit outer loop because it is more inspectable than recursive re-entry, while the completed result is treated as a per-pass transition rather than the final result. (Source: `design.md`, Decision 1.)
- Diagnostic ownership is deliberately centralized in the customization flow so pass boundaries are visible and setup cannot duplicate target-level output; setup retains only exit-status mapping. (Source: `design.md`, Decision 2; `proposal.md`, `## Additional Notes`.)
- Navigator behavior is extended through opt-in, default-off controls to preserve the installer's intentionally permissive empty-confirm behavior. The first menu explicitly suppresses its footer because Back redraws that same menu rather than navigating to a predecessor. (Source: `design.md`, Decisions 3–4.)
- Adapter separation, manifest-derived inventories, TTY-only interaction, existing back/cancel sentinels, and local-override rules remain constraints. (Source: `design.md`, `## Context`; `tasks.md`, `Implementation Context`.)
- The principal trade-off is non-transactional later-pass failure: earlier overrides remain after a later persistence failure. The stated mitigation is ordered diagnostics, continued attempts for remaining targets, fresh manifest-derived selections on each pass, and no rollback. (Source: `proposal.md`, `## Additional Notes`; `design.md`, `## Risks / Trade-offs`.)
- No data migration is required; rollback is a code revert and does not remove already materialized project-local overrides. Approval should include the manual interactive smoke check for repeated passes, exactly-once diagnostics, preserved overrides, and non-zero persistence-failure exit. (Source: `design.md`, `## Migration Plan` and `## Manual Verification`.)
