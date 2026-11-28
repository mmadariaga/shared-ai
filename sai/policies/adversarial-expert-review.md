# Adversarial expert review

Single source of the adversarial expert review checkpoint that `/sai-explore`, `/sai-plan`, `/sai-build`, and `/sai-direct-build` offer at one point of their run: the answer and its question, the worker cycle, the keep-or-revert decision, and the closing report lines. Each command places the checkpoint and owns the checks, commits, and publication around it; this file owns everything else.

Terms. **Checkpoint**: the point of a run where the product is complete and its route selection (explore), commit (plan), or close (build) has not happened. **Product**: what the checkpoint reviews — a set of change document files in **document mode**, or working-tree paths in **mutations mode**. **Approved scope**: in explore, the Goal, Scope, Non-goals, and Edge cases agreed in the conversation; in plan, the change document or `proposal.md` and `specs/`; in build, `proposal.md`, `specs/`, `design.md`, and `tasks.md`; in Direct Build, the change document. **Correction**: the change the worker made for one finding. **Kept**/**reverted**: the fate of one finding's correction. **Reconciliation**: the coordinator's decision over the findings, in `auto` mode by itself and in `ask` mode with one user answer.

## The answer

`/sai-plan`, `/sai-build`, and `/sai-direct-build` hold one answer for the run: `no`, `auto`, or `ask`. `/sai-explore` holds none of its own: it reads its project setting and then, when that key is absent, asks its own per-set question.

Resolve the answer once at Start, after the input checks have passed and before the first worker exists, so a run that ends at those checks asks nothing. The first source that yields a value wins, and nothing after it is asked:

1. The `--expert-review [no|auto|ask]` argument, from the separate or the attached `--expert-review=<value>` form, where a bare `--expert-review` is `auto`. Any other value, or a second `--expert-review`, ends the run before anything is written with: `Cannot start {command}: --expert-review takes no, auto or ask.`
2. The answer recorded in the run state (`plan-run@1` for `/sai-plan`, `implement-run@1` for `/sai-build`, `direct-build-run@1` for the explore Direct Build route): its `expert_review` field. A resumed run reuses it, and asks nothing.
3. The project setting: `expertReview.plan` for `/sai-plan`, `expertReview.build` for `/sai-build` and `/sai-direct-build` and the explore Direct Build route, read with `node <tool-path> get <id> --json --cwd <project-root>` (`project-settings.js`, resolved per `@sai/policies/tool-resolution.md`). Its three values are real: `no`, `auto`, and `ask`. Print its `warnings` verbatim, one line each, and print one line naming the setting id and its value when it answers. An absent key, an invalid value, and a tool that cannot run leave the next source.
4. The question below, for `/sai-plan` and `/sai-build`. Both Direct Build entries run unattended and ask nothing: there an unresolved answer is `no`.

A caller that runs `/sai-plan` or `/sai-build` as a segment passes `--expert-review no`, except that the **Plan - Unattended** route passes `auto` when `expertReview.plan` is `auto`, because that route can run a checkpoint without asking; `/sai-build` passes `no` to its own `/sai-3-implement` segments, which strip it and run no checkpoint. An explicit argument replaces the recorded answer (E9), and the closing report says so when it differs. Record the answer with `emit <id> <machine> --set kind=expert_review --set value=<no|auto|ask>` as soon as the run that holds it exists, and record it again after a segment opens a fresh run under the same key. `/sai-direct-build`, which has no store, keeps it in the conversation.

**`/sai-explore`.** It reads `expertReview.explore` before its per-set question and records nothing: `auto` and `ask` run the checkpoint without that question, `no` skips it, and an absent key keeps the yes/no question. With `auto` the coordinator decides each finding and asks nothing; with `ask`, and with a yes answer to the question, it asks the reconciliation question once.

**Non-interactive routes.** In the Plan - Unattended route and both Direct Build entries, only `auto` runs the checkpoint: `ask` and `no` skip it before any worker is created and open no question.

**The Start question.** Ask it through Claude Code's `AskUserQuestion` or opencode's `question`, with the same text and options on both, in the conversation language. When the answer is `yes, ask me before keeping them`, the run's one later reconciliation question is one the user chose, so no step of the run waits for a human unexpectedly. Options, in this order, with stable values: `No` (`no`), `Yes, decide the corrections` (`auto`), and `Yes, ask me before keeping them` (`ask`). A cancelled question is `no`.

**A `no` answer creates nothing.** No worker, no report directory, and no write (E1).

## Direct Build

The Direct Build checkpoint sits at `step-2c`, after the suite gate of Step 2b and before the backfill of Step 3, inside the run's first no-commit guard window. Its mode is mutations, and its product is the production files of the run's first-seen changed-path union: test files are excluded, and so is every path of the dirty git state recorded before the implementer dispatch unless the run changed it. The allowed write paths are that product; a write outside them is reverted and reported. The reviewer leaves the commit to the archive step: the checkpoint creates no commit, no guard window, and no commit grant. After kept corrections, the tests `test-select.js` selects for the corrected paths run once under `@sai/policies/test-execution.md`; only a new failure against the Step 2b classification counts, a flaky or pre-existing failure does not, and with no test suite found no test is rerun. A missing or invalid report, a failing check, or a failing test reverts every worker change, costs one line, and the route continues as after `no`. The answer is recorded as `expert_review` and the handled checkpoint as `expert_review_checkpoint` (`done`, or `skipped` when it ran nothing), in `direct-build-run@1` on the explore route and in the conversation for `/sai-direct-build`, which has no store and no resume.

## The checkpoint

Run it once per run, at the point the command names, after the product is complete; the command records the handled checkpoint as `expert_review_checkpoint` (`done`, or `skipped` when it ran nothing), so a resumed run reuses the answer and runs the checkpoint once (E10): when the run state already holds `expert_review_checkpoint`, skip the steps below, and the kept corrections already on disk travel in the command's commits as they would have:

1. Take the before-snapshot when the product is working-tree files: `node <tool-path> snapshot --cwd <project-root> <product and allowed paths>` for `review-delta.js`, resolved per `@sai/policies/tool-resolution.md`. It holds the user's earlier changes too, which is what makes both the worker's delta and a revert exact (E8).
2. Create the worker `sai-adversarial-expert-review-worker`: Fetch? `@sai/orchestration/workers/bindings/adversarial-expert-review-worker.md` and follow it, with the ready handshake of `@sai/policies/worker-lifecycle.md`; open its report directory with `transfer.js open` and keep it for the run. Send one task message: `--report-dir <dir>`, then the brief that `sai/commands/adversarial-expert-review/worker.md` § Task message defines — mode, product (document files with their hashes, or the working-tree paths), approved scope, allowed write paths, scratch folder. In document mode the product files are exported with `sai-state block --export` and travel as path and hash.
3. Receive the report with `transfer.js receive --command adversarial-expert-review` and read no field before it answers (§ Receiver boundary of `@sai/policies/worker-report-transport.md`). Answer a `needs_input` report yourself from the product, the approved scope, and the repository, continue the same worker with the answer, and list it as an assumption in the closing report; when nothing settles it, answer with the best reading of the approved scope, so the checkpoint never waits for a human beyond its reconciliation question. A missing, invalid, or failed report costs one line in the closing report, and the run continues as after `no`; in mutations mode, take the after-snapshot first and revert every path of the worker's delta from the before-snapshot with `review-delta.js restore`, and say so in that line, so no unreported correction stays in the working tree and no later commit can carry one. Document mode reverts nothing, because the worker wrote only the report directory.
4. In mutations mode, take the after-snapshot and run `delta <before> <after>`: the paths it reports are the worker's delta. A delta path outside the product and the allowed write paths is reverted from the before-snapshot and reported, and its finding counts as discarded (E4).
5. Decide the fate of each finding (E3, E12): `auto` decides by itself; `ask` mode (explore's `expertReview.explore: ask` included), and an explore checkpoint whose yes/no question was answered `Yes`, ask the reconciliation question below once, before keeping any correction. Two findings whose corrections share a path are kept or reverted together. A finding that carries no correction, because a correction was outside the allowed write paths (E6), is reported and never decided. In `auto` mode, once every finding is decided and before step 6 reverts a discarded correction or step 8 amends a stored document, print one summary line with two counts per severity: **reported**, the findings the review returned, and **accepted**, the findings whose corrections the decision keeps, for example `Expert review: reported High=1 Medium=2 Low=0; accepted High=1 Medium=0 Low=0`. The count reports the decision: a kept correction that step 7 reverts, and a corrected copy that step 8 discards, are named in the closing report. A review with no findings prints no summary line (E2).
6. Revert the discarded corrections: in mutations mode `node <tool-path> restore <before-snapshot> <the group's paths>` for `review-delta.js`, which writes the snapshot content back and removes the files the worker created, leaving the index untouched; in document mode, simply do not amend the stored document with a discarded correction. A reverted path the worker had created disappears with it.
7. Verify the kept state: run the checks and the tests the command names. When one fails, revert every worker change from the before-snapshot and say so (E5): the product equals its state before the checkpoint.
8. In document mode, amend each document whose correction is kept: verify the corrected copy against the `sha256` its `corrected_documents` entry reports, run `node <tool-path> check --document-file <corrected copy>` for `change-document.js`, judge a flagged line per `@sai/policies/block-hygiene-judgment.md` (an unflagged copy takes a `[]` verdicts file), and emit the amendment the command names. A copy that does not match its hash, or that fails the check, is discarded and its stored document stays (E7); the finding counts as discarded in the closing report.

In `auto` mode the coordinator decides the fate of each finding and asks nothing; it prints the summary line of step 5 and no findings list. The closing report states each decision with its reason, so a user keeps the same visibility as in `ask` mode.

**The reconciliation question.** Ask it through the native picker, in the conversation language, after the report and the delta are known, and only where it is due: `ask` mode (explore's `expertReview.explore: ask` included), and an explore checkpoint whose yes/no question was answered `Yes`. Before the picker, print the `Recommended:` line and then the findings list:

- **The `Recommended:` line.** `Recommended: <ids>`, where `<ids>` are the identifiers of the corrections the coordinator recommends keeping, so `Keep the recommended corrections` has concrete content; the line reads `Recommended: none` when it recommends none.
- **The findings list.** Every finding, ordered `High` → `Medium` → `Low` and by ascending identifier, rendered with the five fields and their order of `@sai/policies/artifact-review-contract.md` § Finding shape — `Identifier`, `Severity`, `Artifact location`, `Issue`, `Recommended correction` — in the conversation language, with identifiers, paths, and severities literal. A finding without a correction appears in the list and stays outside the decision (E6).

The list lives only in the chat: the checkpoint writes no findings file, and the closing report keeps the per-finding detail. Then state the product, the number of findings per severity, and the coordinator's recommendation. Options, in this order:

- `Keep the recommended corrections` (`recommended`) — the corrections the coordinator would keep, and no others. This is the recommendation.
- `Keep all corrections` (`keep-all`) — every correction a finding carries.
- `Discard all corrections` (`discard-all`) — no correction is kept.

A free-text answer names identifiers, and the coordinator keeps exactly the corrections it names. A dismissed question keeps no correction: in mutations mode revert every worker change, in document mode leave the stored documents unchanged, and continue as after `no` (E12). When every finding comes without a correction, ask nothing and report them (E13). A review with no findings is reported in one line, with no findings list, no reconciliation question, no summary line, and no commit (E2).

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
