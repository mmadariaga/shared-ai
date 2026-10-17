# explore-question-presentation Specification

## Purpose
Make the native question tools explicit at each applicable Explore question definition and protect this local instruction coverage with focused regression tests. Preserve existing question semantics, conversational exceptions, and shared fallback rules.

## Requirements

### Requirement: Explore closed-choice definitions name both native tools locally

Applicable closed-choice question definitions under `sai/commands/explore/steps/` SHALL locally reference the "Closed-choice prompts" rule in `sai/policies/remember.md` and name `AskUserQuestion` on Claude Code and `question` on opencode. A general instruction or an instruction at a neighboring question SHALL NOT replace this local instruction.

This applies to issue work, drift and shortcut questions; open decisions; artifact-review, crystallization and overview language questions; maturity and later-stage selectors; backlog, branch, assignment, publication and base questions; retry-or-skip and existing-branch questions; route and continuation questions; pending Direct Build intervention; spec and design closed-choice escalations; per-change review selection; uncertainty go/no-go; and POC candidate-winner selection. Existing complete definitions remain covered without unnecessary rewriting.

#### Scenario: Several questions share one step file
- **WHEN** a step file defines several applicable closed-choice questions
- **THEN** each question's own definition names both harness tools and the shared closed-choice rule independently of neighboring definitions.

#### Scenario: An escalated worker question is closed choice
- **WHEN** Explore escalates a spec or design worker's closed-choice question
- **THEN** its escalation definition explicitly names both harness tools and the shared rule while preserving the worker's exact question and ordered options.

### Requirement: Explicit picker wording preserves existing question semantics

The added presentation instructions MUST retain existing question wording, options, applicability, ordering, skip conditions, and surrounding presentation requirements. Explicitly conversational questions SHALL remain plain text. The shared native-picker-unavailable and capacity fallbacks SHALL remain authoritative, and optional native selectors SHALL retain their existing capability conditions and text-only fallback.

#### Scenario: A question is explicitly conversational
- **WHEN** Explore presents the global semantic-path review invitation, list-stage agreement, or POC candidate-list agreement
- **THEN** the existing plain conversational question remains outside the native-picker requirement.

#### Scenario: The native picker cannot present the options
- **WHEN** a native picker is unavailable or the option set exceeds its declared capacity
- **THEN** Explore retains the plain-text fallback defined in `sai/policies/remember.md` without changing option order or meaning.

### Requirement: Regression assertions isolate individual question definitions

Instruction regression tests MUST check applicable question definitions independently for the shared policy reference and both tool names. A match elsewhere in the file MUST NOT satisfy a missing local requirement. Tests SHALL also protect conversational exceptions and shared fallback instructions; they verify instruction coverage rather than model compliance at runtime.

#### Scenario: A local instruction loses one required reference
- **WHEN** a regression fixture removes `AskUserQuestion`, `question`, or the policy reference from the issue drift question while other questions retain it
- **THEN** the definition-bounded assertion rejects the incomplete question despite those neighboring matches.

#### Scenario: Explicit conversational exceptions are checked
- **WHEN** the regression suite checks the global review invitation and conversational list-agreement definitions
- **THEN** it requires their plain-text exceptions and rejects the added native-picker sentence within those definitions.
