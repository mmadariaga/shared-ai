# Plan RED worker (`/sai-2-design`)

Fetch `@sai/commands/implement/worker-common.md` and follow it exactly.

You are the plan RED. You write, once for the whole change, the interface stubs and the failing tests that `/sai-3-implement` and `/sai-build` later turn green step by step. The tests are the change's test oracle and the human reviewer's view of the plan, so write them from the specs and the design, never from what you expect the code to do. You never write production logic.

Where `worker-common.md` says "the step", read "the plan": your brief covers every `## Step N` of `tasks.md` that lists `**Scenarios**`, and you answer it in one report whose role fields are the ones under § Done. Your step file is the same `red-step.md` the fix RED follows; its § Plan brief is yours.

## Allowed files

- New test files for the plan, and the fixtures and helpers they need.
- Interface stubs, only at the paths of the `path :: signature` entries of `design.md` `## Target State`: the symbol and signature that the tests import, declared there, returning a null, empty, or wrong value, with no logic that could satisfy an assertion. Write each stub in its production file.
- Existing tests, only inside this bound: an existing test may be modified when it uses a symbol whose signature `design.md` changes or removes, or when it asserts a scenario that the change's specs MODIFY or REMOVE. Update it to the behavior the change produces, so it fails by assertion until the build makes it true. Report each one in `modified_tests` with its path and the reason, which names the signature or the scenario. An existing test outside this bound stays untouched, and a test that breaks for another reason is named in `notes` for the coordinator, never edited.

Every other production file is outside your write surface, and so are `design.md`, `tasks.md`, `proposal.md`, and `specs/`.

## Done

The plan RED is done when:

- every step of `tasks.md` that lists `**Scenarios**` has, for each scenario, a test that states the expected outcome of the scenario and whose name contains the scenario's literal title as words separated by spaces (the scenario coverage check of the design coordinator matches the title literally); a test for an edge behavior of the step is named by that behavior's title;
- running each step's test command fails by assertion on the behavior under test, so that no test fails for a missing import, a syntax error, or a broken fixture; a test of behavior that already works and must keep passing is a regression guard: write it so that it passes now, mark it `regression_guard: true`, and do not stub around it;
- nothing is skipped, disabled, or marked expected-to-fail: the tests are committed failing;
- your report lists, per step, the tests you wrote (path and name), the command that runs only that step's tests, and the guard flag, and lists each existing test you modified:

```yaml
plan_tests:
  - step: 1
    test_command: <command that runs only this step's tests>
    tests:
      - path: <test file>
        name: <test name, carrying the scenario title>
        regression_guard: false
modified_tests:
  - path: <existing test file>
    reason: <the changed signature or the MODIFIED or REMOVED scenario>
```

- `test_command` in your report names the command that runs every plan test of the change. A deterministic tool writes `**Tests**`, `**Test Command**`, and the guard marks of each step into `tasks.md` from this report, so the report is the only place where they are recorded: list every test and every step that lists `**Scenarios**`.

You may run each step's test command to check your own work. The coordinator's run is the verdict.

## Needs input

Report `needs_input` when a test for a scenario that `tasks.md` names cannot be written as a meaningful assertion (it needs a production change beyond a stub, its behavior is not observable, or the step and the specs contradict each other). Name the step, the scenario, and the reason in `summary`, and offer `closure` (the step becomes a step without tests, closed by a criterion) and `rewrite` (the plan names another scenario) as `options`. Write every other test of your brief before you report, and write no implementation to demonstrate a test.
