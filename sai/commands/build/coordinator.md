# `/sai-build` coordinator

Fetch @sai/policies/public-chat.md and follow it exactly.
Fetch @sai/policies/finding-state.md

You chain the segments of one build run in a single session. The invocation carries one string, `arguments_value`: the change name.

## Segments

1. `/sai-3-implement`: Fetch @sai/commands/implement/coordinator.md and follow it exactly as the first segment, with the same `arguments_value`. It resolves the change and runs the whole implementation. No wrapper is entered again and no approval is asked between segments.
2. `/sai-4-review`: Fetch @sai/commands/review/coordinator.md and follow it exactly as the second segment, with the same `arguments_value`. It reviews the diff in a fresh worker and writes `review.md`. It fixes nothing.
3. `/sai-3-implement` again, for the findings you select: follow `sai/commands/implement/coordinator.md` exactly as the third segment, with the same `arguments_value`. It applies every open fixable finding of `review.md` that carries no ` (EXCLUDED: …)` mark and marks each one it fixes. It starts only when the Assessment pass leaves at least one such finding. When it fixes a finding, it closes by storing the inherent-risk ratings block in `review.md` and committing it, as its own Close says.

No review runs after segment 3: one review pass runs per run, and the next `/sai-build` run reviews again.

A segment starts only when the previous one completed, including a segment 1 that completed with no new work. When segment 1 or segment 3 ends blocked (an escalation the user did not resolve), stopped, or with a failed precondition, print its report and end the run without a closing line, and do not start any later segment.

## Assessment pass

You run this pass yourself, once, after segment 2 completes and wrote `review.md`. It never runs when `review.md` holds no fixable finding (zero findings, or Questions only), and never in a worker.

1. Read `openspec/changes/{name}/review.md`. Read the code behind a finding whenever the heading and body do not let you judge it.
2. Judge each fixable finding (every finding except a Question) on its own: select it for fixing or exclude it. Use your judgment. Impact, the cost of the correction, and the risk of the correction are things you may weigh, never mandatory checks. No fixed selection rule, threshold, or severity cutoff applies: a High finding may be excluded and a Low one selected.
3. Append the exclusion mark to the end of each excluded finding's heading line: the literal ` (EXCLUDED: <reason>)` of `finding-state.md`. The reason is concrete, one line, and says why the fix is unwarranted. Change nothing else: the body, identifier, severity, and `Summary:` tally stay as they are. Never mark a Question.
4. When you wrote at least one mark, commit `review.md` alone under the Commit rule of `sai/commands/review/coordinator.md` § Close: check the path with `git check-ignore -q` first, `git add` it alone only when it is not ignored, and `git commit -m "<subject>" -- <path>`. The subject is a Conventional Commits message of at most 50 characters, for example `docs(review): mark excluded findings`. Authorship credits follow that same Commit rule. When the path is ignored, the marks stay on disk uncommitted. Never force-add with `-f`, never push, and commit nothing else. Invoking the command authorizes this one local commit.
5. Count the fixable findings with no mark. Start segment 3 only when that count is above zero. When you excluded every fixable finding, run no fix and go to the Close.

The assessment keeps no memory: a rerun regenerates `review.md` without earlier marks and judges every finding again.

## Close

After the last segment that ran ends, print the report of each segment. A segment's own closing line is replaced by this command's.

- **Segment 2 completed** (it wrote `review.md`): read `openspec/changes/{name}/review.md` again (segment 3 and the Assessment pass changed its headings) and print the finding counts from its `Summary:` tally by category (Critical, High, Medium, Low, Questions) and the `## Recommended Audits` block of segment 2's report. Run no audit. Then print, each only when it has entries:
  - **Fixed**: the findings whose heading carries ` (FIXED)`, with identifier and title.
  - **Excluded**: the findings whose heading carries ` (EXCLUDED: …)`, with identifier, title, and reason, followed by the recovery instruction: to apply one, remove its ` (EXCLUDED: …)` mark from the heading in `review.md` and run `/sai-3-implement {name}`.
  - **Left open by the fix segment**: each selected finding that segment 3 did not fix and left without a mark (its fix rounds ran out, it judged the finding mistaken, or the run stopped on an obstacle), with the reason from segment 3's report. Never list it as excluded.
  - **Questions**: say that Questions stay open until the user answers them, because the fix segment applies only fixable findings.
  - With zero findings, report the zero counts and print none of these lists.
  - End with exactly `Build done.`
- **Segment 2 found no changes against the parent branch**: say that no review ran, because there was nothing to review, and end with exactly `Build done.`
- **Segment 2 failed, was stopped, or could not start**: print both reports and end the run without a closing line.
