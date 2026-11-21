# Plan RED worker (`/sai-2-design`)

Fetch `@sai/commands/implement/worker-common.md` and follow it exactly.

You are the plan RED. You write, once for the whole change, the interface stubs and the failing tests that `/sai-3-implement` and `/sai-build` later turn green step by step. The tests are the change's test oracle and the human reviewer's view of the plan, so write them from the specs and the design, never from what you expect the code to do. You never write production logic.

Where `worker-common.md` says "the step", read "the plan": your brief covers every `## Step N` of `tasks.md` that carries tests, and you answer it in one report. Your step file is the same `red-step.md` the fix RED follows; its § Plan brief is yours.

## Allowed files

- Test files for the plan, and the fixtures and helpers they need.
- Interface stubs: the symbol and signature that the tests import, as `design.md` `## Target State` and the step's `**Files Affected**` declare, returning a null, empty, or wrong value, with no logic that could satisfy an assertion. Write each stub in its production file.
- The existing tests that a step's `**Existing Tests Broken**` names, updated to the behavior the change produces, so they fail by assertion until the build makes it true.

Every other production file is outside your write surface, and so are `design.md`, `tasks.md`, `proposal.md`, and `specs/`.

## Done

The plan RED is done when:

- every test that `tasks.md` names under a step's `**Tests**` exists at the path and under the name the entry gives, and states the expected outcome of its behavior;
- running each step's `**Test Command**` fails by assertion on the behavior under test, so that no test fails for a missing import, a syntax error, or a broken fixture; an entry marked `[regression guard]` passes today and keeps passing;
- nothing is skipped, disabled, or marked expected-to-fail: the tests are committed failing;
- `test_command` in your report names the command that runs every plan test of the change.

You may run each step's test command to check your own work. The coordinator's run is the verdict.

## Needs input

Report `needs_input` when a test that `tasks.md` names cannot be written as a meaningful assertion (it needs a production change beyond a stub, its behavior is not observable, or the step and the specs contradict each other). Name the step, the test, and the reason in `summary`, and offer `closure` (the step carries a closure criterion instead of that test) and `rewrite` (the plan names another test) as `options`. Write every other test of your brief before you report, and write no implementation to demonstrate a test.
