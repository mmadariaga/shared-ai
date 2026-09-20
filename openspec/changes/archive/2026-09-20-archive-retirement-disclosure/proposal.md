> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

`sai/commands/archive/instructions.md` asserted that the post-archive commit gate remains the
human checkpoint for a capability retirement, and that the absence of a commit is what keeps the
deletion recoverable. Both claims are false on two of three routes: `--fast-track` suppresses the
commit selector and the Direct Build (unattended) route commits without supervision, so a
published capability spec is deleted and committed inside a single invocation with nobody
watching. The contract therefore published a safety net that does not exist, and on exactly those
two routes nothing disclosed that a retirement had happened at all.

Detection and recovery are separate guarantees. Recovery never failed — git holds the deleted
spec on every route. Only detection was lost on the unattended routes, so the implemented remedy
is disclosure plus a truthful justification, not a new gate.

## What Changes

- `sai/commands/archive/instructions.md`: the capability-retirement silence bullet's two false
  claims are replaced. The human decision is relocated upstream to the capability-emptying delta
  the author wrote into the change; the commit gate is explicitly disqualified as the checkpoint,
  naming `--fast-track` selector suppression and unattended Direct Build committing as the
  reason; recovery is stated as git on every route; and `retire_capabilities: true` travelling
  with the change into `openspec/changes/archive/YYYY-MM-DD-{name}/.openspec.yaml` is stated as
  the durable record of the declaration.
- `sai/commands/archive/instructions.md`: the disclosure bullet is rewritten to require the
  visible output to name every retired capability id, emitted identically on the ordinary route,
  under `--fast-track`, and under Direct Build, conditioned solely on a retirement having
  occurred, with every id named when several are retired.
- `sai/commands/archive/instructions.md`: a new bullet states that the disclosure is pure output —
  no options, no answer accepted, no waiting, unable to block or fail the invocation — and fixes
  the ordinary-route sequence: the disclosure precedes `openspec archive <name> --yes --json`,
  the commit gate comes last, and declining the commit there does not undo a deletion the CLI has
  already performed on disk.
- `sai/commands/archive/worker.md`: the Direct Build execute continuation's commit rules now
  require every recorded `retired_capabilities` id on its own line in the commit message **body**,
  never in the subject, under two independent conditions (a retirement was recorded, and a commit
  is actually created), leaving the empty-index guard and the amend/push/force-push prohibition
  unchanged. The continuation's terminal summary also names every retired id.
- `sai/commands/archive/archive-commit-gate.instructions.md`: a new section carries the same
  route-neutral body-line rule for the message-authoring paths this gate owns — the new-commit
  path and the fast-track path — explicitly excluding `git commit --amend --no-edit`, which
  authors no message, and altering neither the subject, the skip rule, the staged paths, the
  empty-index guard, nor the pushed-HEAD guard.
- `sai/commands/archive/coordinator.md` is deliberately untouched: its description of selector
  suppression under `fast_track_active` was the evidence of the defect, never the defect.

## Capabilities

### New Capabilities

None. No new capability is introduced.

### Modified Capabilities

- `archive-capability-retirement-declaration` — the silence requirement's justification is
  replaced, and the retired-capability report becomes a route-identical, non-blocking disclosure
  with a defined ordinary-route position.
- `sai-archive-commit-gate` — gains the requirement that the authored commit message body names
  every retired capability id.
- `auto-fast-archive-execution` — gains the requirement that the Direct Build commit body and the
  continuation's terminal summary name every retired capability id.

## Impact

Modified files:
- `sai/commands/archive/instructions.md`
- `sai/commands/archive/worker.md`
- `sai/commands/archive/archive-commit-gate.instructions.md`

New files:
- `openspec/changes/archive-retirement-disclosure/.openspec.yaml`
- `openspec/changes/archive-retirement-disclosure/proposal.md`
- `openspec/changes/archive-retirement-disclosure/specs/archive-capability-retirement-declaration/spec.md`
- `openspec/changes/archive-retirement-disclosure/specs/sai-archive-commit-gate/spec.md`
- `openspec/changes/archive-retirement-disclosure/specs/auto-fast-archive-execution/spec.md`

Accepted trade-offs: unsupervised, committed deletion of a published capability spec stays
accepted on `--fast-track` and Direct Build, with git as the only recovery path; SAI takes on the
author's behalf a call the OpenSpec CLI leaves to the author, and says so rather than hiding it;
a required output literal plus a commit-body line add contract surface to two archive files.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill
