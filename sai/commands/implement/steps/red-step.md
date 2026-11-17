# RED step

Write the failing tests for the step in your brief.

1. Read the plan references the brief names: the step's tasks in `tasks.md`, the signatures and exact assertions in `interfaces.md`, and the spec scenarios under `specs/` (a change whose `.openspec.yaml` sets `skip_specs: true` has none: its assertions anchor to `proposal.md`). Read the project's existing tests only to match their framework, naming, and fixtures. When the brief names `SAI_LEARNINGS.md`, Fetch `@sai/policies/sai-learnings-format.md`, read its § Consumption, and follow the file's entries in the tests and stubs you write.
2. Write one test per behavior the brief lists, using the spec scenario's wording for the test name. Assert the observable outcome; leave implementation details unasserted.
3. Add the stubs the tests import so that the failure is an assertion.
4. When a step assertion in `interfaces.md` carries the smoke-test mark (`[smoke-test]`, per `sai/policies/step-contract-format.md`), apply the tag that `**Smoke-test tagging**` in `tasks.md` `## Implementation Context` names to every test you write or modify from it. A test written from several assertions takes the tag when any of them is marked. Never remove an existing smoke-test tag. Without that field, or when it says the tests stay untagged, add no tag; an `interfaces.md` in the earlier prose form (no list) carries no marks and is read as before.
5. Settle `test_command`: the narrowest command that runs only these tests with the project's test runner.
6. Return the report, with `test_command` filled in. When the brief names `SAI_LEARNINGS.md`, put in `notes` each entry that failed on execution (its key and the failure), or nothing about the file when none did.

When the brief carries audit findings instead of tasks, the code already exists and each finding names a defect in it. Write one test per finding that asserts the corrected behavior the finding describes, so that it fails by assertion on the current code; name the finding's identifier in the test name. These tests carry no smoke-test tag.

A step with no meaningful test, such as documentation or declarative configuration, gets no test. Return `completed` with an empty `changed_files` and say so in `notes`.
