**Complexity**: high (1 new + 3 modified capabilities, 11 added requirements, 19 affected paths)

## Why

The progress task lists rendered by the routed spec, design, and implement phases carry only status — `pending` / `in_progress` / `completed` — with no temporal signal, so the user cannot see when a step started, when it finished, or how long it took. Annotating each step with HH:mm wall-clock milestones makes start and finish visible at a glance, derived entirely from the existing render acts (first render, progress-event updates, run-closing reconciliation) with no protocol change.

## What Changes

- **New `sai-todo-timestamps` capability**: the progress task lists of the routed spec (`/sai-1-spec`), design (`/sai-2-design`), and implement (`/sai-3-implement`) phases carry HH:mm milestone stamps — the first render stamps the start time on the first `in_progress` step, each progress event stamps a closure time on the step(s) it marks, the next `in_progress` step inherits the previous closure as its start (transitive start inheritance), and the run-closing `completed` reconciliation stamps one shared time on every remaining step (bulk close).
- `sai/policies/todo-structure.md` gains a decorative annotation carve-out: stamping never changes a step's identity, label, order, or derived state, and the carve-out does not weaken the no-re-labelling rule for any other surface. Stamping is scoped to the three routed phase progress task lists — the Idea Progress List and the apply step projection carry no stamps.
- All six harness worker bindings (Claude Code and opencode × spec/design/implement) gain the stamp emission steps and each harness's own wall-clock command: `date +%H:%M` (Claude Code, bash) and `Get-Date -Format "HH:mm"` (opencode, PowerShell). Shell calls originate exclusively from the coordinator session — workers never stamp.
- **Amendment (in place, design phase, user-approved)**: the spec, design, and implement planning-phase coordinator sessions gain a narrowly-scoped wall-clock shell permission — `Bash(date:*)` on the three Claude Code wrappers — as the sole exception to `per-command-tool-scoping`, `design-coordinator`, and `design-subagent-delegation`, so the coordinator-session stamp calls the spec requires are achievable where the harness's shell tool was previously unavailable. The amendment rides as three new delta specs plus the wrapper and test updates listed under Impact; main specs are updated at sync time.
- `GLOSSARY.md` gains the **Milestone Stamp** domain term.
- Test surface updated to pin the carve-out and the binding stamp directives.
- No protocol change: no new lifecycle payloads, no worker-contract change, no coordinator-body change, no install-manifest change.

## Capabilities

### New Capabilities
- `sai-todo-timestamps`: phase progress task lists (routed spec/design/implement) carry HH:mm milestone stamps — initial start stamp on first render, per-completion closure stamps, transitive start inheritance, single shared stamp on bulk close.

### Modified Capabilities
- `per-command-tool-scoping`: the exact allowed-tools contract gains the planning-phase exception `Bash(date:*)` for milestone-stamp acquisition.
- `design-coordinator`: `coordinator-has-no-file-search-shell-git-web-openspec-access` gains the single wall-clock-call-per-render-act exception.
- `design-subagent-delegation`: the coordinator zero-I/O rule gains the same single-call exception.

## Impact

Affected files:
- `sai/policies/todo-structure.md` — new stamp-annotation section: decorative carve-out (no identity/state/label/order change), scope limited to the three routed phase progress task lists, stamping semantics (first-render start stamp, per-event closure stamps, transitive inheritance, bulk-close shared stamp, freeze on `needs_input`, `failed`, and `cancelled`), the one-shell-call-per-render-act budget, and no per-harness command named.
- `sai/orchestration/workers/bindings/claude/spec-worker.md` — task-list update directive gains the stamp steps and the `date +%H:%M` command.
- `sai/orchestration/workers/bindings/claude/design-worker.md` — same.
- `sai/orchestration/workers/bindings/claude/implementation-worker.md` — same.
- `sai/orchestration/workers/bindings/opencode/spec-worker.md` — todowrite emission directive gains the stamp steps and the `Get-Date -Format "HH:mm"` command.
- `sai/orchestration/workers/bindings/opencode/design-worker.md` — same.
- `sai/orchestration/workers/bindings/opencode/implementation-worker.md` — same.
- `openspec/changes/todo-list-step-timestamps/specs/per-command-tool-scoping/spec.md` — new delta spec: planning-phase `Bash(date:*)` exception to the exact allowed-tools contract.
- `openspec/changes/todo-list-step-timestamps/specs/design-coordinator/spec.md` — new delta spec: single wall-clock-call exception to the design coordinator's zero-shell rule.
- `openspec/changes/todo-list-step-timestamps/specs/design-subagent-delegation/spec.md` — new delta spec: same single-call exception to the coordinator zero-I/O rule.
- `commands/claude/sai-1-spec.md` — `allowed-tools` gains `Bash(date:*)`.
- `commands/claude/sai-2-design.md` — same.
- `commands/claude/sai-3-implement.md` — same.
- `GLOSSARY.md` — **Milestone Stamp** term, two relationship entries, and a flagged-ambiguity entry, landed during the spec phase as a permitted glossary update; the design-phase step verifies their presence and backfills any missing entry.
- `test/todo-structure-policy.test.js` — pinning assertions for the decorative carve-out and stamp scope.
- `test/spec-coordinator-worker.test.js` — pinning assertions for the spec-binding stamp directives on both harnesses.
- `test/design-coordinator-worker.test.js` — updated exact-scope allowed-tools pins and design-binding stamp directive pins.
- `test/implement-coordinator-worker.test.js` — implementation-binding stamp directive pins.
- `test/install-claude.test.js` — updated installed-copy allowed-tools pin.

Explicitly not touched: `sai/install-manifest.json` (the bindings install to the same neutral destinations per `progress-harness-bindings`), the coordinator bodies `sai/commands/{spec,design,implement}/coordinator.md` (stamping is part of rendering per the policy, which they already reference), the worker contracts `sai/orchestration/workers/sai-{1,2,3}-*.md`, the worker lifecycle protocol (`worker-lifecycle.md`, `coordinator-contract.md`), the `sai-explore` idea-list binding, the apply step projection (`sai/instructions/apply.md`), and `sai/instructions/*` / `sai/compat/*`.

## Proposal Research Documentation

**Local files**:
- `sai/policies/todo-structure.md` (full) — policy structure, scope line, list structure, state vocabulary, deterministic derivation, rendering actions, minimum-threshold rule, emission-ownership invariant, apply step projection, single-source reference rule
- `sai/orchestration/workers/bindings/claude/spec-worker.md:13-24`, `design-worker.md:23-34`, `implementation-worker.md:30-41` — per-event task-list update directives
- `sai/orchestration/workers/bindings/opencode/spec-worker.md:13-21`, `design-worker.md:20-28`, `implementation-worker.md:34-42` — per-event `todowrite` full-array emission directives
- `sai/commands/spec/coordinator.md:19-25`, `sai/commands/design/coordinator.md:17-24`, `sai/commands/implement/coordinator.md:24-42` — progress-plan declaration and render/reconcile directives
- `sai/orchestration/workers/sai-1-spec-proposal-worker.md:15-30`, `sai-2-design-worker.md:34-52`, `sai-3-implementation-worker.md:47-68` — canonical progress plans per phase
- `openspec/specs/coordinator-progress-ownership/spec.md` — deterministic-render-state, render-and-mark-only, terminal-reconciliation
- `openspec/specs/progress-harness-bindings/spec.md` — claude-task-list-update, opencode-todowrite-full-replacement, neutral-installed-binding, task-list-emission-coordinator-only
- `openspec/specs/spec-progress-plan/spec.md`, `openspec/specs/design-coordinator/spec.md`, `openspec/specs/apply-step-projection/spec.md`
- `GLOSSARY.md` — **Progress Plan**, **Progress Step**, **Progress Event**, **Native Task Panel**, **Idea Progress List**, **Step Projection** terms and relationships
- `test/todo-structure-policy.test.js`, `test/spec-coordinator-worker.test.js` — existing pinning assertions
- `docs/ddr/0112-neutral-task-list-policy-single-source.md`, `docs/ddr/0113-todowrite-emission-coordinator-only.md` — task-list policy and emission-ownership precedents

**External URLs**: none

## Additional Notes

- **Derived, not measured**: elapsed time is derived from the stamps, never measured: `duration(N) = closure(N) − closure(N−1)`, with `closure(0)` = the first-render start stamp. This is why per-step elapsed measurement was rejected — closure-minus-previous derives the same duration with no extra calls.
- **Zero-width spans**: a multi-mark progress event yields `start == closure` for every step it marks after the first — an accepted consequence of the transitive inheritance model, documented explicitly in the spec.
- **Render-time basis**: stamps reflect the coordinator's render time, not the worker's exact completion instant — accepted model latency.
- **HH:mm granularity** hides sub-minute variance — accepted trade-off.
- **Ephemeral**: the panel is ephemeral — stamps die with the session; no artifact persistence.
- **`needs_input` freezes the list**: no stamping calls; pause time is absorbed into the next milestone stamp (the next closure stamp is taken after the pause).
- **Rejected alternatives** (recorded for design): per-step elapsed-duration measurement; extending stamps to the Idea Progress List or the apply step projection (explicit scope decision).
- **DDR candidate for design phase**: the decorative carve-out extends the task-list semantics of DDR 0112, and coordinator-only stamp acquisition extends the emission-ownership invariant of DDR 0113; the design phase resolves the record family via the ordered routing test.
- **Design-phase amendment (in place)**: research during design found that the coordinator-session stamp calls conflict with the applied coordinator tool restrictions — `per-command-tool-scoping`'s exact allowed-tools list, and the `design-coordinator` / `design-subagent-delegation` zero-I/O rules, enforced on Claude Code by the wrapper `allowed-tools` lists (no `Bash`). As specified, no planning-phase task list on Claude Code could receive a stamp (the only Claude session with a shell, the worker, is forbidden from stamping). The user approved the in-place amendment: the three planning-phase coordinators gain the scoped `Bash(date:*)` shell entry as the sole exception, expressed as the three new delta specs and the wrapper/test updates listed under Impact. `workers never stamp` and `no protocol change` are preserved.
- The exact per-harness display mechanism for the stamp (e.g. placement within the rendered entry) is binding-level and resolved at design.
