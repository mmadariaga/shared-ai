# `/sai-2-design` coordinator

Fetch @sai/policies/public-chat.md and follow it exactly.
Fetch @sai/policies/remember.md
Fetch @skills/safe-operations/SKILL.md and use it.
Fetch @skills/budget/SKILL.md
Fetch @sai/policies/tool-resolution.md
Fetch @sai/policies/cache-warming.md
Fetch @sai/commands/plan/cycle.md and follow it for everything this card does not state.

You are the driver of the segment. The invocation carries one string, `arguments_value`: the change name, optionally followed by feedback, and the option `--overview-lang <language>`.

## Goal

Design the change from its approved `proposal.md` and `specs/` into `design.md`, `tasks.md`, and `interfaces.md` with no human in the loop. The segment is done when the three artifacts exist and satisfy the worker's verification, every mechanical check passes, they went through up to 3 incremental review rounds, `change-overview.md` exists when `--overview-lang` asked for it, and the segment's paths are committed locally (or left on disk when the project ignores them). A human is needed only for force majeure. The command stops before implementation.

Running this command approves the specs: it asks nothing about them, and the worker stamps the approval.

## Start

1. Drop every `--fast-track` and `--supervised` token or line from `arguments_value`: both are accepted and ignored, and no banner is printed.
2. Take the option `--overview-lang <language>` out of the string. It carries exactly one non-empty language token. An option without a value, a value that starts with `--`, or a second occurrence prints this and ends the run, writing nothing: `Cannot start /sai-2-design: --overview-lang takes exactly one language, as in --overview-lang Spanish.` The language travels in your session state only and is never written to an artifact or a setting.
3. The first remaining token is the change name, and the rest is feedback. An empty remainder takes the only change directory under `openspec/changes/` (archive excluded) that has a `proposal.md`. When there are none or several, print this and end the run, writing nothing: `Cannot start /sai-2-design: name the change ({candidates, or none}).`
4. The change is startable when `openspec/changes/{name}/` has `proposal.md` and at least one file under `specs/`. Otherwise print this and end the run, writing nothing: `Cannot start /sai-2-design for {name}: missing {list of the absent items}. Run /sai-1-spec first.`
5. Open the run per the cycle's Opening the run; inside `/sai-plan` it is already open. Emit `segment-start` with the segment `design`, then `reset` `design-steps@1`. Write the feedback verbatim to `feedback.md` in the run directory when there is any. When `design.md` exists, copy it to `previous-design.md` there. The mode is a first draft when `design.md` is absent and a rerun otherwise; feedback on a change without `design.md` is extra guidance for the first draft.
6. Record the commit paths' dirty baseline per the cycle's Commit rule.

## The segment

Fetch @sai/orchestration/workers/bindings/design-worker.md and use it. Dispose the worker when the segment closes (after the overview, when one was asked for) and on replacement, as the cycle's Warm and dispose says.

The worker is `sai-2-design-worker`. Its steps, in the order the static fallback uses, are `design-intake` (inline), then `research`, `design`, `tasks`, `interfaces`, each at `sai/commands/design/steps/{step}.md`. The task message opens with the first pointer, then names the change, the mode (`first draft` or `rerun` with `feedback_file`), the report path, and the run directory.

**Spec defects.** A worker question that asks whether to amend `proposal.md` or `specs/**` in place is answered like any other question: when the Ready to Propose block (inside `/sai-plan`, where it is in your session), the specs, or the repository settles which side is right, answer `in-place` and record the assumption; when the correction is only a refinement of how the specs read, or nothing settles it, answer `route`. A `blocked` report that names a spec defect the worker cannot patch is force majeure: escalate it with the options to continue designing from the specs as they are and to stop so the user can run `/sai-1-spec {name}` with the correction. The closing report names every correction the worker left for `/sai-1-spec`.

**Mechanical checks.** From the project root, through the budget executor: `openspec validate {name}`; `node <tool-path> {name}` for `check-delta-headers.js`; `node <tool-path> sai-2 {name} --cwd <project-root>` for `check-cited-paths.js`; and `node <tool-path> verify {name} --json --cwd <project-root>` for `file-manifest.js`.

**Review criteria.** Fidelity to the approved scope (every requirement and scenario of the specs reaches a task and a test assertion of `interfaces.md`, and the design honors the proposal's intent); excess scope (no task, decision, or interface beyond what the specs ask for); internal consistency (decisions match tasks, every Open Question is answered or recorded, `interfaces.md` carries the same step keys as `tasks.md`, tasks are feasible and testable); and consistency across artifacts (paths, names, and signatures agree between `design.md`, `tasks.md`, `interfaces.md`, and the specs).

**Overview.** After the review ends and the checks pass, and only when `--overview-lang` carried a language, send the worker one continuation whose first line is `Follow @sai/commands/design/steps/overview.md`, followed by the change name, `overview_language`, the instruction to generate `change-overview.md` only with no source regeneration, and a report path. A failed overview is an obstacle (identifier `overview`). Without the option, send no continuation and generate no overview; an existing overview stays, and the worker marked it stale if the sources changed.

**Commit paths.** `openspec/changes/{name}/design.md`, `tasks.md`, `interfaces.md`, `change-overview.md` when generated, `.openspec.yaml`, and the `proposal.md` and `specs/` files the worker amended in place. Subject, for example: `docs(design): add design, tasks, interfaces` on a first draft, `docs(design): refine design artifacts` on a rerun.

## Close

Print, in this order: the worker's summary; the `### Architecture Snapshot` of `design.md` when this run created it or changed it against `previous-design.md`; the assumptions, each with its question, answer, and source (or that there are none); the notices and spec corrections the worker named in `notes`, including any left for `/sai-1-spec`; the findings still pending after the third review round (or that there are none); the scope observations when there are some; the checks that were skipped when there are some; the overview result when `--overview-lang` was given; and whether the paths were committed, committed in part, or left uncommitted because the project ignores them.

A segment that completed ends with exactly ``Design done in openspec/changes/{name}/. Run `/sai-3-implement {name}` **in a new chat** when ready.`` A segment that failed, stopped, or ended on an unanswered escalation ends with its report and no closing line. Inside `/sai-plan` the segment prints its report and the plan coordinator's closing line replaces this one.
