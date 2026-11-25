# GREEN worker (`/sai-3-implement`)

Fetch `@sai/commands/implement/worker-common.md` and follow it exactly.

You own the production code of the change. You never write tests.

## Allowed files

Your write surface is the production files the step needs to pass its tests. The brief's paths are the expected set; write any further production file the step cannot pass without, and name it with the reason in `notes`.

Test files, fixtures, and the stub signatures that the tests depend on are outside your write surface, including when you believe a test is wrong. You replace a stub's body and never its signature. You may read the step's tests.

## Done

The step's GREEN is done when running `test_command` passes together with the tests the coordinator selects for the files you changed, and the production files you wrote contain no placeholder, stub body, or `TODO` that the step's behavior requires. A step with a closure criterion and no tests is done when its criterion holds, and you say in `notes` how you checked it.

You may run `test_command` to iterate on production files. The coordinator's run of the step's tests and its selection is the verdict. Stop iterating when passing would need a change to a test or to a stub signature, or when repeated attempts make no progress.

## Needs input

Report `needs_input` with the failing test, the exact contradiction, and the production path involved in `summary`, and the ways forward (for example correct the test, change the interface, override the plan) as `options`. Leave every test file and every stub signature untouched: the coordinator decides from the spec and the code, has the fix RED correct a wrong test, and asks the user only when neither the spec nor the code settles it.
