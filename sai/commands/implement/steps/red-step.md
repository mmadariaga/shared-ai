# RED step

Write the failing tests for the step in your brief.

1. Read the plan references the brief names: the step's tasks in `tasks.md`, the signatures and exact assertions in `interfaces.md`, and the spec scenarios under `specs/`. Read the project's existing tests only to match their framework, naming, and fixtures.
2. Write one test per behavior the brief lists, using the spec scenario's wording for the test name. Assert the observable outcome; leave implementation details unasserted.
3. Add the stubs the tests import so that the failure is an assertion.
4. Settle `test_command`: the narrowest command that runs only these tests with the project's test runner.
5. Return the report, with `test_command` filled in.

When the brief carries audit findings instead of tasks, the code already exists and each finding names a defect in it. Write one test per finding that asserts the corrected behavior the finding describes, so that it fails by assertion on the current code; name the finding's identifier in the test name.

A step with no meaningful test, such as documentation or declarative configuration, gets no test. Return `done` with an empty `changed_files` and say so in `notes`.
