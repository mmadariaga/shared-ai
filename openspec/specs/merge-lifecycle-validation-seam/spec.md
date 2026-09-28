# merge-lifecycle-validation-seam Specification

## Purpose
Defines the coordinator-owned merge lifecycle state machine: its states, the exhaustive permitted-transition table, and the validation the coordinator runs before each operation.

## Requirements

### Requirement: Defined merge lifecycle states and paths

The merge lifecycle validation seam MUST define the closed states `preflight`, `method-selection`, `branch-selection`, `merge-outcome`, `language-selection`, `scope-selection`, `contextual-analysis`, `resolution`, `verification`, `adr-ddr`, `authorization`, and `terminal`, covering the clean and conflicted merge paths and the per-stop rebase cycle.

#### Scenario: Coordinator tracks an integration outcome

- **WHEN** the coordinator records a clean or conflicted outcome of a launch or a `git rebase --continue`
- **THEN** the lifecycle advances from `merge-outcome` along the matching defined path

### Requirement: Coordinator transition validation boundary

Before selecting each merge operation, the coordinator SHALL call `validate_transition(current_state, target_state, operation_context)`. A transition SHALL be `valid` only when its row exists in the permitted-transition table and its precondition holds; an `invalid` result SHALL halt before the operation and report the current state, target state, and violated precondition.

#### Scenario: Missing context prevents operation selection

- **WHEN** a transition is requested without its required operation context
- **THEN** the validator returns `invalid` and no operation, worker dispatch, mutation, or presentation update follows

### Requirement: Exhaustive permitted-transition table

The permitted-transition table MUST list every transition a real run takes, including early closures to `terminal` from any state when the worker returns a closing result, re-entry from `resolution` or `verification` to `contextual-analysis` on a `strategy-analysis` event, the rebase cycle `verification` → `authorization` → `merge-outcome`, and the finished-rebase closure `adr-ddr` → `terminal` when nothing is staged.

#### Scenario: Clean integration follows the clean path

- **WHEN** the current state is `merge-outcome`, the target is `adr-ddr`, and the outcome is clean
- **THEN** the validator returns `valid` and the run skips every conflict-only state

#### Scenario: First conflict enters language selection

- **WHEN** the current state is `merge-outcome`, the outcome is conflicted, and `working_language` is unresolved
- **THEN** only `language-selection` is a valid target

#### Scenario: Later rebase stop reuses the language

- **WHEN** the current state is `merge-outcome`, the outcome is conflicted, and `working_language` is already selected
- **THEN** `contextual-analysis` is a valid target without a language question

#### Scenario: Declined strategy closes the run

- **WHEN** the worker closes the run after `decline-strategy`
- **THEN** the transition to `terminal` is valid and `commit_executed` stays false

### Requirement: Merge gate preconditions are explicit

The validator SHALL require a resolved language, an eligible scope or fast-track full scope, a confirmed strategy with a validated payload, a reviewed and staged resolution, an accepted verification result, resolved collision applicability with repairs applied, and a recorded authorization answer at their respective boundaries.

#### Scenario: Fast-track bypasses only method and scope selection

- **WHEN** fast-track is active
- **THEN** `preflight` → `branch-selection` is valid with the method pinned to `merge`, the scope is satisfied by `full`, and every other precondition still applies

### Requirement: Neutral coordinator and worker ownership

The lifecycle validation seam SHALL remain neutral for Claude Code and opencode and coordinator-owned, and MUST NOT dispatch workers, perform git mutations, write resolutions, or transfer mutation ownership.

#### Scenario: Conflict analysis and mutation remain separated

- **WHEN** the merge flow reaches conflict analysis or a coordinator-owned mutation boundary
- **THEN** the seam validates lifecycle state while the worker keeps analysis and the coordinator keeps every mutation
