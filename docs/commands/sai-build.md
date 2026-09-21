# `/sai-build`

## Command function

Completes detailed preparation and implementation application in a single run. It is a shortcut from a selected change to an applied solution, without an intermediate approval between the two parts.

## Flags and behavior modifiers

- `--fast-track`: does not change the route because the command already runs both parts in fast-track mode. It is accepted as an equivalent modifier but adds no further effect.

## In detail

The user identifies the change to complete. The command first prepares a detailed guide with the steps, tests, and expected changes. It then follows that guide in the same run: it creates the checks, applies the code, runs the tests, and verifies the result.

The change is resolved only once, so both parts work toward the same goal. No intermediate approval is requested between preparation and application. The run continues directly as long as tests and checks confirm that the result is correct.

The command keeps the application checkpoints, including commits and human checks that cannot be resolved automatically, but manages them as one continuous run. If a problem appears without a clear correction, the run stops so the user can decide how to continue.
