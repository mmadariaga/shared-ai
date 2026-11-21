# `/sai-2-design`

## Command function

Turns an approved proposal into an actionable technical design and into the test oracle of the change: a short `design.md`, a `tasks.md` of ordered steps, and, in code, the interface stubs and the failing tests (the plan tests) that [`/sai-3-implement`](sai-3-implement.md) and [`/sai-build`](sai-build.md) later turn green step by step.

## Flags and behavior modifiers

The command takes the change name and optional feedback; it has no other option. Passing `--overview-lang` ends the run with an unknown-option error before anything is written (the change overview retired, because the draft pull request is the review surface).

Supply the change name first. Text after the name is feedback: on a change that already has `design.md`, `/sai-2-design my-change <feedback>` runs the same cycle again and updates the plan tests, the stubs, `design.md`, and `tasks.md` in place, in new commits.

## In detail

The command always runs unattended and runs two phases in one run. Invoking it approves the reviewed specs and records that approval; a change with `skip_specs: true` has no specs to approve, so no approval is recorded and the design works from the statements of `proposal.md`.

1. **Design.** `sai-2-design-worker` researches the proposal, specs, and any existing design, resolves blocking questions, and writes the reduced `design.md` (the finished shape with its file manifest, the decisions with their record family, and the risks) and `tasks.md`. Each step of `tasks.md` carries the tests it turns green (their paths and names, with any regression guard marked) or, when no meaningful test exists (documentation, prompts, configuration), a closure criterion, plus its files, its own test command, and its routing line.
2. **Plan tests.** `sai-2-red-worker`, the plan RED, a worker with its own model, writes the stubs and the failing tests that `tasks.md` names. The command runs them and accepts a test only when it is red by assertion (a failure on the behavior under test, not a compile or import error); a test that already passes is accepted only when `tasks.md` marks it as a regression guard. A test that cannot be written as a meaningful assertion becomes a closure criterion, recorded as an assumption. A change whose steps all carry closure criteria produces no plan tests and creates no plan RED.

The command answers a worker question itself when the artifacts or the repository settle it, records the answer as an assumption with its source, and escalates to you only what nothing settles. It runs the mechanical checks, reviews the artifacts and the plan tests in up to three incremental rounds, and commits the segment's own paths locally in two commits: the plan documents, then the plan code. The plan tests are committed failing, never skipped, so the continuous integration of a draft pull request of the branch stays red until the build runs. The assumptions and any findings still open after the third round are listed once in the closing report and are not written to the repository.

The design reads `SAI_LEARNINGS.md` when it exists. It writes no ADR or DDR: it marks each qualifying decision with its record family, and the implementing command creates the record at its close. A change planned with the earlier format (it has `interfaces.md` and no plan tests) does not enter the build: run `/sai-2-design` again on it.

The command requires `proposal.md` and either a spec file or `.openspec.yaml` with `skip_specs: true`; otherwise it stops before any dispatch. It ends when the design is complete and does not implement the solution or execute tasks from the plan. In normal use, it stops so the user can review the design before running [`/sai-3-implement`](sai-3-implement.md) or [`/sai-build`](sai-build.md). [`/sai-plan`](sai-plan.md) runs this command after `/sai-1-spec` in one invocation.
