# `/sai-2-design` coordinator

Fetch `@sai/policies/public-chat.md` and follow it exactly.
Fetch `@sai/policies/remember.md`
Fetch `@skills/safe-operations/SKILL.md` and use it.
Fetch `@skills/budget/SKILL.md`
Fetch `@sai/policies/tool-resolution.md`
Fetch `@sai/policies/cache-warming.md`
Fetch `@sai/commands/plan/cycle.md` and follow it for everything this card does not state.

You are the driver of the segment. The invocation carries one string, `arguments_value`: the change name, optionally followed by feedback.

## Goal

Design the change from its approved `proposal.md` and `specs/` into a reduced `design.md` and `tasks.md`, and into code: the interface stubs and the failing tests of the whole change (the plan tests), with no human in the loop. The segment is done when `design.md` and `tasks.md` exist and satisfy the design worker's verification, every step of `tasks.md` carries its tests or its closure criterion, every named plan test exists and is red by assertion (or marked as a regression guard), every mechanical check passes, the artifacts and the plan tests went through up to 3 incremental review rounds, and the segment's paths are committed locally (or left on disk when the project ignores them). The plan tests are committed failing, never skipped. A human is needed only for force majeure. The command stops before implementation.

Running this command approves the specs: it asks nothing about them, and the design worker stamps the approval.

## Start

1. Drop every `--fast-track` and `--supervised` token or line from `arguments_value`: both are accepted and ignored, and no banner is printed. Any other token that starts with `--` (`--overview-lang` included, which no longer exists) prints this and ends the run, writing nothing: `Cannot start /sai-2-design: unknown option {token}.`
2. The first remaining token is the change name, and the rest is feedback. An empty remainder takes the only change directory under `openspec/changes/` (archive excluded) that has a `proposal.md`. When there are none or several, print this and end the run, writing nothing: `Cannot start /sai-2-design: name the change ({candidates, or none}).`
3. The change is startable when `openspec/changes/{name}/` has `proposal.md` and either at least one file under `specs/` or a `.openspec.yaml` that sets `skip_specs: true` (a change declared to have no specs). Otherwise print this and end the run, writing nothing: `Cannot start /sai-2-design for {name}: missing {list of the absent items}. Run /sai-1-spec first.`
4. Open the run per the cycle's Opening the run; inside `/sai-plan` it is already open. Emit `segment-start` with the segment `design`, then `reset` `design-steps@1`. Write the feedback verbatim to `feedback.md` in the run directory when there is any. The mode is a first draft when `design.md` is absent and a rerun otherwise; a rerun also updates the plan tests, the stubs, `design.md`, and `tasks.md` in place, in new commits. Feedback on a change without `design.md` is extra guidance for the first draft.
5. Record the commit paths' dirty baseline per the cycle's Commit rule.

## The segment

The segment has two phases in one run: the design worker writes `design.md` and `tasks.md`, then the plan RED worker writes the stubs and the plan tests that `tasks.md` names, and the review covers both. The design worker stays alive through the review, because a fix round on the tests may need a plan change.

### Phase 1: the design

Fetch `@sai/orchestration/workers/bindings/design-worker.md` and use it. The worker is `sai-2-design-worker`. Its steps, in the order the static fallback uses, are `design-intake` (inline), then `research`, `design`, `tasks`, each at `sai/commands/design/steps/{step}.md`. The task message opens with the first pointer, then names the change, the mode (`first draft` or `rerun` with `feedback_file`), the report name, the run directory, and, inside `/sai-plan`, the valid research pointers that the cycle's Research hand-over checks right before you compose it (`inherited research:`, one `<path> <sha256>` per line; the line is left out when none is valid). Run alone, the brief carries none. The first task message to a worker, a replacement included, opens with the `--report-dir` line the cycle's Reports names. Run the mechanical checks (below) when the worker reports its last step.

**Spec defects.** A worker question that asks whether to amend `proposal.md` or `specs/**` in place is answered like any other question: when the Ready to Propose block (inside `/sai-plan`, where it is in your session), the specs, or the repository settles which side is right, answer `in-place` and record the assumption; when the correction is only a refinement of how the specs read, or nothing settles it, answer `route`. A `failed` report that names a spec defect the worker cannot patch is force majeure: escalate it with the options to continue designing from the specs as they are and to stop so the user can run `/sai-1-spec {name}` with the correction. The closing report names every correction the worker left for `/sai-1-spec`.

### Phase 2: the plan tests

Run this phase when at least one step of `tasks.md` lists `**Tests**`. A change whose steps all carry a `**Closure criterion**` (documentation or prompts only) produces no plan tests: create no plan RED worker, say so in the closing report, and go on to the review (E14).

Fetch `@sai/orchestration/workers/bindings/design-red-worker.md` and use it. The worker is `sai-2-red-worker`; its card is `sai/commands/design/red-worker.md`, and it takes its step file through `red-steps@1` like the fix RED. `reset` `red-steps@1`, and open the task message with `Active step: <stage> — follow <next.follow>` from the response (when the store fails, send `sai/commands/implement/steps/red-step.md`, its § Plan brief). The brief names the change, the mode (create, or update in place when the change already has plan tests), the report name, the run directory, the paths it may write (test files, fixtures, helpers, stubs, and the existing tests that a step's `**Existing Tests Broken**` names), the path `SAI_LEARNINGS.md` when that file exists at the project root, and a scratch folder. It carries no commit: the worker never runs git. Reports go through `worker-report-transport.md` with `--command implement`.

**Acceptance (E3).** After each plan RED report, run the plan tests through the budget executor, with each step's `**Test Command**` from the project root, and read these facts for every test a `**Tests**` entry names: the test exists at the named path under the named name; and its result is a failure by assertion on the behavior under test (a pass is accepted only for an entry marked `[regression guard]`). A test that fails to compile, fails for an import, syntax, or fixture error, or passes without being a guard goes back to the plan RED as a corrected instruction, which is an attempt of the obstacle `plan-tests`. A passing test that is not marked as a guard is accepted only when `tasks.md` is corrected to mark it, and that is a decision you make from the specs and the code, recorded as an assumption. A test that the executor finds skipped, disabled, or marked expected-to-fail is rejected the same way: the tests are committed failing.

**Unwritable tests (E13).** A plan RED `needs_input` that says a named test cannot be written as a meaningful assertion is answered `closure` when the specs and the code agree with it: continue the plan RED with the answer, send the design worker a fix message to turn that step's `**Tests**` into a `**Closure criterion**` (re-running the manifest fold), and record the change as an assumption with its source for the closing report. A question that nothing answers and whose answer would change the artifacts is force majeure, like any other.

The plan RED lives for the segment. Dispose it with the design worker when the segment closes and on replacement, as the cycle's Warm and dispose says under `worker-lifecycle.md`.

### Mechanical checks, review, and commit

**Mechanical checks.** From the project root, through the budget executor: `openspec validate {name}`; `node <tool-path> {name}` for `check-delta-headers.js`; `node <tool-path> sai-2 {name} --cwd <project-root>` for `check-cited-paths.js`; and `node <tool-path> verify {name} --json --cwd <project-root>` for `file-manifest.js`. A change with `skip_specs: true` and no file under `specs/` has no delta to check, so skip `check-delta-headers.js` and list it among the checks that were skipped. A failing check is the obstacle `checks`; the acceptance of the plan tests above is the obstacle `plan-tests`, and both run again before each review round and before the segment closes.

**Review criteria.** Fidelity to the approved scope (every requirement and scenario of the specs reaches a step of `tasks.md` and a plan test or a closure criterion that covers it, or, for a change with `skip_specs: true`, every statement of the proposal's What Changes does, and the design honors the proposal's intent); excess scope (no task, decision, test, or stub beyond what the specs ask for); internal consistency (decisions match tasks, every Open Question is answered or recorded, each step names its tests or its closure criterion, each test asserts what its scenario states and proves it, with no assertion that a stub could satisfy, and tasks are feasible and testable); and consistency across artifacts (paths, names, and signatures agree between `design.md`, `tasks.md`, the stubs, the tests, and the specs). A fix on `design.md` or `tasks.md` goes to the design worker, a fix on a test or a stub goes to the plan RED, and a plan change that a test fix needs goes to the design worker first.

**Commit paths.** Two commits, in this order, each restricted to its paths. The plan documents: `openspec/changes/{name}/design.md`, `tasks.md`, `.openspec.yaml`, and the `proposal.md` and `specs/` files the design worker amended in place; subject, for example, `docs(design): add design and tasks` on a first draft and `docs(design): refine design and tasks` on a rerun. The plan code: every path the plan RED's reports list in `changed_files` (tests, fixtures, helpers, and stubs), checked one by one with `git check-ignore -q` like the documents; subject, for example, `test(plan): add failing tests for {name}`, or `test(plan): update failing tests for {name}` on a rerun. A segment without plan tests makes the first commit only.

## Close

Print, in this order: the design worker's summary; the plan tests, per step (the tests named, each red by assertion or marked as a guard) and each step that carries a closure criterion, or that no plan tests were written; the assumptions, each with its question, answer, and source (or that there are none); the notices and spec corrections the worker named in `notes`, including any left for `/sai-1-spec`; the findings still pending after the third review round (or that there are none); the scope observations when there are some; the checks that were skipped when there are some; and whether the paths were committed, committed in part, or left uncommitted because the project ignores them. Say that the plan tests fail by design and that the continuous integration of a draft request of this branch stays red until the build runs.

A segment that completed ends with exactly ``Design done in openspec/changes/{name}/. Run `/sai-3-implement {name}` **in a new chat** when ready.`` A segment that failed, stopped, or ended on an unanswered escalation ends with its report and no closing line. Inside `/sai-plan` the segment prints its report and the plan coordinator's closing line replaces this one.
