# ADR 0222: `/sai-plan` asks its publication answer at the start of the run

<!-- adr-index: supersedes 0209b -->

## Status

Accepted. Supersedes decision 4 of ADR 0209b (separate and exact remote approval), only for runs that hold a recorded publication answer. Decisions 1, 2, 3, 5, and 6 of ADR 0209b stay in force, except that the offer they place after planning moves to the start of the run (decision 1) and, for such a run, the same answer is the approval that decision 3 asks for the local plan commit. ADR 0209b is not edited, because existing records are never edited in place. The interactive `/to-pr` flow keeps the approval rule of ADR 0209b decision 4 for every invocation that does not hold a recorded answer.

## Context

ADR 0209b made the draft PR/MR of a completed plan an optional offer after planning, followed by two approvals: the exact plan-file inclusion, and the exact remote push and request. An unattended `/sai-plan` run therefore still waited for a human at its end, although every step before it ran with no human in the loop. The post-completion offer also sat in `sai/commands/plan/coordinator.md`, and two further approvals sat in `sai/commands/plan/publication.md`.

The Direct Build route already shows the alternative: selecting the route is the held confirmation that pre-authorizes its local commits, so nothing later in the run asks again. A publication answer collected once, up front, has the same shape.

## Decision

1. **The answer is resolved at the start of the run.** `/sai-plan` resolves the publication answer after its input checks pass (block file and hash verification, change resolution) and before its first worker is created, so a run that ends at those checks asks nothing. The first value found wins and nothing after it is asked: the `--publish yes|no` argument, then the answer recorded in the `plan-run@1` run state, then the `pr.publishAfterRun` project setting when it reads `yes` or `no`, then one question. The question names the current branch, its remote, and the draft state of the request (a new request is created as a draft; an open request keeps its state), so a `yes` confirms that exact operation. Claude Code asks through `AskUserQuestion` and opencode through `question`, with the same text and options. `ask`, an absent key, and an invalid setting value lead to the question, and an invalid value also prints the settings tool's warning.
2. **The answer is recorded in the run state.** `run-core.js` gains an opt-in `publication` field (`yes` or `no`) and event, and `plan-run@1` opts in, so the answer survives a compaction and a resumed run. A resumed run without `--publish` reuses the recorded answer and asks nothing. An explicit `--publish` value replaces a recorded answer, and the closing report says so. The planned design recorded the answer once per run and rejected a different value; the functional review of this change replaced that with the replacement rule, because the first source in the order is the argument and an explicit instruction given on a resumed run has to prevail. `implement-run@1` and `merge-run@1` do not opt in.
3. **A `yes` is the held confirmation for exactly three operations.** The answer authorizes the plan-document commit, the non-force push of the current branch, and the creation or update of its request, in the sense of `safe-operations`, as the Direct Build route grant does. It authorizes nothing else. A run that fails, stops, or ends on an unanswered escalation publishes nothing, whatever the answer. A `no` leaves the branch and the remote untouched and asks nothing at the end.
4. **`to-pr.js --unattended` serves only that coordinator.** The flag exists on `plan-commit`, `push`, and `publish`, is enabled by the flag alone and never by a field of the input, and replaces the `approved` and `confirmation` token checks of those operations. Every other check stays: the staged-content check and recheck of `plan-commit`, the remote verification after a push, the exact baseline reread, and the description checks. The tool refuses, with a `refusal` cause, a force push, the provider's default branch, a detached HEAD, a publication of a branch that is not at the pushed commit, and a branch whose last request was merged or closed when no open request exists. Each provider adapter (GitHub, GitLab, Azure DevOps) reports merged and closed requests for the branch. An open request is updated and keeps its draft or ready state, and `draft:true` decides only the state of a request created now. `skills/universal/to-pr/SKILL.md` states the mode in its own section and limits it to a SAI coordinator that holds a recorded publication answer of `yes`; a user's `/to-pr` invocation keeps sections 1 to 4 and every approval in them.
5. **Publication runs after the last local commit and never stops the run.** With a `yes`, the plan coordinator publishes after its last local commit (the telemetry commit included) and before its closing line, through `sai/commands/plan/publication.md`, which now asks neither the inclusion question nor the remote question. A detached HEAD, the default branch, a missing provider or remote, a failed authentication, a rejected push (never retried with force), or a merged or closed request skips the publication with its reason in the closing report, and the run still counts as completed. Standalone `/sai-1-spec` and `/sai-2-design` gain no question. Until Explore hands its own answer over through `--publish`, Explore's Plan route asks the same start question inside the route in place of the closing offer.

## Alternatives Considered

- **Keep the post-completion offer and make only the publication unattended** — rejected: the run would still wait for a human at its end.
- **Remember the answer only in the conversation** — rejected: a compaction or a resumed run loses it.
- **Remember the answer only in the project setting** — rejected: a per-run answer without a setting would not survive a resumption, and a setting cannot carry the answer of one run.
- **Deliver the provider mark-ready operation and the `implement-run@1` exposure in the same change** — rejected: nothing in `/sai-plan` uses them, and they belong to the `/sai-build` slice of the same issue family.

## Consequences

- An unattended run publishes without a final look at the request text; the user accepts this when answering `yes`.
- Plan documents that the repository ignores enter the plan commit without a per-file approval. The commit still takes only the paths `plan-query` lists, through a private index, and unrelated staging and working files stay untouched.
- The tool trusts the coordinator to use `--unattended` only with a recorded `yes`: the flag cannot verify the run state, so the rule lives in the skill section and the coordinator card.
- The unattended target branch is the one `destination` resolves, the provider default branch unless the run gives another; an ambiguous destination skips the publication instead of asking.
- A published request carries every committed change of the branch, so it is not necessarily documents-only.
- The merged-and-closed query and the `publication` field are the parts the `/sai-build` slice reuses; its mark-ready operation and its own start question are outside this record.
- The published specifications `plan-command` and `plan-artifact-publication` still describe the closing offer until the change's delta specs are archived.

## Provenance

Change `pr-publication-answer-at-plan-start`, decision "A new ADR supersedes decision 4 of ADR 0209b (separate and exact remote approval) for runs that hold a recorded publication answer".
