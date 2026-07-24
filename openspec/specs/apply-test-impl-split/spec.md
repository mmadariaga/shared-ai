# apply-test-impl-split Specification

## ADDED Requirements

### Requirement: Testable steps split into a test-writer then an implementation dispatch

For every **testable** Step (a Step that contains a RED block), the `sai-4-apply` coordinator SHALL dispatch two separate subagents in order instead of one: first a test-writer dispatch, then — only after the test-writer verifies a valid RED — an implementation dispatch. The coordinator SHALL NOT combine both into a single dispatch for a testable Step.

#### Scenario: Coordinator processes a testable Step

- **WHEN** the coordinator reaches an unchecked Step that contains a RED block
- **THEN** it dispatches a test-writer subagent first, waits for its report and a valid RED, and only then dispatches a separate implementation subagent for the same Step

#### Scenario: Test-writer does not verify a valid RED

- **WHEN** the test-writer's report indicates RED result `passes` or `wrong-failure`
- **THEN** the coordinator does NOT dispatch the implementation subagent, and surfaces the invalid RED to the user per the RED handling rules

### Requirement: Test-writer is blind to the implementation body

The test-writer dispatch's prompt SHALL contain the `interfaces.md` section for that Step N (its signatures + exact assertions) plus the testing-relevant slice of `tasks.md`'s `## Implementation Context` injected by the coordinator — and NOTHING from the GREEN implementation body of the Step. The test-writer writes the interface stubs and the tests and verifies a VALID RED (an assertion failure attributable to the behavior under test, not a setup/import/compilation error).

The injected slice SHALL name its source fields explicitly rather than paraphrasing them. It SHALL include the **Test Command** field verbatim, because the test-writer is required to run the test command during RED verification and is forbidden from reading `implementation.md`, where the command otherwise lives. The framework and assertion/mock libraries SHALL be taken from the **Stack** field. Test file location and naming SHALL NOT be mandated as `## Implementation Context` fields; the test-writer recovers them under its existing permission to read existing test files and test infrastructure. The coordinator's own enumeration of the injected slice SHALL therefore drop test file location/naming, so that it no longer promises an injection whose source is guaranteed not to exist.

The test-writer SHALL scope its RED run to the tests it authored, substituting the test identifier into the scoping idiom the **Test Command** field carries. Where the field carries the no-runner sentinel, or the project's runner offers no scoping, the test-writer SHALL attribute the RED classification only to failures originating in the tests it authored, and SHALL NOT classify a pre-existing unrelated failure elsewhere in the suite as either a valid RED or a `wrong-failure` for this Step.

#### Scenario: Coordinator assembles the test-writer prompt

- **WHEN** the coordinator dispatches the test-writer for a testable Step
- **THEN** the prompt includes only that Step's `interfaces.md` section and the injected testing context from `tasks.md`, and excludes the Step's GREEN implementation code

#### Scenario: Testing context is single-sourced in tasks.md

- **WHEN** the coordinator injects the testing stack into the test-writer prompt
- **THEN** it takes the framework and assertion/mock libraries from the **Stack** field and the test command from the **Test Command** field of `tasks.md`'s `## Implementation Context`, not from `interfaces.md` (which carries no testing-stack section)

#### Scenario: Test-writer runs the injected command during RED verification

- **WHEN** the test-writer reaches RED verification
- **THEN** the command it runs is the **Test Command** value injected by the coordinator, scoped to the tests it authored via that value's scoping idiom, not a command it inferred from the test files it read

#### Scenario: Pre-existing unrelated failure in an unscoped run

- **WHEN** the test-writer must run the suite unscoped and the run exits non-zero because of a failure in tests it did not author
- **THEN** it classifies RED only from the results of its own tests and does not report that unrelated failure as a valid RED or as a `wrong-failure`

#### Scenario: Injected slice no longer promises location and naming

- **WHEN** `sai/instructions/apply.md` enumerates the testing-relevant slice injected into the test-writer
- **THEN** the enumeration names the **Stack**-sourced framework and libraries and the **Test Command**, and does not list test file location/naming

### Requirement: Coordinator guards interfaces.md ↔ implementation.md Step-N key integrity

The coordinator injects "that Step's `interfaces.md` section" into the test-writer by matching the integer `N` of the current `implementation.md` `## Step N` heading to the `## Step N` heading in `interfaces.md`. Because `interfaces.md` is regenerated wholesale while `implementation.md` is preserved byte-for-byte (including orphan steps) across re-runs, the two can desync. Before dispatching the test-writer, the coordinator SHALL verify a matching `## Step N` exists in `interfaces.md`. If none exists, or the match is ambiguous, the coordinator SHALL STOP and surface the desync to the user — it SHALL NOT silently inject a mismatched or empty interface contract into the blind test-writer.

#### Scenario: No matching Step N in interfaces.md

- **WHEN** the coordinator is about to dispatch the test-writer for a testable `implementation.md` Step N and `interfaces.md` has no `## Step N` section (or the keys have drifted after a divergent design re-run)
- **THEN** the coordinator STOPs, reports the missing/mismatched key, and does not dispatch the test-writer with a wrong or empty interface contract

#### Scenario: Matching Step N is present

- **WHEN** the coordinator dispatches the test-writer for Step N and `interfaces.md` has exactly one `## Step N` section
- **THEN** it injects that section's signatures and assertions into the test-writer prompt

### Requirement: Test-writer stubs obey the RED phase contract

The interface stubs the test-writer writes to reach a valid RED SHALL obey `implement-red-phase-contract`: a stub exposes the required symbol but returns a null/empty/wrong value and contains no logic that would satisfy the assertion. The test-writer SHALL NOT write real implementation logic into a stub — doing so would either make the RED pass (an invalid RED) or leak implementation authorship into the agent that is meant to be blind to the implementation.

#### Scenario: Test-writer needs a stub to compile the test

- **WHEN** the test file references a symbol that does not yet exist and the test-writer creates a stub so the test compiles
- **THEN** the stub returns a wrong/empty value with no assertion-satisfying logic, so the RED fails by assertion, per `implement-red-phase-contract`

### Requirement: Test-writer may read existing test files as a fallback

The test-writer MAY read existing test files and test infrastructure (fixtures, harness, shared helpers) when the injected testing context is insufficient to author a valid RED. It SHALL NOT read the Step's GREEN implementation body or other production source to derive the assertions. Reading existing test files does not leak the implementation body, so it preserves test independence while avoiding an unrecoverable invalid-RED when the injected context has a gap.

#### Scenario: Injected context is insufficient

- **WHEN** the injected testing context does not fully specify how to wire up a test and the test-writer cannot otherwise reach a valid RED
- **THEN** the test-writer may read existing test files and test infrastructure to match their patterns, but does not read the Step's implementation body

### Requirement: Implementation subagent cannot modify test files

The implementation dispatch SHALL write the GREEN implementation and verify GREEN, and SHALL be FORBIDDEN from creating or modifying any test file. This prohibition is the linchpin of the split: without it the implementation-mirroring channel reopens at GREEN time.

#### Scenario: GREEN passes without touching tests

- **WHEN** the implementation subagent completes a testable Step
- **THEN** it has modified only non-test files, leaving the test-writer's tests unchanged, and reports GREEN pass

### Requirement: Non-testable steps keep the single-dispatch flow

A Step that contains no RED block (config, migration, scaffolding, service-side) SHALL be processed with the existing single subagent dispatch — the coordinator SHALL NOT split it into two dispatches.

#### Scenario: Coordinator processes a non-testable Step

- **WHEN** the coordinator reaches an unchecked Step with no RED block
- **THEN** it dispatches exactly one subagent for that Step, as in the pre-split flow
