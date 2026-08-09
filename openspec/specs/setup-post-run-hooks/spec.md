# setup-post-run-hooks Specification

## Purpose

TBD — delta spec for the new capability carried no Purpose body.

## Requirements

### Requirement: Optional post-setup workflow seam
`bin/setup.js` SHALL expose an exported CommonJS setup orchestration seam that accepts an optional injected post-setup workflow. The default workflow SHALL be a no-op. When supplied, the workflow SHALL be awaited exactly once after schema templates have been copied successfully, and it SHALL receive the resolved project path and the active readline interface as setup context.

#### Scenario: Setup runs without an injected workflow
- **WHEN** setup completes without a post-setup workflow dependency
- **THEN** setup SHALL perform no post-setup work, display no new menu-specific prompt or output, and preserve the existing completion behavior

#### Scenario: Setup runs with an injected workflow
- **WHEN** the existing setup steps complete through schema template copying and a post-setup workflow is injected
- **THEN** setup SHALL invoke that workflow once with the resolved project path and an open readline interface before setup finishes

#### Scenario: Schema copying does not complete
- **WHEN** an existing setup step fails before schema template copying completes
- **THEN** the post-setup workflow SHALL NOT be invoked

### Requirement: Readline remains available through post-setup work
The setup orchestration SHALL own the readline lifecycle and SHALL keep the active readline interface open until schema template copying and the injected post-setup workflow have both settled. It SHALL close the interface after the workflow settles, including when the workflow rejects, and the injected workflow SHALL NOT own interface creation or closure.

#### Scenario: Interactive post-setup workflow uses readline
- **WHEN** an injected post-setup workflow inspects the setup context
- **THEN** the supplied readline interface SHALL still be open and usable for interactive prompts

#### Scenario: Post-setup workflow rejects
- **WHEN** an injected post-setup workflow rejects after schema templates are copied
- **THEN** setup SHALL close readline before propagating the failure to the command boundary

#### Scenario: Setup exits before the seam
- **WHEN** setup is declined or fails before post-setup work begins
- **THEN** setup SHALL close any readline interface it created and SHALL NOT invoke the post-setup workflow

### Requirement: Testable functional orchestration
The setup orchestration and post-setup seam SHALL use exported CommonJS functions and an options-object dependency-injection pattern consistent with existing installer helpers. The exported setup functions SHALL NOT call `process.exit`. For controlled setup completion, `main` SHALL return exactly one of the outcomes `success`, `aborted`, `required-failure`, or `post-setup-failure`; the CLI entry boundary SHALL map `success` and `aborted` to exit status 0, and `required-failure` and `post-setup-failure` to exit status 1. Requiring `bin/setup.js` SHALL remain side-effect free and SHALL NOT start the setup flow.

#### Scenario: Tests inject setup dependencies
- **WHEN** a test supplies readline creation and post-setup workflow dependencies
- **THEN** it SHALL be able to observe setup ordering, workflow invocation, and readline closure without raw terminal input or process termination

#### Scenario: CLI preserves exit status
- **WHEN** the setup command reaches a prior success, user-abort, or required-step failure outcome
- **THEN** the setup module SHALL return `success`, `aborted`, or `required-failure` respectively, and the command boundary SHALL map those outcomes to the existing exit statuses 0, 0, and 1 without the setup module terminating the process

#### Scenario: Post-setup workflow failure has a defined status
- **WHEN** an injected post-setup workflow rejects after schema templates are copied
- **THEN** setup SHALL return `post-setup-failure` and the command boundary SHALL exit with status 1 without the setup module terminating the process

#### Scenario: Module is required for dispatch
- **WHEN** `bin/setup.js` is required by `bin/install.js`
- **THEN** it SHALL only expose its public functions and SHALL not create readline, prompt, copy templates, invoke the post-setup workflow, or terminate the process

### Requirement: Existing setup behavior remains unchanged
Adding the seam SHALL preserve the existing setup step order, prompts, output, required-step failure behavior, and successful completion message. This change SHALL NOT display a new menu, add menu-specific output, modify agent files, or change the existing install-flow offer contracts.

#### Scenario: Successful setup preserves the existing sequence
- **WHEN** setup succeeds with the default no-op workflow
- **THEN** it SHALL perform the existing setup operations in their existing order, print the existing copy confirmation and `SAI workflow configured at <projectPath>.` message, and finish without a menu

#### Scenario: Existing prompt behavior is preserved
- **WHEN** setup reaches an existing confirmation or install offer
- **THEN** it SHALL retain the existing prompt, response handling, and observable abort or failure behavior

#### Scenario: Optional workflow is the only new extension point
- **WHEN** the change is implemented without a supplied post-setup workflow
- **THEN** no other abstraction, dependency, agent-file change, or user-facing behavior SHALL be introduced
