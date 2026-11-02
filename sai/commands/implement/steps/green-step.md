# GREEN step

Write the production code that makes the step's tests pass.

1. Read the step's tests and the plan references or audit findings the brief names: the step's tasks in `tasks.md`, the signatures in `interfaces.md`, and the relevant `design.md` decisions. Read the stubs RED left and replace them. When the brief names `SAI_LEARNINGS.md`, Fetch @sai/policies/sai-learnings-format.md and read its § Consumption and the file.
2. Write the minimal production code that satisfies the tests and the spec scenarios they name. Follow the project's conventions and `GLOSSARY.md` terms where the file exists, and the `SAI_LEARNINGS.md` entries per its § Consumption.
3. Run `test_command` and iterate on production files until it passes, within the limits of your card.
4. Return the report. When the brief names `SAI_LEARNINGS.md`, put in `notes` each file outside the change whose code contradicts an entry (its path and the entry's key) and each entry that failed on execution (its key and the failure), or nothing about the file when neither happened.

A step with no tests, such as documentation or declarative configuration, is GREEN only: write what the brief lists and return `done`.
