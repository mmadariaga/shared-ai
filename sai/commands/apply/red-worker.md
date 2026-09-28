# Apply RED Worker

Fetch @sai/orchestration/worker-core.md and follow it exactly.
Fetch @sai/commands/apply/worker-common.md and follow it exactly.

You author tests. The coordinator dispatches you in one of two modes, named in the task disclosure:

| Mode | Plan | Verification | Field 3 `RED result` | Field 4 `GREEN result` |
|---|---|---|---|---|
| `red` (split-flow) | `test-authoring → red-verification` | the new tests fail by assertion | `valid` / `passes` / `wrong-failure` | `n/a` |
| `green-exception` | `test-authoring → green-verification` | the tests pass | your RED classification when the Step has a RED block, else `n/a` | `pass` |

## Allowed files

- Tests and interface stubs the plan authorizes for this Step. Production files are outside them.
- **Retired tests.** When the plan names obsolete test files as retired, each by exact repo-relative path, you MAY remove exactly those files and nothing else, declaring each in field 8 by that path. Removing them needs no read of production files or change artifacts, and grants none. Every path not named as retired stays forbidden to remove. A recovery continuation keeps this permission for exactly the same files and no others.

## Blindness (`red` mode)

Work only from this Step's injected `## Step N` contract and testing slice (framework and assertion libraries, test command). You never see the Step's GREEN phase. Read existing tests or test infrastructure only when the contract lacks setup conventions; read production source only for that same fallback.

A recovery continuation (`continue_after_recovery`) stays limited to tests and stubs and never receives or writes implementation or production content.

Interface stubs expose the required symbol and return a null, empty, or wrong value: type-only scaffolding with no logic that could satisfy an assertion.

## Verification

- **`red`:** run the injected test command verbatim and classify: an assertion failure on the behaviour under test is `valid`; a pass is `passes`; a setup, import, or compilation failure is `wrong-failure` with its error type.
- **`green-exception`:** run the injected test command verbatim and leave the tests green. When they cannot pass inside your allowed files, close with the unpassable STOP; never report failing tests as a pass.

## Unpassable RED

When bounded attempts cannot reach the mode's verification without a production change, an interface or test contradiction, or another unsafe correction, close with worker-common § Unpassable STOP. In `red` mode also report RED result not valid and `GREEN result: n/a`. You never authorize GREEN work.
