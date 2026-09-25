# Terminal Lifecycle

Run once, after the Step loop has closed every Step (Step commit gates included). A run that stops for a human before this point runs none of it. Sections run in this order.

## 0. Terminal suite gate

Run the plan's full-suite command (coordinator § Verification commands) once, verbatim. A pass continues to § 1.

When the plan's `## Verification commands` section lacks the command, the command cannot run, or the suite fails, report the command and the failure and stop: §§ 1–5 do not run, and neither the Functional checks nor the synthetic terminal entry is marked. Every Step is already committed, so the next `/sai-4-apply` run finds every Step done, re-enters here, and runs the suite afresh.

A plan with no `## Verification commands` section predates this gate: print exactly `> Terminal suite gate: skipped — plan has no full-suite command` and continue to § 1.

## 1. Terminal functional review

Coordinator-owned empirical re-verification of the plan's Functional checks: no worker dispatch, no RED/GREEN cycle, no recovery slot, no commit.

- **Coverage:** every unmarked Functional `- [ ]` checkbox in `implementation.md`, across all Steps and `*Deferred from Step N*` blocks. A Functional block has the header `**Functional (...)**` or the legacy `**Human (...)**`; both read the same. Italic parenthetical notes are not checks. Already-marked `[x]` checks and Automated checks are not re-run.
- **Verdicts:** re-exercise each check against the current working tree and assign exactly one: `pass`, `fail`, or `unverifiable` with a one-line reason. `unverifiable` means the check needs human senses and has no runnable surface.
- **Write:** mark `[x]` exactly the `pass` checks. This is the review's only write.
- **Hold:** keep every verdict in memory and print nothing now; § 5 prints them. `fail` and `unverifiable` checks stay `- [ ]` as pending human review, a valid end state. Verdicts are never persisted: a re-entry re-derives them.

Findings never block anything: no auto-fix, no recovery, no selector.

## 2. Final sweep

Scan all of `implementation.md` and confirm every **Automated** checkbox is `[x]`. An unchecked Automated item means the Step loop is unfinished: report it and resume the loop at that Step. Unmarked Functional checkboxes never block the sweep.

## 3. Learnings promotion

Once, after a passing sweep. Candidates come from the complete `## Appendix: Plan vs Final Implementation`, with the workers' field-6 learnings as a supplementary source. Promote once per run, never per Step and never through a worker.

A candidate qualifies only when it names a repository-level artifact, not a symbol or file this change introduced or renamed. Use that artifact as the section key, supersede key, and reader anchor, and the candidate's `**Final:**` value as what works instead. Write only the root `SAI_LEARNINGS.md`, in its four-section format per `@sai/policies/sai-learnings-format.md`; create no empty file when nothing qualifies. When you write it, disclose the path, the entries added and superseded per section, and any contradicted pre-seeded keys.

## 4. Terminal documentation commit

**Eligible set**, from the terminal working tree (tracked and untracked), and nothing else:

- changed paths under `docs/**`;
- root `SAI_LEARNINGS.md`, only when § 3 wrote it in this run;
- root `GLOSSARY.md` when changed (tracked-modified or untracked). Never resolve it from `openspec/changes/{change-name}/`.

`openspec/changes/**`, `implementation.md`, the changed-files union, per-Step add-lists, and unrelated paths are outside the set. When the set is empty, skip the rest of this section: no message, no question.

1. **Visibility listing.** Print the eligible paths under `Will be committed` and every other working-tree path under `Will NOT be committed`. The listing never touches the index and uses no Step number, report, or plan cross-check.
2. **Message.** Propose one per `@sai/policies/commit-rules.md`, describing only the eligible paths.
3. **Authorization.** Ask through commit-rules § Authorization gate; an active `session_commit_authorized` skips only the ask.
4. **Commit.** On authorization, `git add -- <eligible paths>` exactly, then `git commit`. Never `git add -A` or a broad fallback. On `no`, leave the files in the working tree, say what remains uncommitted, and continue without retrying.

## 5. Print and stop

Invoke the bound `terminal_navigation` action (coordinator § Terminal navigation). The **print cluster** is the last user-visible block of the run, printed exactly once and identical with or without fast-track:

- **(a) Findings:** each held `fail` / `unverifiable` check with its reason, as pending human review, plus one recommendation line in the user's input language (English fallback). Silent when every check passed or there were none.
- **(b) Target:** the standalone completion literal of `invocation.md` § Completion, or, for a non-final chained apply, the composition transition.

Nothing prints between (a) and (b). The projection's synthetic terminal entry turns `completed` when the cluster prints, even when (a) is silent.
