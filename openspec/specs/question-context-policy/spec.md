# question-context-policy Specification

## Purpose

Defines the canonical question-context policy (`sai/policies/question-context.md`) — the five-element anatomy of every user-facing decision prompt in the pipeline, its single-source ownership, its installation across harnesses, and the rule that compliance is satisfied at the surface that authors the prompt.

## Requirements

### Requirement: Present the renamed three-option selector

The closed-choice question policy SHALL describe the crystallization selector as exactly three options in fixed order: Plan (unattended), Build (unattended), and Manual. The question and descriptions SHALL localize while stable identities remain machine-readable.

#### Scenario: selector options are presented

- **WHEN** the crystallization selector is shown
- **THEN** the three options appear in fixed order through the supported native picker.

### Requirement: question-context-policy-file

The canonical policy SHALL live at `sai/policies/question-context.md` and SHALL define the five-element anatomy of every user-facing decision prompt, each element normative with SHALL language:

1. **What is being decided** — the prompt SHALL name the decision the user is being asked to make.
2. **Why it matters** — the prompt SHALL state why the decision matters and why the user's input is needed.
3. **Plain-language options** — the prompt SHALL state each option in plain words, including what choosing it means.
4. **Essential state context** — the prompt SHALL carry the minimal decision-relevant context (for example the change name, the artifacts or values at stake, and the current state) needed to decide from the prompt alone.
5. **Plain wording** — the prompt SHALL use plain user-facing language; it SHALL NOT rely on bare jargon, unexplained artifact names, or internal references that a context-switched reader cannot resolve.

The options element SHALL apply only to decision prompts. An informational message (the design-only notice) SHALL instead carry the informational-notice subset: what is being reported, why it matters, the essential state context, and plain wording — with no options element required.

The pinned change-selection prompts — `Use change '{name}'?` and `Which change?` — SHALL remain exempt from the full anatomy: they SHALL stay as pinned terse prompts with their ordered options and invalid-input semantics unchanged, and the anatomy SHALL apply to every other user-facing decision prompt.

#### Scenario: every element is present

- **WHEN** a user-facing decision prompt is inspected
- **THEN** all five elements of the anatomy are present in the prompt

#### Scenario: a context-switched reader can decide from the prompt alone

- **WHEN** a user who never saw the planning conversation (for example a PR reviewer) reads the prompt
- **THEN** the prompt contains enough state context and plain wording to answer without reading another artifact or conversation

#### Scenario: informational notice uses the notice subset

- **WHEN** a design notice message is inspected
- **THEN** it carries what is being reported, why it matters, the essential state context, and plain wording
- **AND** no options element is required, because the notice is informational, not a decision prompt

#### Scenario: pinned change-selection prompts stay exempt

- **WHEN** `Use change '{name}'?` or `Which change?` is emitted
- **THEN** it remains the pinned terse prompt with its ordered options and invalid-input semantics unchanged
- **AND** the full anatomy applies to every other user-facing decision prompt

#### Scenario: glossary documents the contract term

- **WHEN** the change introduces the Question Context Contract term
- **THEN** the project-root `GLOSSARY.md` documents it per the glossary format

### Requirement: question-context-single-source

Every user-facing question surface in the pipeline SHALL draw the prompt-content contract from `sai/policies/question-context.md` by reference, and SHALL NOT restate or redefine the anatomy inline. The policy file SHALL remain the single source of the anatomy.

#### Scenario: a surface cites the policy instead of restating it

- **WHEN** a consuming instruction or worker contract requires question phrasing
- **THEN** it references `@sai/policies/question-context.md` (or `sai/policies/question-context.md`) and does not duplicate the five-element definition

#### Scenario: the anatomy is amended

- **WHEN** the anatomy definition changes in `sai/policies/question-context.md`
- **THEN** no consuming surface needs an edit, because no surface restates the anatomy

### Requirement: question-context-policy-installation

The policy SHALL be fetchable as `@sai/policies/question-context.md` for both Claude Code and opencode through the existing recursive `sai-policies` projection (`sai/install-manifest.json:9`). No install-manifest entry, harness binding, wrapper, or agent file SHALL be required for the policy to reach either harness.

#### Scenario: both harnesses can fetch the policy

- **WHEN** a Claude Code or opencode session resolves `@sai/policies/question-context.md`
- **THEN** the fetch resolves to the installed policy content without any projection change

### Requirement: question-content-compliance-at-source

Compliance with the question-context anatomy SHALL remain authored at the source of the worker question. A coordinator MAY render a worker-authored exact question and ordered options together with an adjacent decision-oriented summary that supplies current state context, provided it does not rephrase the question, alter option values, or change continuation semantics.

#### Scenario: coordinator forwards the question unchanged

- **WHEN** a worker returns a `needs_input` question that complies with the anatomy
- **THEN** the coordinator forwards the exact question and options verbatim, unchanged

#### Scenario: no coordinator-side context injection

- **WHEN** a worker-authored question is forwarded
- **THEN** the coordinator adds no context, rephrasing, or restructure, per the shared coordinator contract and isolation rules
- **THEN** the coordinator adds no context inside the question itself and may place decision-oriented state in an adjacent summary without changing the question or options

#### Scenario: Merge question stays exact beside its summary

- **WHEN** the merge coordinator renders `¿Qué rama quieres mergear?` with date-bearing branch options
- **THEN** it preserves the exact question and option values while presenting branch timestamps and merge rationale in the adjacent summary

### Requirement: Contextual merge questions provide complete decision context

A semantic merge decision prompt SHALL name the conflict, explain why the choice matters, describe each complete behavioral option in plain language, include affected state and contracts, and distinguish the decision from a text-fragment choice. The question source SHALL comply with the canonical question-context policy.

#### Scenario: Contextual question supports an informed choice

- **WHEN** the worker asks the user to choose an outcome for a semantic merge conflict
- **THEN** the prompt and adjacent worker-authored context identify the affected behavior, alternatives, trade-offs, and current decision state in plain language

### Requirement: Centralized pinned-anatomy exemption registry
`sai/policies/question-context.md` SHALL host the centralized registry of prompts exempt from the full five-element anatomy — the change-picker prompts, the status-picker prompts, the artifact-feedback-gate texts, the crystallization-close selector, and the plain-text sí/no review invitation — each keeping its own defining contract as the single source of its exact wording, options, and invalid-input semantics. Consuming surfaces SHALL reference the registry and SHALL NOT add, remove, or reinterpret an exemption elsewhere, and registered exemptions SHALL remain byte-stable.

#### Scenario:
- **WHEN** a command surface pins a terse prompt outside the full anatomy
- **THEN** the exemption is registered once in question-context.md and every consuming surface references that registry instead of declaring its own carve-out
