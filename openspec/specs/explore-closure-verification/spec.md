# explore-closure-verification Specification

## Purpose

TBD

## Requirements

### Requirement: Contract tests verify closure boundaries and harness parity

The explore contract tests SHALL verify the closure invariant for ordinary successful turns and existing terminal paths. Coverage MUST include turns with no active candidate idea, active turns that end with a genuine question, active turns without a genuine question, repeated fallback reminders, explicit discard, explicit crystallization and post-crystallization silence, the existing post-crystallization review-loop silent close, and prerequisite halt behavior with its exact remediation literal.

The verification SHALL exercise the shared behavior through both Claude Code and opencode surfaces and SHALL assert identical closure outcomes. Tests MUST remain read-only with respect to exploration and MUST NOT weaken the existing explicit crystallization gate, readiness-signal limit, or terminal failure contracts.

#### Scenario: Tests cover ordinary active turns

- **WHEN** the contract suite runs the active-uncrystallized question and no-question cases
- **THEN** it verifies the question-first rule and the literal `crystallize` fallback reminder
- **AND** it verifies that a later qualifying turn can repeat the reminder

#### Scenario: Tests cover the no-active-idea boundary

- **WHEN** the contract suite runs a successful greeting or command-explanation turn before a candidate idea becomes active
- **THEN** it verifies that no Closure State is active
- **AND** it verifies that neither the question ending nor the fallback `crystallize` reminder is forced

#### Scenario: Tests cover lifecycle terminal boundaries

- **WHEN** the contract suite runs explicit discard, explicit crystallization, post-crystallization, and completed review-loop paths
- **THEN** it verifies that no new pre-crystallization closure is appended outside the active-uncrystallized state
- **AND** it preserves the existing crystallization closing behavior and review-loop silent-close allowance

#### Scenario: Tests preserve prerequisite failure behavior

- **WHEN** the contract suite runs a prerequisite halt
- **THEN** it verifies the exact existing remediation output and failure behavior
- **AND** it verifies that the successful-response closure rule does not alter the halt path

#### Scenario: Tests preserve Claude Code and opencode parity

- **WHEN** the same qualifying scenarios are evaluated through the Claude Code and opencode `sai-explore` entry surfaces
- **THEN** both surfaces produce the same state-dependent closure behavior and literal tokens
- **AND** no harness-specific workaround changes the shared contract
