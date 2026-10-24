> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

The three audit coordinators of `/sai-5-security`, `/sai-6-performance`, and `/sai-7-accessibility` were largely duplicated, rendered panel progress plans, asked runtime authorization questions, and trusted the worker's `completed` result with no report verification and no commit, while `/sai-4-review` already ran goal-driven and unattended. This change moves the three standalone audits onto one goal-driven, unattended coordinator in the shape of `/sai-4-review` that verifies each report deterministically and commits it locally.

## What Changes

- New shared coordinator `sai/commands/audit/coordinator.md` serves the three audits: it drops `--fast-track` silently, validates arguments against the audit's `options.md`, resolves the change with the `/sai-4-review` rule, runs one worker cycle (`sai-state` session `{audit}-{name}`, `{audit}-steps@1` pointers, `step-done` events), verifies the report, commits only the report, and ends with `{Audit} audit done.`. It loads none of the shared orchestration files.
- New `sai/commands/audit/worker-common.md` holds the rules the three named workers share: the `ready` handshake, the closed `step-done` / `question` / `completed` / `failed` results, writing only the report, no git mutation, and questions as assumptions. The three `worker.md` cards keep only their step plans and batching rules; their `steps/` files report `step-done` instead of progress events.
- New step machines `security-steps@1`, `performance-steps@1`, and `accessibility-steps@1` on `sai-state/machines/linear-steps.js`, registered in `sai-state/registry.js`. The audit worker bindings render from the standalone worker template in `bin/worker-matrix.js`.
- The Claude Code and opencode wrappers load the fetch skill and the shared coordinator with `command_name` set to the audit.
- `--runtime` is the whole authorization for performance diagnostics and accessibility scanners; unavailable tools or unreachable targets are recorded in the report. Accessibility gains `--url <url>`, asked for as an input when `--runtime` comes without it, and a `## Pending Manual Checks` report section. The performance provenance line gains a `**Diagnostics:**` field.
- `sai/tools/lint.js` gains an `audit-report --audit <audit>` check (template structure, the audit's ADR 0107b severity subset and `Summary:` form, per-severity numbering, tally, and the accessibility severity table). `sai/tools/check-cited-paths.js` gains an `audit-report` mode for the paths audit findings cite.
- Accessibility discovery inspects five or fewer UI files directly and delegates only above five.
- Documentation (`AGENTS.md`, `docs/commands/sai-{5-security,6-performance,7-accessibility}.md`, `docs/review-triage.md`), report templates, the install manifest, the thin-wrapper fixture, and the affected tests are updated.

## Capabilities

### New Capabilities

- `unattended-audit-coordinator`: the shared goal-driven coordinator, its worker cycle, change resolution, worker-common contract, verification, commit, obstacle budget, and step machines.
- `audit-runtime-authorization`: `--runtime` as the whole authorization, the accessibility `--url` input, pending manual checks, and Not Applicable outcomes.
- `audit-report-verification`: the `lint.js audit-report` check and the `check-cited-paths.js audit-report` mode.

### Modified Capabilities

- `audit-command-options`: accessibility declares `--url`; the audit coordinator parses and rejects arguments; commands stay unattended with `--runtime`.
- `performance-runtime-diagnostics`: diagnostics run under `--runtime` with no Run/Skip question.
- `performance-report-shape`: the provenance line carries `**Diagnostics:**`.
- `accessibility-worker-bindings`: no runtime authorization question is forwarded; replacements ask none.
- `accessibility-audit`: delegation is mandatory only above five UI files.
- `cited-path-existence-check`: the `audit-report` mode joins the designated sections.
- `security-phase-worker`, `accessibility-phase-worker`, `performance-worker-instructions`: the workers take the change and options from the coordinator's brief, boot through `worker-common.md`, report `step-done`, and no longer resolve the change; accessibility runtime scanners run on `--runtime` alone; out-of-scope risks get at most a one-line note.
- `security-worker-bindings`, `accessibility-worker-bindings`: bindings render from the standalone template with create and continue calls only; the coordinator owns replacement.
- `security-step-gated-delivery`, `performance-step-gated-delivery`, `accessibility-step-gated-delivery`: worker active-step execution under `step-done` batches.
- `security-standalone-loading`, `performance-standalone-loading`, `accessibility-standalone-loading`: the worker boot adds `worker-common.md`; direct activations use `{audit}-steps@1`.
- `audit-command-progress-plans`: the standalone audits declare no panel plan; step state lives in the `sai-state` session.
- `security-worker-installation`, `accessibility-worker-installation`: wrappers load the shared audit coordinator, which fetches the binding.

## Impact

New files:
- `sai/commands/audit/coordinator.md`
- `sai/commands/audit/worker-common.md`
- `sai-state/machines/security-steps.js`, `sai-state/machines/performance-steps.js`, `sai-state/machines/accessibility-steps.js`
- `test/audit-coordinator.test.js`, `test/audit-report-checks.test.js`, and the wrapper fixtures under `test/fixtures/audit-legacy-commands/`

Modified files:
- `commands/{claude,opencode}/sai-{5-security,6-performance,7-accessibility}.md`
- `sai/commands/{security,performance,accessibility}/worker.md`, `options.md`, report templates, and `steps/*.md`
- `sai/tools/lint.js`, `sai/tools/check-cited-paths.js`, `sai-state/registry.js`, `bin/worker-matrix.js`, `sai/install-manifest.json`
- `openspec/schemas/sai-workflow/templates/{security,performance,accessibility}.md`
- `AGENTS.md`, `docs/commands/sai-{5-security,6-performance,7-accessibility}.md`, `docs/review-triage.md`, `fixtures/thin-command-wrappers-baseline.json`
- The coordinator, worker, install, step-machine, and option tests of the three audits

Not changed in this slice: `/sai-deep-review` still composes the former `sai/commands/{security,performance,accessibility}/coordinator.md` and `command-bootstrap.md` files and the `*-standalone@1` machines. The requirements that describe only that retained coordinator side stay unmodified until the slice that rebuilds `/sai-deep-review`: all of `security-phase-coordinator` and `accessibility-phase-coordinator`; the Carved Step Library and Coordinator Pointer Continuations requirements of `security-step-gated-delivery`, `performance-step-gated-delivery`, and `accessibility-step-gated-delivery`; the closed stage table, no-whitelist follow-load, minimal wire, silent ignore, and terminal done requirements of the three `*-standalone-loading` specs; `audit-progress-does-not-change-idea-progress-list`; and the registry, ownership, and inventory requirements of `security-worker-installation` and `accessibility-worker-installation`.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Request Additional Notes

Slicing assumption: `/sai-deep-review` still composes the three current audit coordinators until slice 2 rewrites it, so this slice keeps those coordinator files, their `command-bootstrap.md` files, and the three `*-standalone@1` machines in place, loaded only by `/sai-deep-review`; slice 2 completes their removal (I1, I9). In this slice, I10 covers the three audit commands' documentation and tests; the ADR and the `/sai-deep-review` documentation land with slice 2.
