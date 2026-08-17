## Target State

### Architecture Snapshot

The post-setup customizer is an explicit, repeatable pass machine with a single diagnostic owner:

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

Planned public surfaces:

- `bin/install-flow.js`
  - `runNavigator(options: { mode: 'single'|'multi'; question?: string; options: string[]; defaultSelected: string[]; input?: object; output?: object; footer?: string|null; preventEmptyConfirm?: boolean }) -> Promise<{ status: string; items?: string[] }>`
  - `promptSelect(question: string, options: string[], input?: object, footer?: string|null) -> Promise<string|symbol|null>`
  - `promptChecklist(items: string[], defaultSelected: string[], input?: object, footer?: string, navigatorOptions?: { preventEmptyConfirm?: boolean }) -> Promise<{ status: string; items?: string[] }>`
- `bin/model-customization.js`
  - `runPostSetupMenu(options?: object) -> Promise<{ status: 'skipped'; reason: 'cancelled'|'settings-unavailable'|'non-tty'; skippedAgents: string[]; diagnostics: string[] } | { status: 'completed'; skippedAgents: string[]; diagnostics: string[] } | { status: 'persistence-failed'; failedAgents: string[]; diagnostics: string[] }>`
  - `createClaudeAdapter(options?: object)` and `createOpencodeAdapter(options?: object)` retain independent enumeration, settings, and materialization operations.
  - `materializeLocalOverride(options: object) -> { status: 'persisted'|'skipped'|'persistence-failed'; diagnostic?: string }`; `skipped` carries `Skipped <name>: installed source is unavailable.`, while `persistence-failed` carries a non-empty operation diagnostic.
- `bin/setup.js`
  - `main() -> Promise<void>` retains setup orchestration and maps `persistence-failed` and unexpected post-setup failures to a non-zero exit status.

### File Manifest

M bin/install-flow.js (Step 1)
M bin/model-customization.js (Step 1, Step 2)
M bin/setup.js (Step 2)
M test/install-flow-navigator.test.js (Step 1)
M test/model-customization-menu.test.js (Step 1, Step 2)
M test/navigator-back-navigation.test.js (Step 2)

## Context

The repository is a Node CLI whose post-setup customization already has independent Claude Code and OpenCode adapters, manifest-derived target enumeration, injectable TTY and prompt seams, and a shared navigator with back sentinels. The current flow materializes one selected pass and then exits. The change needs to make successful passes re-enter the menu without carrying selections forward, while keeping cancellation and settings-unavailable paths normal exits.

The affected behavior crosses the navigator seam, the customization state machine, and setup's process-status mapping. These boundaries must remain atomic: the customization flow owns per-pass diagnostics, and setup owns only the final exit-code decision.

Constraints are the existing manifest projections, project-local override rules, TTY-only interaction, adapter separation, existing back/cancel sentinels, and the installer's intentionally permissive empty-confirm behavior.

## Goals / Non-Goals

### Goals

- Reopen the post-setup menu after every pass that attempted all selected targets without a persistence failure.
- Reset all pass-scoped state before the next menu render and preserve overrides from earlier successful passes.
- Classify persisted, skipped, and persistence-failed target operations while preserving selected-target diagnostic order.
- Return `No customization targets are available for the selected scope.` and reopen the scope screen when a selected scope enumerates no targets, without rendering a zero-row checklist.
- Render each pass diagnostic exactly once and map persistence failure to a non-zero setup exit.
- Add a default-disabled empty-confirm guard and visible back/cancel legends without changing installer semantics.

### Non-Goals

- Changing manifest projections, target enumeration sources, adapter-specific settings catalogs, or local-override file formats.
- Rolling back overrides from an earlier successful pass when a later pass is cancelled or fails.
- Adding a selectable Back row, changing navigator key semantics, or introducing translated CLI strings.
- Adding a new setup phase or changing non-interactive setup behavior.

## Decisions

### 1. Use an explicit outer pass loop with fresh pass state

The existing `runPostSetupMenu` state machine will wrap one complete customization path in an outer loop. A pass-local record will contain adapter, harness, scope, selected targets, settings, outcome, and diagnostics. A successful pass prints its diagnostics, clears that record, and starts the menu again; cancellation, settings unavailability, persistence failure, or an unexpected exception leaves the loop.

- Hard to reverse: No — the transition is localized to the existing state-machine function.
- Surprising without context: Yes — the internal `completed` result is a per-pass transition, while the eventual menu `Exit` is the final normal cancellation outcome.
- Real trade-off: Yes — an explicit loop is more inspectable than recursive re-entry, at the cost of a larger local control flow.
- **Provenance**: user

### 2. Keep diagnostic rendering in the customization flow and exit mapping in setup

`runPostSetupMenu` will render ordered per-target diagnostics at the end of each materialization pass. `bin/setup.js` will stop printing those diagnostics and will only map the final customization result (including `persistence-failed`) to the process exit status.

- Hard to reverse: No — ownership is separated at an existing call boundary.
- Surprising without context: Yes — setup remains responsible for exit status but intentionally does not report target-level details.
- Real trade-off: Yes — a single renderer prevents duplicate output, while setup-local rendering would be simpler but cannot distinguish pass boundaries.
- **Provenance**: user

### 3. Extend navigator behavior through optional, default-off controls

`runNavigator` will accept an opt-in `preventEmptyConfirm` flag and `promptChecklist` will forward it through an optional navigator-options argument. `promptSelect` will accept an optional footer override. Existing callers remain valid: omitted flags retain empty-confirm behavior and omitted selection footers receive the default single-select legend.

- Hard to reverse: No — the options are additive and preserve the current defaults.
- Surprising without context: Yes — the same multi-select primitive intentionally supports both installer and model-customization empty-confirm policies.
- Real trade-off: Yes — a narrow opt-in preserves compatibility but adds a small API surface instead of changing the global default.
- **Provenance**: codebase-forced

### 4. Make the first menu explicit while defaulting every later single-select screen

The post-setup menu will pass an explicit no-footer value so it does not claim that Back leaves the first screen; that binding lands in Step 1 with the navigator default. Harness, scope, Claude settings, and OpenCode provider/model/variant selectors will use the default single-select legend through the normal `promptSelect` binding. The target checklist will retain its multi-select legend and enable the empty-confirm guard in Step 2.

- Hard to reverse: No — footer selection is a local presentation choice.
- Surprising without context: Yes — the menu is the only selection screen where Back redraws the same menu rather than navigating to a predecessor.
- Real trade-off: Yes — a default legend reduces missed affordances, while an explicit menu override avoids a misleading instruction.
- **Provenance**: derived

### 5. Preserve independent adapter operations and classify outcomes at materialization

The cycle will call the selected adapter's existing enumeration, settings, and local-override seams without introducing a normalized target-file format. Each target operation will be classified as `persisted`, `skipped`, or `persistence-failed`; a persistence failure records its diagnostic but does not stop remaining selected-target attempts. Unexpected exceptions continue through setup's existing failure path.

Completed records contain `skippedAgents` and ordered diagnostics; persistence-failed records contain `failedAgents` and ordered diagnostics, omit skipped target names from `failedAgents`, and represent skipped targets on that failure path through their diagnostics alone. Persisted targets contribute neither a diagnostic nor an outcome-list entry.

- Hard to reverse: No — the adapter boundaries already exist and remain unchanged.
- Surprising without context: No — the baseline capability already defines isolated adapters and per-target materialization.
- Real trade-off: Yes — continuing after a persistence failure gives complete diagnostics but may attempt more writes after a partial failure.
- **Provenance**: codebase-forced

### 6. Short-circuit empty target scopes before checklist rendering

Target enumeration will be checked before calling the multi-select prompt. If the selected scope has no targets, the flow will print the exact notice `No customization targets are available for the selected scope.` and return to the scope selector. It will not create a zero-row checklist, invoke settings, or enter the pass-materialization path.

- Hard to reverse: No — the branch is local to target enumeration and navigation.
- Surprising without context: Yes — an empty scope is a navigation result rather than a completed empty pass.
- Real trade-off: Yes — the notice adds an extra branch but prevents an unusable checklist and preserves the scope-selection recovery path.
- **Provenance**: user

## Risks / Trade-offs

- [Risk] A later persistence failure can leave earlier successful passes materialized, so a session may contain a partial customization set. → Mitigation: preserve the documented non-transactional behavior, report ordered diagnostics for the failing pass, and never roll back earlier persisted overrides.
- [Risk] Manifest inventory changes can alter which targets are selected by default on a later pass. → Mitigation: derive every checklist from the canonical projections on each pass and reset selection state before rendering it.
- [Risk] Optional navigator parameters can drift between injected test doubles and production bindings. → Mitigation: keep old positional arguments valid, cover the production call sites statically, and test both omitted and enabled options.
- [Risk] Moving diagnostic output can hide failures if setup only maps status. → Mitigation: assert exactly-once rendering for completed and persistence-failed passes before validating exit status.

## Migration Plan

No data migration is required. Existing project-local overrides remain untouched; a later pass may update selected targets using the existing materialization rules. Rollout consists of shipping the navigator API extension, the cyclic state-machine transition, and setup exit mapping together with their regression tests. Rollback is a code revert; it does not remove already materialized project-local overrides.

## Open Questions

None — the proposal, delta spec, baseline capability, adapter boundaries, navigator seams, and test runner research resolve the implementation choices needed for the task scaffold.

## Deferred

None — this change does not postpone a decision whose cost increases with time.

## Manual Verification

Manual checks are the middle tier between automated tests and downstream `/sai-5-review`; they cover behavior that is cheap to exercise by hand but expensive to encode completely.

- End-to-end smoke: run setup in an interactive terminal, complete one customization pass, confirm that the menu returns with fresh cursor and selections, then choose `Exit`; correct behavior is one diagnostic emission per pass, preserved earlier overrides, and exit code 0. Repeat with a persistence failure and confirm remaining targets are attempted, the diagnostic appears once, and the process exits non-zero.
