# `/sai-deep-review` coordinator

Fetch @sai/policies/public-chat.md and follow it exactly.
Fetch @sai/policies/remember.md
Fetch @skills/safe-operations/SKILL.md and use it.
Fetch @sai/policies/tool-resolution.md
Fetch @sai/policies/finding-state.md

You chain the segments of one deep-review run in a single session. The invocation carries one string, `arguments_value`: an optional change name and the options of step 1 of Start.

## Goal

Review a change, audit the areas the review flags, and fix the findings an Assessment pass leaves to fix, with no human in the loop. The run is done when `review.md` is written, every activated audit has its report or its failed status, and the fix segment has fixed what the Assessment pass left (or nothing was left). The run asks the user nothing between its start and its close. The only questions it can ask are the accessibility dev-server URL (an input, asked once, before the audits start), an audit worker question that nothing answers and whose answer would change the report (it pauses only that audit), and the escalation of an obstacle in the review or fix segment, as those coordinators define it.

Commits are local only and nothing is pushed. Only the `/sai-3-implement` fix segment changes code.

## Segments

1. `/sai-4-review`: Fetch @sai/commands/review/coordinator.md and follow it exactly as the first segment. It resolves the change, reviews the diff in a fresh worker, and writes and commits `review.md`. It fixes nothing. Its closing line `Review done.` is replaced by this command's.
2. Triage: read the audit activation from `review.md` (see Triage).
3. Audits: the audits the triage activated run in parallel, each as one cycle of `sai/commands/audit/coordinator.md` (see Audits).
4. Assessment pass: you judge the findings of `review.md` and of this run's audit reports (see Assessment pass).
5. `/sai-3-implement`: follow `sai/commands/implement/coordinator.md` exactly as the fix segment (see Fix segment). It starts only when the Assessment pass leaves at least one finding to fix.

No review or audit runs after the fix segment: the next `/sai-deep-review` run reviews the fixed tree.

A segment starts only when the previous one completed. When segment 1 or segment 5 ends blocked (an escalation the user did not resolve), stopped, or with a failed precondition, print its report and end the run without a closing line, and do not start any later segment.

## Start

1. Drop every `--fast-track` token from `arguments_value`, silently: the command already runs with no human in the loop. Fetch @sai/commands/review/options.md, @sai/commands/security/options.md, @sai/commands/performance/options.md, and @sai/commands/accessibility/options.md. The options this command accepts are exactly the union of the options those four files declare; this command keeps no list of its own. A token that starts with `--` is an option, and an option that takes a value consumes the next token as its value. The one token left over, when there is one, is the change name. An unknown option, a second leftover token, an option without its value, or a value outside the set a declaration lists prints this and ends the run, writing nothing: `Cannot start /sai-deep-review: unknown or malformed argument '{token}'. The parent branch is passed as --parent-branch <branch>.`
2. Run segment 1 with `arguments_value` set to the change name followed by `{options-for-review}`. `{options-for-X}` is the possibly empty list of the options that `sai/commands/X/options.md` declares, in the order and with the values the user wrote them. The review never receives `--full` or `--path`: it keeps reviewing the diff. An empty change name takes the only change with a `proposal.md`, as that segment says; keep the name it resolves for the rest of the run.

Report the options aimed only at an audit and given to a run in which that audit did not run, as the Close says.

## Triage

With `--full` or `--path`, no triage runs: all three audits are activated, because those options ask to look beyond the diff, and the Error close below does not apply.

Otherwise, after segment 1 completes, read exactly three values from `openspec/changes/{name}/review.md`: the `**Surface touched:**` field under each of `## Security Surface Triage`, `## Performance Surface Triage`, and `## Accessibility Surface Triage`. A value of exactly `Yes` activates the matching audit. A value of exactly `No` leaves it inactive. Any other value is illegible: that audit does not run, and the Close carries a warning line naming it. An illegible value gives no authority to correct it.

**Error close.** When `review.md` is missing, or none of the three values is legible, run no audit, no Assessment pass, and no fix segment. Print the gap (the path of `review.md` and the values that were not legible) and end the run without a closing line.

Activating an audit always regenerates its report, replacing any existing one. An inactive audit never touches its existing report. The activated audits keep the fixed order: security, performance, accessibility.

## Audits

Fetch @sai/commands/audit/coordinator.md. For each activated audit, run the cycle that file defines (its step 5 of Start, and its The worker, Close, and Obstacles sections), with `command_name` set to the audit and these values in place of its Start steps 1 to 4, which this command has already done: the change is `{name}`, the options are `{options-for-audit}`, and the report is `openspec/changes/{name}/{audit}.md`.

**Accessibility URL.** When accessibility is activated, the run has `--runtime`, and the run has no `--url`, ask the user for the dev-server URL now, before any audit worker exists, in one question that also lets them decline, as that coordinator's step 4 describes. An answer that is a URL joins the accessibility options. A decline hands the accessibility worker `--runtime` without a URL, and the runtime part of its report is marked unavailable. After this point, only a worker question that nothing answers and whose answer would change a report can reach the user, and it pauses only its own audit (see below).

**Parallel cycles.** Fetch the binding of each activated audit, `@sai/orchestration/workers/bindings/{audit}-worker.md`, and use it. Create the activated workers in one batch: several `Agent` calls in one turn on Claude Code, several `task` calls on opencode, each creation carrying only the ready prompt. Send the task messages, and every later message to a worker, the same way. Each cycle keeps its own `sai-state` session (key `{audit}-{name}`) and its own step machine `{audit}-steps@1`. The audit workers run in parallel; you do not. You issue every `sai-state` call and every commit one at a time, in the fixed order security, performance, accessibility, among the results that are ready, and you commit each verified report alone, with only its own path, under the Commit rule of that coordinator.

**Differences from the standalone audit.**

- A worker `question` is answered by you when the change, its artifacts, or the repository answer it: send the answer to the same worker and keep it as an assumption for the Close. When nothing answers it and the answer would change the report, put it to the user through the native picker, with options you write that each name a different way forward, as that coordinator's The worker section says. Only that audit's cycle waits for the answer: keep driving the other cycles meanwhile. When several questions are pending, ask them one at a time in the fixed order security, performance, accessibility. A question whose answer would not change the report is answered with your best reading and kept as an assumption.
- A worker that returns `failed`, or an obstacle whose budget of 3 attempts is exhausted, does not close the run and does not escalate. Record that audit as `failed` with its summary or last obstacle, commit nothing for it, and leave any earlier report of that audit as it was. The other audits finish.
- The closing line `{Audit} audit done.` and each cycle's own closing report are replaced by this command's Close. The `sai-state` session of a cycle is closed when that cycle ends.

A failed audit's findings never enter the Assessment pass and are never handed to the fix segment.

## Fixing

The fix tail runs only when segment 1 completed and at least one report holds a fixable finding. The reports are `review.md` plus the report of each audit that completed in this run, in the order review, security, performance, accessibility. Reports of audits that did not run, or failed, are not reports of this run: they stay unread and untouched. Fixable, open, and Question mean what `finding-state.md` says. When no report holds a fixable finding (zero findings, or Questions only), run no Assessment pass and no fix segment.

**Startable check.** Before the Assessment pass, check that `openspec/changes/{name}/` has `proposal.md`, `tasks.md`, and at least one file under `specs/`. When any is absent, run no Assessment pass and no fix segment, write nothing, and carry on to the Close, which prints `Cannot start /sai-3-implement for {name}: missing {list of the absent items}.` after the summary. The review and the audits stay done.

### Assessment pass

You run this pass yourself, once, after the audits end, over the reports above. It never runs in a worker.

1. Read each report. Read the code behind a finding whenever the heading and body do not let you judge it.
2. Judge each fixable finding that carries no ` (EXCLUDED: …)` mark on its own: leave it to fix or exclude it. Use your judgment. Impact, the cost of the correction, and the risk of the correction are things you may weigh, never mandatory checks. No fixed selection rule, threshold, or severity cutoff applies: a High finding may be excluded and a Low one left to fix.
3. Append the exclusion mark to the end of each excluded finding's heading line: the literal ` (EXCLUDED: <reason>)` of `finding-state.md`. The reason is concrete, one line, and says why the fix is unwarranted. Change nothing else: the body, identifier, severity, and `Summary:` tally stay as they are. Never mark a Question. Questions stay open for the user.
4. For each report in which you wrote at least one mark, in report order, commit that report alone under the Commit rule of `sai/commands/review/coordinator.md` § Close: check the path with `git check-ignore -q` first, `git add` it alone only when it is not ignored, and `git commit -m "<subject>" -- <path>`. The subject is a Conventional Commits message of at most 50 characters, for example `docs(review): mark excluded findings` or `docs(security): mark excluded findings`. Authorship credits follow that same Commit rule. When the path is ignored, the marks stay on disk uncommitted. Never force-add with `-f`, never push, and commit nothing else. Invoking the command authorizes these local commits.
5. Count the fixable findings with no mark, across the reports. Start the fix segment only when that count is above zero. When you excluded every fixable finding, run no fix and go to the Close.

The assessment keeps no memory: a rerun regenerates `review.md` and the activated audit reports without earlier marks and judges every finding again.

### Fix segment

Follow `sai/commands/implement/coordinator.md` exactly as segment 5, with the change name as `arguments_value`. Hand it the reports above as its Composition reports. It applies every open fixable finding of those reports that carries no ` (EXCLUDED: …)` mark, one RED and GREEN cycle per step with its own local commit, marks each finding it fixes, and runs the suites against the baseline it recorded. When it fixes a finding, it closes by storing the inherent-risk ratings block in `review.md` and committing it, as its own Close says. Its closing line `Implement done.` is replaced by this command's.

An interrupted fix segment resumes through that coordinator's own Resuming rule. Nothing else of this command resumes.

## Audit obstacles

An audit worker can fail to reach ready, stay silent, drift, or produce a report that fails the Verify check of the audit coordinator. Respond as that coordinator's Obstacles section says, per audit, with its budget of 3 attempts, except that an exhausted budget records the audit as `failed` instead of escalating (see Audits).

## Close

After the last segment that ran ends, print the report of each segment. A segment's own closing line is replaced by this command's.

- **Segment 1 completed** (it wrote `review.md`): read `openspec/changes/{name}/review.md` again (the Assessment pass and the fix segment changed its headings) and print the finding counts from its `Summary:` tally by category (Critical, High, Medium, Low, Questions) and the `## Recommended Audits` block of segment 1's report. Then print, each only when it has entries:
  - **Audits**: one line per audit that ran, with its status (`completed` with the counts of its `Summary:` tally and its report path, or `failed` with its reason) and whether its report was committed or left uncommitted because the project ignores it. When no audit was activated, say that no audit ran.
  - **Warnings**: one line for each triage value that was illegible, naming the audit that did not run because of it.
  - **Unused options**: one line for each option given to the run that only an audit that did not run declares, such as `--tier` when performance did not run, stating that it had no effect and naming the audit.
  - **Assumptions**: the assumptions you recorded for audit worker questions.
  - **Fixed**: the findings whose heading carries ` (FIXED)`, with source-qualified identifier (for example `review:C1` or `security:C1`) and title.
  - **Excluded**: the findings whose heading carries ` (EXCLUDED: …)`, with source-qualified identifier, title, and reason, followed by the recovery instruction: to apply one, remove its ` (EXCLUDED: …)` mark from the heading in its report and run `/sai-3-implement {name}`.
  - **Left open by the fix segment**: each finding left to fix that the fix segment did not fix and left without a mark (its fix rounds ran out, it judged the finding mistaken, or the run stopped on an obstacle), with the reason from that segment's report. Never list it as excluded.
  - **Questions**: say that Questions stay open until the user answers them, because the fix segment applies only fixable findings.
  - With zero findings, report the zero counts and print none of the finding lists.
  - When the startable check failed, print `Cannot start /sai-3-implement for {name}: missing {list of the absent items}.`
  - End with exactly `Deep review done.`
- **Segment 1 found no changes against the parent branch**: say that no review ran, because there was nothing to review, and that no audit, Assessment pass, or fix ran even with `--full` or `--path`. Print the unused-options lines for every option given that only an audit declares, then end with exactly `Deep review done.`
- **Segment 1 failed, was stopped, or could not start**: print its report and end the run without a closing line.
- **Error close**: it ended the run already, without a closing line.

The run commits `review.md` once through segment 1, then each verified audit report once, then each report in which the Assessment pass wrote marks once, then once per fix step through segment 5, then once more for the inherent-risk ratings block that segment 5 stores in `review.md` when it fixed a finding. It adds no other commit. A report the project ignores stays on disk uncommitted.

## Re-entry

A rerun of an interrupted `/sai-deep-review` goes through segment 1 again: it regenerates `review.md` and the activated audit reports and runs the Assessment pass again, because the assessment keeps no memory. Only the fix segment resumes, through the Resuming rule of `/sai-3-implement`.
