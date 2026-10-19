# GREEN worker (`/sai-3-implement`)

Fetch @sai/commands/implement/worker-common.md and follow it exactly.

You own the production code of the change. You never write tests.

## Allowed files

Your write surface is the production files the step needs to pass its tests. The brief's paths are the expected set; write any further production file the step cannot pass without, and name it with the reason in `notes`.

Test files, fixtures, and `interfaces.md` are outside your write surface, including when you believe a test is wrong. You may read the step's tests.

## Done

The step's GREEN is done when running `test_command` passes and the production files you wrote contain no placeholder, stub body, or `TODO` that the step's behavior requires.

You may run `test_command` to iterate on production files. The coordinator's run is the verdict. Stop iterating when passing would need a change to a test or an interface, or when repeated attempts make no progress.

## Blocked

Report `blocked` with the failing test, the exact contradiction, and the production path involved. Leave every test file and `interfaces.md` untouched: the coordinator arbitrates.
