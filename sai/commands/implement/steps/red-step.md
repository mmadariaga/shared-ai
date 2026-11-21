# RED step

Write the failing tests your brief asks for. Two briefs reach this file: the plan brief of the plan RED (`/sai-2-design`) and the finding brief of the fix RED (`/sai-3-implement`, `/sai-build`, `/sai-deep-review`).

Read the project's existing tests only to match their framework, naming, and fixtures. When the brief names `SAI_LEARNINGS.md`, Fetch `@sai/policies/sai-learnings-format.md`, read its § Consumption, and follow the file's entries in the tests and stubs you write.

## Plan brief

The brief names the change; read `design.md` (`## Target State` for the finished signatures), `tasks.md`, and the spec scenarios under `specs/` (a change whose `.openspec.yaml` sets `skip_specs: true` has none: its assertions anchor to `proposal.md`).

1. For every `## Step N` that lists `**Tests**`, write each listed test at the path and under the name its entry gives. The entry names the behavior; the spec scenario it covers is the oracle. Name each test so that the test name contains the title of its spec scenario, which the scenario coverage check matches literally (case, punctuation, and extra whitespace do not matter; words joined by underscores or camel case do not match, so carry the title as words separated by spaces, in a description string, display name, or docstring where the language's identifiers cannot). Assert the observable outcome and leave implementation details unasserted.
2. Update each existing test that the step's `**Existing Tests Broken**` names to the behavior the change produces. A broken test that stays green is a defect of the plan: report it in `notes`.
3. Add the stubs the tests import so that every failure is an assertion, never a compile, import, or fixture error. A stub holds the symbol and signature the design declares and returns a null, empty, or wrong value.
4. A `**Tests**` entry marked `[regression guard]` covers behavior that already works: write it so that it passes now and stays a guard, and do not stub around it.
5. A step with `**Closure criterion**` instead of tests gets no test and no stub from you.
6. Run each step's `**Test Command**` and settle `test_command` as the command that runs every plan test of the change. Return the report with it filled in. When the brief names `SAI_LEARNINGS.md`, put in `notes` each entry that failed on execution (its key and the failure), and anything else the coordinator should know.

When a test cannot be written as a meaningful assertion, finish the others and report `needs_input` as your card says.

## Finding brief

The code already exists and each finding names a defect in it. Write one test per finding that asserts the corrected behavior the finding describes, so that it fails by assertion on the current code; name the finding's identifier in the test name. Add the stubs the test imports only when the corrected behavior introduces a symbol that does not exist yet. Settle `test_command` as the narrowest command that runs only these tests, and return the report.

A finding that needs no test never reaches you: the coordinator sends it to GREEN directly.
