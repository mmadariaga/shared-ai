> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

The adversarial expert review worker starts by loading a chain of SAI instruction files: its worker card, `worker-common.md`, `worker-report-transport.md` (36 KB), `worker-lifecycle.md` (15 KB), `issue-format.md` (22 KB), and several policy files. The chain costs roughly 100–120 KB of context, about 25–30k tokens, before the worker sees the product. Most of that material does not bear on the review; only the communication protocol (ready handshake, report file and hash, findings) is needed. The cost is paid on every review, in explore, plan, build, and Direct Build.

## What Changes

- Install `sai-adversarial-expert-review-worker` with a self-contained agent prompt that carries the communication protocol, the report schema, the boundaries, and the liveness guard. The caller supplies the mode-specific procedure and the task scope in the brief. The worker imports no SAI file, the review behavior and report schema stay the same, and the other managed agents render unchanged.
- I1: The installer adds `selfContained: true` and a per-worker `dispatchPrompt` to the `worker-matrix`; for the adversarial worker it inlines `workerContract` as the agent body, skips the canonical fetch chain, and renders the create prompt as ready-only. The other 14 agents render byte-for-byte identically.
- I2: The agent prompt carries the role, `event: ready`, the report protocol, the `findings` schema, the boundaries, and the liveness guard; the new `sai/commands/adversarial-expert-review/brief.md` carries the mode, product, scope, allowed paths, `--report-dir`, the `transfer.js` path, in document mode the `change-document.js` path, the report name, the scratch folder, the chat language, and the procedure. The prompt contains no `Fetch @` and no warming.
- I3: The report keeps the `adversarial-expert-review` validator schema: `findings` on `completed`, `corrected_documents` in document mode only, and no `outcome`; the worker returns only `{path, sha256}`, and an invalid report is treated as undelivered.

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- None

## Impact

Edge cases agreed for this change:
- E1: The installed agent body for `sai-adversarial-expert-review-worker` is self-contained: its contract, the `event: ready` handshake, the report protocol, and the `findings` shape with its severity criteria and scope-observation rule live in the prompt; the worker executes no `Fetch @` and reads no SAI policy file.
- E2: The caller's brief carries the mode (`document` or `mutations`), the product, the approved scope, the allowed paths, `--report-dir`, the `transfer.js` path, in document mode the `change-document.js` path, the report name, the scratch folder, the chat language, and the mode-specific procedure; the worker works only from those data.
- E3: The worker returns only the `{path, sha256}` reference of a report that matches the validator schema: `findings` on `completed`, `corrected_documents` in document mode only, and no `outcome`; an invalid report counts as undelivered.
- E4: The worker writes only the allowed paths, the scratch folder, and the report directory; the coordinator's existing delta check reverts any path outside the product and the allowed write paths, and discards its finding.
- E15: The other 14 managed agents keep their current fetch chain and prompt; the self-contained body is exclusive to the adversarial worker and keeps the liveness guard before writing, with no warming.
- E16: The crystallized-document review stays in explore with its trigger (`expertReview.explore` or the set question) and uses the same self-contained worker; the two reviews are independent and do not replace each other.

Scope of this change:
- The installed agent body for `sai-adversarial-expert-review-worker` contains the role, the `event: ready` handshake, the report protocol, the findings shape with its `High`/`Medium`/`Low` severity criteria and its scope-observation rule, the write boundaries, and the liveness guard.
- The agent body contains no `Fetch @` directive and reads no SAI policy file at review time.
- The worker saves each report, a `needs_input` report included, under a new name derived from the brief's report name with `transfer.js put --exclusive` and returns only the `{path, sha256}` reference; the report schema matches `worker-report-validator.js --command adversarial-expert-review` (`findings` on `completed`, `corrected_documents` in document mode only, no `outcome`).
- The caller sends a brief with the mode, product, approved scope, allowed write paths, `--report-dir`, the absolute `transfer.js` path, in document mode the absolute `change-document.js` path, the report name, the scratch folder, the chat language, and the mode-specific procedure.
- The worker writes only the allowed paths, the scratch folder, and the report; it runs no mutating git command, dispatches no subagent, and runs no `openspec` command.
- The worker runs the liveness guard before its first write after a shell command and before saving the report; the coordinator disposes the worker at its last use.
- The worker declares no warming chain and returns no `warming:` line.
- The installer supports a `selfContained` worker entry and a per-entry dispatch prompt; it inlines the worker contract as the agent body and renders the create prompt as ready-only for this worker.
- The other 14 managed agents keep their current body and their canonical `Fetch @` chain.
- The worker's document-mode and mutations-mode procedures live in a new `sai/commands/adversarial-expert-review/brief.md`; the worker receives them as message text.
- The change updates the affected tests and documentation; the review findings, severity, modes, positions, and report schema stay unchanged.

Non-goals of this change:
- Moving the Direct Build expert review or changing its trigger (slice 2).
- Changing the review's findings, severity, identifier scheme, modes, or report schema.
- Persisting findings in the repository.
- Changing the other managed agents, their models, or their fetch chains.
- Adding a new model or capability profile.
- Changing the crystallization review's position or trigger.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Proposal Research Documentation

**Local files**:
- None

**External URLs**:
- None

## Request Additional Notes

- The worker remains a routed managed agent; its model, effort, and variant stay in the `worker-matrix`.
- The first review, the crystallized-document review, keeps its position and trigger and uses the same self-contained worker.

## Additional Notes

Decisions agreed for this change:
- The worker's useful contract is the communication protocol, not the shared policy chain; a self-contained prompt plus a caller brief keeps the protocol and drops the rest.
- The prompt/brief split keeps one source for the protocol and lets each caller provide the procedure for its mode.
- The installer gets a per-worker self-contained variant instead of changing the 15 agents.
- Warming is removed for this one-shot worker; the coordinator still owns disposal and the liveness guard stays in the prompt.
