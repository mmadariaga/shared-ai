> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

The capability-retirement declaration introduced by `archive-retire-capabilities-key` was specified against assumed OpenSpec CLI semantics. Reading the CLI shows three of those assumptions are wrong:

- `retire_capabilities: false` is indistinguishable from an absent key (`change-metadata.js:221-223`), so the "skip as an explicit user veto and let the CLI proceed" rule produces a repeating `archive_spec_validation_failed` with no exit for the author.
- The marker is ignored, and the change becomes unreadable to `openspec status` — the first step of archive's own pre-flight — when `.openspec.yaml` lacks the required `schema:` key.
- The CLI still refuses a declared retirement when the published spec carries any `##` section other than `## Purpose` above its requirements (`specs-apply.js:553-580`).

The contract therefore promised outcomes the CLI cannot deliver. This change corrects it so archive declares only when the declaration can succeed, and so every ambiguous state resolves away from deletion rather than toward it. It additionally closes the drift between the ordinary route and the Direct Build (unattended) route, where the declaration was absent from the closed-order content enumeration.

## What Changes

- `sai/commands/archive/instructions.md` — the "Capability-emptying delta retirement" section gains a **Declaration preconditions** block with four blocking conditions (author veto, unhonoured value, unaccounted content, metadata precondition) plus the all-or-nothing rule. The `retire_capabilities: false` skip-and-proceed bullet is replaced by an author-veto refusal that names both remedies. Idempotence and veto are judged on the parsed YAML value rather than the literal text of the line. The write is specified as a parse-verified replace-in-place with a post-write re-parse that blocks the CLI invocation on failure.
- `sai/commands/archive/worker.md` — the read-only pre-flight records every blocking condition as invocation-scoped state alongside `retired_capabilities` and mirrors the refusals as terminal results carrying the stated way forward, returning no mutation plan and no prepared execution order in that closure. Step 0 of the Direct Build execute order re-checks the same preconditions against the current files and applies the same replace-in-place and re-parse rules, returning a closed `failed` result rather than running the CLI archive. The closed-order content enumeration names the retirement declaration, so an order carrying it is not an altered order.
- `sai/commands/archive/coordinator.md` — the ordinary-route "Retirement declaration" step mirrors every rule above, and the Direct Build preparation block names the declaration as a member of the plan and of the validated execution order.
- `test/direct-build-archive-ordering.test.js` — assertions move from section headings to rule bodies, and a cross-file loop asserts each shared retirement rule across all three contract files, so a rule present in one file and missing from another fails the suite. 9/9 tests pass.

Behavioural boundaries preserved by the implementation: every addition is a refusal or a read-only check — no route gains a question or a gate, `--fast-track` and Direct Build behave identically to the ordinary route, archive gains no move or delete power under `openspec/specs/**`, and with no capability-emptying delta detected none of the new checks run and `.openspec.yaml` is not touched.

Rejected alternatives that shaped the result, recorded as context only: dropping the veto concept, declaring anyway and handling the CLI refusal afterwards, having archive create a missing `.openspec.yaml` with a default schema, and coercing an unhonoured `retire_capabilities` value to `true`.

## Capabilities

### New Capabilities

None — this change modifies capabilities published by `archive-retire-capabilities-key` and its neighbours.

### Modified Capabilities

- `archive-capability-retirement-declaration` — the declaration becomes conditional on preconditions that can be verified read-only, and four refusal paths are added, each a stop with a named remedy.
- `archive-metadata-authorship` — the nominated `.openspec.yaml` write is specified precisely enough to be performed safely by a Bash-only worker: parse-verified replace-in-place, never append, never create the file, never author a `schema:` value, re-parse afterwards.
- `archive-capability-emptying-delta-refusal` — detection still never blocks the archive by itself, but a verified blocking condition on the declaration now produces a terminal refusal instead of proceeding.
- `auto-fast-archive-execution` — step 0 of the ordered archive mutations re-checks the preconditions and may close the order as failed, and the declaration is a named member of the closed execution order.

## Impact

Modified files:

- `sai/commands/archive/instructions.md`
- `sai/commands/archive/worker.md`
- `sai/commands/archive/coordinator.md`
- `test/direct-build-archive-ordering.test.js`

New files:

- `openspec/changes/archive-retirement-declaration-hardening/.openspec.yaml`
- `openspec/changes/archive-retirement-declaration-hardening/proposal.md`
- `openspec/changes/archive-retirement-declaration-hardening/specs/archive-capability-retirement-declaration/spec.md`
- `openspec/changes/archive-retirement-declaration-hardening/specs/archive-metadata-authorship/spec.md`
- `openspec/changes/archive-retirement-declaration-hardening/specs/archive-capability-emptying-delta-refusal/spec.md`
- `openspec/changes/archive-retirement-declaration-hardening/specs/auto-fast-archive-execution/spec.md`

Known limitations and deferred work, left outside normative requirements: the safety-net question — whether the retirement's silence survives the fact that `--fast-track` and Direct Build auto-commit the deletion (`coordinator.md:191`) — is deliberately deferred; renaming the `archive-capability-emptying-delta-refusal` capability and its stale scenario headings needs its own ADD-only change; and a capability whose published spec carries a non-`Purpose` section cannot be retired through archive until that content is moved.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill
