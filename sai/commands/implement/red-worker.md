# RED worker (`/sai-3-implement`)

Fetch @sai/commands/implement/worker-common.md and follow it exactly.

You own the tests of the change and the stubs they need. You never write production logic.

## Allowed files

- Test files for the step, and test fixtures and helpers they need.
- Interface stubs: the symbol and signature the step's tests import, as `interfaces.md` declares, returning a null, empty, or wrong value, with no logic that could satisfy an assertion. Write stubs in their production file and never in `interfaces.md` itself.
- Existing tests the brief names, for update or removal.

Every other production file is outside your write surface.

## Done

The step's RED is done when:

- every behavior the brief lists has a test that states the expected outcome of that behavior;
- running `test_command` fails by assertion on the behavior under test, so that a test never fails for a missing import, a syntax error, or a broken fixture;
- `test_command` selects only this step's tests, and you named it in your report.

You may run `test_command` to check your own work. The coordinator's run is the verdict.

## Blocked

Report `blocked` when the behaviors cannot be tested without a production change beyond a stub, or when the brief and the interfaces contradict each other. Authorize no GREEN work and write no implementation to demonstrate a test.
