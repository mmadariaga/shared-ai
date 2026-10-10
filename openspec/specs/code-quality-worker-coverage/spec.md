# code-quality-worker-coverage Specification

## Purpose
Deliver the existing code-quality priority policy explicitly to Apply RED/GREEN, Direct Build, review-fix, and code-authoring merge workers while retaining their existing scope and restrictions.

## Requirements

### Requirement: Apply Code Writers Load the Existing Policy

The shared Apply RED/GREEN instructions SHALL explicitly load `sai/policies/code-quality-priority-stack.md` using `Fetch @sai/policies/code-quality-priority-stack.md`. The policy SHALL apply within the assigned Step and existing role restrictions and SHALL grant no additional paths or permissions. GREEN's test-file prohibition SHALL remain in force.

#### Scenario: Both Apply roles receive the policy

- **WHEN** RED or GREEN loads `sai/commands/apply/worker-common.md`
- **THEN** the shared instructions explicitly load the existing policy within the assigned Step and role restrictions without permitting GREEN to edit tests

### Requirement: Direct Build Loads the Policy Within Its Assigned Scope

The Direct Build worker SHALL explicitly load `sai/policies/code-quality-priority-stack.md` using `Fetch @sai/policies/code-quality-priority-stack.md`. The policy SHALL apply within the crystallized block's scope and the worker's existing role restrictions.

#### Scenario: Direct Build receives code-quality guidance

- **WHEN** the Direct Build worker loads its worker contract
- **THEN** the contract explicitly loads the existing policy while retaining the crystallized block's scope and existing role restrictions

### Requirement: Review Fixes Load the Policy Within Selected Findings

The review-fix worker SHALL explicitly load `sai/policies/code-quality-priority-stack.md` using `Fetch @sai/policies/code-quality-priority-stack.md`. The policy SHALL apply only to the selected findings and SHALL retain the worker's existing exclusions and role restrictions.

#### Scenario: Review-fix guidance remains findings-driven

- **WHEN** the review-fix worker loads its worker contract
- **THEN** the contract explicitly loads the existing policy only for the selected findings without expanding its exclusions or role restrictions

### Requirement: Merge Loads the Policy Before Code Authorship

Merge's writing-resolution instructions SHALL require loading `sai/policies/code-quality-priority-stack.md` before authoring a code resolution or coordinator-authorized code correction. Its test-correction instructions SHALL require the same load before authoring a proposed code correction. The approved strategy and behavior-preservation requirements SHALL prevail over the policy. Application SHALL remain within authorized ranges, and proposed correction guidance SHALL grant no write permission: the coordinator MUST authorize and capture correction ranges before application.

Choosing a complete existing version through `git-ours` or `git-theirs` alone SHALL require no policy load.

#### Scenario: Merge authors a resolution

- **WHEN** the merge worker authors a code resolution or coordinator-authorized code correction
- **THEN** the writing-resolution instructions require the existing policy load while preserving the approved strategy, behavior, and authorized ranges

#### Scenario: Merge proposes a correction after whole-side selection

- **WHEN** merge enters test-correction to author a proposed code correction after a whole-side-only apply
- **THEN** the test-correction instructions require the existing policy load without granting write permission before coordinator authorization and range capture

#### Scenario: Merge selects an existing version without authoring code

- **WHEN** merge only chooses a complete existing version through `git-ours` or `git-theirs`
- **THEN** that choice alone requires no code-quality policy load

### Requirement: Coverage Remains Single-Sourced and Harness-Equivalent

New worker coverage SHALL reference the existing policy rather than copy its rules. Existing implementation-planning and conditional review loads SHALL remain in place. New Fetch references SHALL be limited to shared Apply instructions, Direct Build, review-fix, and the code-authoring merge stages; artifact-only workers, read-only audits, and generic helpers SHALL receive no new loads.

Tests SHALL verify the intended Fetch-reference holders, merge stage disclosure, and identical shared policy and worker-instruction projection for Claude Code and opencode.

#### Scenario: Policy coverage does not duplicate rules

- **WHEN** the policy coverage tests inspect the instruction surfaces
- **THEN** they verify the intended reference holders and absence of copied policy rules in the newly covered workers

#### Scenario: Merge discloses conditional loads only to code-authoring stages

- **WHEN** the merge instruction tool discloses strategy, apply, test-correction, and renumbering-plan stages
- **THEN** the policy Fetch appears in apply and test-correction but not strategy or renumbering-plan

#### Scenario: Both harnesses receive the same shared instructions

- **WHEN** the install manifest is expanded for Claude Code and opencode
- **THEN** projection tests verify that each harness receives the shared policy and covered worker instructions with unchanged source content
