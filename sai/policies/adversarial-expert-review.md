# Adversarial expert review

Single source of the adversarial expert review checkpoint that `/sai-explore`, `/sai-plan`, and `/sai-build` offer at one point of their run: the answer and its question, the worker cycle, the keep-or-revert decision, and the closing report lines. Each of the three commands places the checkpoint and owns the checks, commits, and publication around it; this file owns everything else.

Terms. **Checkpoint**: the point of a run where the product is complete and its route selection (explore), commit (plan), or close (build) has not happened. **Product**: what the checkpoint reviews — a set of change document files in **document mode**, or working-tree paths in **mutations mode**. **Approved scope**: in explore, the Goal, Scope, Non-goals, and Edge cases agreed in the conversation; in plan, the change document or `proposal.md` and `specs/`; in build, `proposal.md`, `specs/`, `design.md`, and `tasks.md`. **Correction**: the change the worker made for one finding. **Kept**/**reverted**: the fate of one finding's correction. **Reconciliation**: the coordinator's decision over the findings, in `auto` mode by itself and in `ask` mode with one user answer.

## The answer

`/sai-plan` and `/sai-build` hold one answer for the run: `no`, `auto`, or `ask`. `/sai-explore` holds none: its checkpoint always asks the reconciliation question, and it creates a worker only on a yes answer to its own question.

Resolve the answer once at Start, after the input checks have passed and before the first worker exists, so a run that ends at those checks asks nothing. The first source that yields a value wins, and nothing after it is asked:

1. The `--expert-review [no|auto|ask]` argument, from the separate or the attached `--expert-review=<value>` form, where a bare `--expert-review` is `auto`. Any other value, or a second `--expert-review`, ends the run before anything is written with: `Cannot start {command}: --expert-review takes no, auto or ask.`
2. The answer recorded in the run state (`plan-run@1` for `/sai-plan`, `implement-run@1` for `/sai-build`): its `expert_review` field. A resumed run reuses it, and asks nothing.
3. The question below.

A caller that runs `/sai-plan` or `/sai-build` as a segment passes `--expert-review no`; `/sai-explore`'s **Plan - Unattended** route does, and `/sai-build` passes it to its own `/sai-3-implement` segments, which strip it and run no checkpoint. An explicit argument replaces the recorded answer (E9), and the closing report says so when it differs. Record the answer with `emit <id> <machine> --set kind=expert_review --set value=<no|auto|ask>` as soon as the run that holds it exists, and record it again after a segment opens a fresh run under the same key.

**The Start question.** Ask it through Claude Code's `AskUserQuestion` or opencode's `question`, with the same text and options on both, in the conversation language. When the answer is `yes, ask me before keeping them`, the run's one later reconciliation question is one the user chose, so no step of the run waits for a human unexpectedly. Options, in this order, with stable values: `No` (`no`), `Yes, decide the corrections` (`auto`), and `Yes, ask me before keeping them` (`ask`). A cancelled question is `no`.

**A `no` answer creates nothing.** No worker, no report directory, and no write (E1).

## The checkpoint

Run it once per run, at the point the command names, after the product is complete; the command records the handled checkpoint as `expert_review_checkpoint` (`done`, or `skipped` when it ran nothing), so a resumed run reuses the answer and runs the checkpoint once (E10): when the run state already holds `expert_review_checkpoint`, skip the steps below, and the kept corrections already on disk travel in the command's commits as they would have:

1. Take the before-snapshot when the product is working-tree files: `node <tool-path> snapshot --cwd <project-root> <product and allowed paths>` for `review-delta.js`, resolved per `@sai/policies/tool-resolution.md`. It holds the user's earlier changes too, which is what makes both the worker's delta and a revert exact (E8).
2. Create the worker `sai-adversarial-expert-review-worker`: Fetch `@sai/orchestration/workers/bindings/adversarial-expert-review-worker.md` and follow it, with the ready handshake of `@sai/policies/worker-lifecycle.md`; open its report directory with `transfer.js open` and keep it for the run. Send one task message: `--report-dir <dir>`, then the brief that `sai/commands/adversarial-expert-review/worker.md` § Task message defines — mode, product (document files with their hashes, or the working-tree paths), approved scope, allowed write paths, scratch folder. In document mode the product files are exported with `sai-state block --export` and travel as path and hash.
3. Receive the report with `transfer.js receive --command adversarial-expert-review` and read no field before it answers (§ Receiver boundary of `@sai/policies/worker-report-transport.md`). Answer a `needs_input` report yourself from the product, the approved scope, and the repository, continue the same worker with the answer, and list it as an assumption in the closing report; when nothing settles it, answer with the best reading of the approved scope, so the checkpoint never waits for a human beyond its reconciliation question. A missing, invalid, or failed report costs one line in the closing report, and the run continues as after `no`; in mutations mode, take the after-snapshot first and revert every path of the worker's delta from the before-snapshot with `review-delta.js restore`, and say so in that line, so no unreported correction stays in the working tree and no later commit can carry one. Document mode reverts nothing, because the worker wrote only the report directory.
4. In mutations mode, take the after-snapshot and run `delta <before> <after>`: the paths it reports are the worker's delta. A delta path outside the product and the allowed write paths is reverted from the before-snapshot and reported, and its finding counts as discarded (E4).
5. Decide the fate of each finding (E3, E12): `auto` decides by itself; `ask`, and every explore checkpoint, asks the reconciliation question below once, before keeping any correction. Two findings whose corrections share a path are kept or reverted together. A finding that carries no correction, because a correction was outside the allowed write paths (E6), is reported and never decided.
6. Revert the discarded corrections: in mutations mode `node <tool-path> restore <before-snapshot> <the group's paths>` for `review-delta.js`, which writes the snapshot content back and removes the files the worker created, leaving the index untouched; in document mode, simply do not amend the stored document with a discarded correction. A reverted path the worker had created disappears with it.
7. Verify the kept state: run the checks and the tests the command names. When one fails, revert every worker change from the before-snapshot and say so (E5): the product equals its state before the checkpoint.
8. In document mode, amend each document whose correction is kept: verify the corrected copy against the `sha256` its `corrected_documents` entry reports, run `node <tool-path> check --document-file <corrected copy>` for `change-document.js`, judge a flagged line per `@sai/policies/block-hygiene-judgment.md` (an unflagged copy takes a `[]` verdicts file), and emit the amendment the command names. A copy that does not match its hash, or that fails the check, is discarded and its stored document stays (E7); the finding counts as discarded in the closing report.

In `auto` mode the coordinator decides the fate of each finding and asks nothing. The closing report states each decision with its reason, so a user keeps the same visibility as in `ask` mode.

**The reconciliation question.** Ask it through the native picker, in the conversation language, after the report and the delta are known. State the product, the number of findings per severity, and the coordinator's recommendation. Options, in this order:

- `Keep the recommended corrections` (`recommended`) — the corrections the coordinator would keep, and no others. This is the recommendation.
- `Keep all corrections` (`keep-all`) — every correction a finding carries.
- `Discard all corrections` (`discard-all`) — no correction is kept.

A free-text answer names identifiers, and the coordinator keeps exactly the corrections it names. A dismissed question keeps no correction: in mutations mode revert every worker change, in document mode leave the stored documents unchanged, and continue as after `no` (E12). When every finding comes without a correction, ask nothing and report them (E13). A review with no findings is reported in one line, with no reconciliation and no commit (E2).

## The findings

The worker forms each finding under `@sai/policies/artifact-review-contract.md`: severity `High`, `Medium`, or `Low`, that contract's identifier scheme, the artifact location, the issue, and the recommended correction. In mutations mode each finding also lists the working-tree paths its correction changed, which is what the keep-or-revert decision applies to. An observation whose fix needs behavior the approved scope does not ask for is a scope observation and never a finding.

## The worker

The worker is the routed role `sai-adversarial-expert-review-worker` of `sai/commands/adversarial-expert-review/worker.md`, created through the installed binding § The checkpoint names. Its model comes from the `worker-matrix` and the setup, so changing it needs no card edit (E11). It writes only the allowed write paths of its brief and its report; the coordinator decides and commits. Dispose it at its last use, as `@sai/policies/worker-lifecycle.md` § Dispose says.

## Closing report

Report the checkpoint with the run's other reports, in the conversation language:

- `Expert review: no findings.` when it found none.
- `Kept: <identifier> <issue> — <one-line reason>` for each kept correction.
- `Discarded: <identifier> <issue> — <one-line reason>` for each reverted correction.
- `Reported without correction: <identifier> <issue> — <what a later run must do>` for each finding that carried none.
- The scope observations of `@sai/policies/artifact-review-contract.md` when the review reported any.
- One line naming the check or test that failed and reverted every kept correction, when that happened.
- One line when the worker report was missing, invalid, or failed.
- Each question the worker asked, with the answer and its source.

Findings stay out of the repository: the checkpoint writes no report file, and a command's own review artifact is left as its review segment wrote it.
