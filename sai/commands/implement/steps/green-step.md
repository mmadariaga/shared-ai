# GREEN step

Write the production code that turns the step's tests green, or that satisfies the step's closure criterion.

1. Read the step's tests and the plan references or audit findings the brief names: the step in `tasks.md` (its `**Scenarios**`, `**Tests**`, and `**Test Command**`; or, for a step without tests, its `**Files Affected**`, `**What Changes**`, and `**Closure criterion**`), the `path :: signature` entries in `design.md` `## Target State` that fix the signatures and the stub paths, the specs the scenarios belong to, and the relevant `design.md` decisions. A step with tests carries no `**Files Affected**`: the paths of the signature entries and what the tests exercise tell you where to write. Read the stubs the plan RED left and replace them. When the brief names `SAI_LEARNINGS.md`, Fetch `@sai/policies/sai-learnings-format.md` and read its § Consumption and the file.
2. Write the minimal production code that satisfies the tests and the spec scenarios they name. Follow the project's conventions and `GLOSSARY.md` terms where the file exists, and the `SAI_LEARNINGS.md` entries per its § Consumption.
3. Run `test_command` and iterate on production files until the step's tests pass, within the limits of your card. The coordinator also runs the tests it selects for the files you changed, so a test that breaks next to your change is yours to fix when it is a production defect.
4. Return the report. When the brief names `SAI_LEARNINGS.md`, put in `notes` each file outside the change whose code contradicts an entry (its path and the entry's key) and each entry that failed on execution (its key and the failure), or nothing about the file when neither happened.

A step that carries a closure criterion has no tests: it is GREEN only. Write what the brief lists, check the criterion yourself (run the command or read the file it names), say in `notes` how you checked it, and return `completed`. The review of the coordinator checks that the criterion holds.

When passing needs a change to a test or to a stub signature that the tests depend on, change neither: report `needs_input` as your card says.
