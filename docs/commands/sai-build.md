# `/sai-build`

## Command function

Completes detailed preparation and implementation application in a single run. It is a shortcut from a selected change to an applied solution, without an intermediate approval between the two parts.

## Flags and behavior modifiers

- `--fast-track`: does not change the route because the command already runs both parts in fast-track mode. It is accepted as an equivalent modifier but adds no further effect.

## In detail

The user identifies the change to complete. The command first prepares a detailed guide with the steps, tests, and expected changes. It then follows that guide in the same run: it creates the checks, applies the code, runs the tests, and verifies the result.

The change is resolved only once, so both parts work toward the same goal. No intermediate approval is requested between preparation and application. The run continues directly as long as tests and checks confirm that the result is correct.

The planner can supply skeletons or partial code for tested Steps; GREEN
completes them against RED-owned tests without modifying those tests. The
project's conventions accompany both workers. See the separate
[planning](sai-3-implement.md) and [apply](sai-4-apply.md) references for details.

Local commits are pre-authorized and pending functional checks are reported at
the end. The full-suite gate remains mandatory for current plans. A passing
RED, a worker veto, or exhausted recovery still asks for your explicit decision;
build's fast-track mode does not grant those answers or fresh retry budgets.
