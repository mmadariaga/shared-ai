# test-suite-reliability Specification

## Purpose
TBD - created by archiving change fix-test-suite-reliability. Update Purpose after archive.
## Requirements
### Requirement: Binding validation SHALL NOT mutate the repository source tree

Reading a generated binding that has no file on disk SHALL resolve to the matrix-derived text without materializing any transient files. The repository source tree SHALL be byte-identical before and after any validation run.

#### Scenario: Generated bindings are resolved from matrix text without disk materialization
- **WHEN** `validateOpencodeWorkerBindings()` encounters a generated binding file that does not exist on disk
- **THEN** it reads the binding text from the matrix-derived binding object and never writes any transient file to the repository source tree

#### Scenario: Disk-based bindings are read from disk, not replaced by matrix text
- **WHEN** a binding file genuinely exists on disk in the opencode bindings directory
- **THEN** it is read from disk and not replaced or overridden by matrix-derived text

#### Scenario: The source tree is byte-identical after validation completes
- **WHEN** `validateOpencodeWorkerBindings()` runs to completion
- **THEN** comparing the repository source tree before and after yields no byte-level differences

#### Scenario: assertBindingDirectoryUsesOneStringEnvelope observes the same directory state before validation
- **WHEN** validation runs with `allowAbsentGenerated: true` as a precondition
- **THEN** the assertion function still runs before the matrix-text fallback and sees the same directory state as before validation started

### Requirement: Binding validation SHALL NOT require a cross-process lock

Concurrent validations SHALL be safe by construction because the validation performs no writes to the source tree. Multiple processes running validation simultaneously SHALL not interfere with each other.

#### Scenario: Parallel validations complete without timeouts
- **WHEN** multiple concurrent Node processes invoke `validateOpencodeWorkerBindings()` simultaneously
- **THEN** all processes complete successfully without timeout failures

#### Scenario: Validation is safe without cross-process serialization
- **WHEN** multiple processes validate bindings concurrently
- **THEN** no process waits on or acquires a cross-process lock

#### Scenario: Installation validates bindings without waiting on cross-process locks
- **WHEN** `installClaude()` or `installOpencode()` invokes binding validation
- **THEN** the validation completes without waiting for any cross-process lock to be acquired or released

#### Scenario: Parallel and serial full-suite runs report identical results
- **WHEN** the test suite runs in parallel (default `npm test`) and in serial (`npm test -- --test-concurrency=1`)
- **THEN** both invocations report the same number of passing tests, failing tests, and total test count

### Requirement: The project's default test invocation SHALL report every individual failure

The project's default test runner invocation (`npm test`) SHALL report every individual assertion failure rather than summarizing failures away.

#### Scenario: Every assertion failure is reported individually in the output
- **WHEN** `npm test` is invoked
- **THEN** the output lists each individual passing and failing test, with individual test names and outcomes visible, not an aggregate summary line that masks which specific tests failed

#### Scenario: A test failure appears in output rather than only in a count
- **WHEN** the test suite runs and an assertion fails
- **THEN** the failure appears as an itemized entry in the output, not hidden behind a summary reporter that only displays total counts

