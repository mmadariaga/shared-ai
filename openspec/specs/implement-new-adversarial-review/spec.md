# implement-new-adversarial-review Specification

## Purpose
TBD - created by archiving change sai-build-new-adversarial-review. Update Purpose after archive.

## Requirements

### Requirement: Adversarial step review after GREEN

After GREEN closes a step, the `/sai-3-implement` coordinator SHALL stage GREEN's files, including new and unreported production files, and review the step's staged diff (`git diff --cached`, holding RED's tests and GREEN's production code) against the brief's spec scenarios and tasks before the step commits, applying the criteria of the Direct Build Step 2 functional fix loop in `sai/commands/explore/steps/pipeline-direct-build.md`. The structural check SHALL confirm that every scenario and task maps to changed production paths and to a test that asserts it, that the tests are not gamed (no special-casing of test inputs, no hard-coded expected values, no assertion that proves less than its scenario), that nothing beyond the brief or anticipatory of a later step is added, and that the production files match the plan or are justified in a deviation. The empirical check SHALL exercise the requested behavior through the project runnable surface (tests, CLI, or script) with the executor whenever feasible, rather than inferring it from the diff. The review SHALL be limited to spec fidelity, test gaming, and excess scope, and SHALL NOT report style, design, performance, or general security.

#### Scenario: GREEN hard-codes the expected value
- **WHEN** the step tests pass because GREEN returns the value a test expects instead of implementing the scenario
- **THEN** the coordinator reports a test-gaming finding before the step commits.

#### Scenario: GREEN creates a new production file
- **WHEN** GREEN satisfies the step tests through a production file it created
- **THEN** the file is staged before the review and its content is part of the reviewed diff.

#### Scenario: A style issue is not reported
- **WHEN** the step diff meets its scenarios and tasks but has a naming or formatting weakness
- **THEN** the review reports no finding for it and leaves it to the later review command.

### Requirement: Step review findings follow the shared artifact review contract

The coordinator SHALL form step review findings under `sai/policies/artifact-review-contract.md`, citing that contract rather than restating its format. An observation whose fix needs behavior the approved scope does not ask for SHALL be a scope observation, which SHALL be neither fixed nor recorded as pending and SHALL extend no round. The coordinator SHALL write each round's findings to `reviews/step-{n}-round-{k}.md` in the run directory.

#### Scenario: An out-of-scope observation

- **WHEN** the review notices a defect whose fix needs behavior outside the approved scope
- **THEN** the coordinator classifies it as a scope observation, sends it to no worker, and does not record it in `findings.md`.

### Requirement: Fix rounds go to the owning worker test-first

A round with findings SHALL send them as one ordered list to the worker that owns the defect: a production defect to GREEN and a wrong test to RED. A finding about a spec scenario that has no test SHALL go through RED first: RED writes the test, the coordinator runs it through the executor, confirms it fails by assertion, and stages its files, and only then sends the finding to GREEN. The fix message SHALL reuse the step's pointer line without resetting the role's step machine and SHALL name a new report path. After each fix the coordinator SHALL run the step's tests again through the executor and re-apply the GREEN closing check, and every file a fix changes SHALL join the step's paths.

#### Scenario: A scenario without a test

- **WHEN** a finding names a spec scenario that no test of the step asserts
- **THEN** the coordinator sends it to RED, confirms the new test fails by assertion, stages it, and only then sends the finding to GREEN.

### Requirement: Bounded fix rounds leave pending findings

Step review fix rounds SHALL NOT be attempts and SHALL spend no obstacle budget. The coordinator SHALL run at most 3 fix rounds per step and then read the diff once more; a round with no findings SHALL converge the review. Findings that remain after the third fix round SHALL be neither a failure nor an obstacle and SHALL NOT escalate: the coordinator SHALL write them to `findings.md` in the run directory, one entry per finding with the step, identifier, severity, location, issue, and correction, SHALL emit `record` (`finding`) the first time the file is written, and SHALL continue to the step commit. These pending findings SHALL be listed in the closing report at run close and SHALL NOT be written to any file outside the run directory. A worker that fails to carry out a fix round (an unreadable report, silence, or drift) SHALL be an ordinary obstacle of the step.

#### Scenario: Findings survive the third round

- **WHEN** the diff still has findings after the third fix round of a step
- **THEN** the coordinator writes them to `findings.md`, emits `record` (`finding`) on the first write, commits the step, does not escalate, and lists them in the closing report.

#### Scenario: A round converges

- **WHEN** a review round of a step returns no findings
- **THEN** the review ends and the coordinator continues to the step commit without another fix round.
