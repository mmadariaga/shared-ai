> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

When a change's delta spec emptied a capability of every published requirement, `/sai-archive` refused before any mutation and redirected the user to `/sai-retire-docs`. The refusal blocked a retirement the OpenSpec CLI performs correctly, and the path it named has different semantics: `/sai-retire-docs` retires by moving a capability to `openspec/specs/_archived/<capability>/` behind a per-candidate confirmation gate, which is not what a change-driven retirement expresses. The result was a documented dead end (`sai/commands/archive/instructions.md:84-90`, `sai/commands/archive/worker.md:76-84`).

The refusal was defending a namespacing doctrine it never stated. This change scopes that doctrine by trigger instead of removing it: retirement with a change behind it flows through archive; retirement without one stays with `/sai-retire-docs`.

## What Changes

- `sai/commands/archive/instructions.md` — the "Capability-emptying delta refusal" section becomes "Capability-emptying delta retirement". Detection stays read-only, in the pre-flight, at the same point and by the same method; only the outcome changes. The section now defines the declaration `retire_capabilities: true` written into `openspec/changes/<name>/.openspec.yaml` before the CLI archive, its conditional/idempotent/veto rules, the fact that the modified `.openspec.yaml` travels with the change into `openspec/changes/archive/YYYY-MM-DD-{name}/` as the archived record of intent, the silence of the retirement across every route, the non-revert on CLI failure, the out-of-scope status of cross-capability reference validation, and the preserved ownership of `/sai-retire-docs` and `openspec/specs/_archived/`.
- `sai/commands/archive/instructions.md` — the blanket `.openspec.yaml` write prohibition attached to the unchecked-items gate is narrowed: `retire_capabilities` is permitted by name, while approval keys and new formal gates stay prohibited.
- `sai/commands/archive/worker.md` — the capability-emptying stop-text is removed. Detection now records the detected names as invocation-scoped `retired_capabilities` state and the terminal summary names each one, so the coordinator and the later commit gate show what the CLI will delete. The Direct Build execute order gains a step 0 that writes the key through Bash under the same conditions, before the unchanged CLI invocation. The mutation-prohibition block is narrowed correspondingly.
- `sai/commands/archive/coordinator.md` — a new "Retirement declaration" step owns the ordinary-route write, placed before the CLI archive, with the same skip conditions, formatting preservation, changed-files accounting, no-question rule, and no-revert-on-failure rule. The coordinator's ownership line now names the declaration among its mutating execution.
- `test/direct-build-archive-ordering.test.js` — the contract test is rewritten to assert the retirement behavior and the absence of the stop-text and of the `/sai-retire-docs` routing, and to assert that the coordinator owns the ordinary-route declaration.

The CLI invocation itself is unchanged: `openspec archive <name> --yes --json` remains the sole sync-and-move primitive, at the same sites, and the CLI remains the only component that deletes anything under `openspec/specs/**`.

## Capabilities

### New Capabilities

- **archive-capability-retirement-declaration** — archive completes a capability-emptying archive by declaring the retirement, silently, on every route, and reports the retired capabilities in its terminal summary.
- **archive-metadata-authorship** — archive holds one narrow, nominated write into the change's own `.openspec.yaml`, limited to the `retire_capabilities` key.

### Modified Capabilities

- **archive-capability-emptying-delta-refusal** — detection survives; the refusal outcome and the stop-text do not, and the `/sai-retire-docs` ownership claim is narrowed to retirement with no change behind it.
- **auto-fast-archive-execution** — the ordered mutation sequence of an authorized Direct Build archive gains a conditional declaration step before the CLI invocation.

## Impact

Modified files:
- `sai/commands/archive/instructions.md`
- `sai/commands/archive/worker.md`
- `sai/commands/archive/coordinator.md`
- `test/direct-build-archive-ordering.test.js`

New files:
- `openspec/changes/archive-retire-capabilities-key/.openspec.yaml`
- `openspec/changes/archive-retire-capabilities-key/proposal.md`
- `openspec/changes/archive-retire-capabilities-key/specs/archive-capability-emptying-delta-refusal/spec.md`
- `openspec/changes/archive-retire-capabilities-key/specs/archive-capability-retirement-declaration/spec.md`
- `openspec/changes/archive-retire-capabilities-key/specs/archive-metadata-authorship/spec.md`
- `openspec/changes/archive-retire-capabilities-key/specs/auto-fast-archive-execution/spec.md`

Known limitations left behind: the retirement deletes published spec files with no confirmation, and recoverability rests entirely on archive not committing and on the CLI's printed `git checkout` hint; if archive is ever chained to an automatic commit, that window disappears. Archive does not validate cross-capability references after a retirement, so a live capability citing the retired one is left dangling.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill
