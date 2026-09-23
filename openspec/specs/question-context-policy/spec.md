# question-context-policy Specification

## Purpose

Defines the canonical question-context policy (`sai/policies/question-context.md`) — the five-element anatomy of every user-facing decision prompt in the pipeline, its single-source ownership, its installation across harnesses, and the rule that compliance is satisfied at the surface that authors the prompt.
## Requirements
### Requirement: question-context-policy-file

The canonical policy SHALL live at `sai/policies/question-context.md` and SHALL define the five-element anatomy of every user-facing decision prompt, each element normative with SHALL language:

1. **What is being decided** — the prompt SHALL name the decision the user is being asked to make.
2. **Why it matters** — the prompt SHALL state why the decision matters and why the user's input is needed.
3. **Plain-language options** — the prompt SHALL state each option in plain words, including what choosing it means.
4. **Essential state context** — the prompt SHALL carry the minimal decision-relevant context (for example the change name, the artifacts or values at stake, and the current state) needed to decide from the prompt alone.
5. **Plain wording** — the prompt SHALL use plain user-facing language; it SHALL NOT rely on bare jargon, unexplained artifact names, or internal references that a context-switched reader cannot resolve.

The options element SHALL apply only to decision prompts. An informational message (the design-only notice) SHALL instead carry the informational-notice subset: what is being reported, why it matters, the essential state context, and plain wording — with no options element required.

The anatomy SHALL apply to every user-facing decision prompt, with no exemptions. A pinned prompt such as `Use change '{name}'?` or `Which change?` SHALL keep its exact wording, ordered options, and invalid-input semantics as the picker's summary question, and SHALL carry the remaining anatomy in the preceding plain text of the concise format.

The question-context policy SHALL reference the broader public-chat communication policy at `sai/policies/public-chat.md` for readability and context rules rather than duplicating them. Option-picker mechanics SHALL remain owned by `sai/policies/remember.md`.

#### Scenario: every element is present

- **WHEN** a user-facing decision prompt is inspected
- **THEN** all five elements of the anatomy are present in the prompt

#### Scenario: a context-switched reader can decide from the prompt alone

- **WHEN** a user who never saw the planning conversation (for example a PR reviewer) reads the prompt
- **THEN** the prompt contains enough state context and plain wording to answer without reading another artifact or conversation

#### Scenario: specialized policy delegates shared communication rules

- **WHEN** a worker or coordinator authors a user-facing decision prompt
- **THEN** the prompt uses the specialized five-element anatomy together with the shared public-chat rules

#### Scenario: informational notice uses the notice subset

- **WHEN** a design notice message is inspected
- **THEN** it carries what is being reported, why it matters, the essential state context, and plain wording
- **AND** no options element is required, because the notice is informational, not a decision prompt

#### Scenario: pinned change-selection prompts keep their wording

- **WHEN** `Use change '{name}'?` or `Which change?` is emitted
- **THEN** it remains the pinned summary question with its ordered options and invalid-input semantics unchanged
- **AND** the preceding plain text carries the rest of the anatomy

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

The policy SHALL be fetchable as `@sai/policies/question-context.md` for both Claude Code and opencode through the existing recursive `sai-policies` projection (the `sai-policies` entry in `sai/install-manifest.json`). No install-manifest entry, harness binding, wrapper, or agent file SHALL be required for the policy to reach either harness.

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

- **WHEN** the merge coordinator renders `¿Sobre qué rama quieres operar?` with date-bearing branch options
- **THEN** it preserves the exact question and option values while presenting branch timestamps and merge rationale in the adjacent summary

### Requirement: Merge strategy confirmation provides complete decision context

The merge strategy confirmation SHALL be preceded by a worker-authored strategy that names each semantic conflict, explains why the choice matters, describes each complete behavioral alternative in plain language by branch rather than by `ours` / `theirs`, and includes affected state and contracts. The question source SHALL comply with the canonical question-context policy.

#### Scenario: Strategy confirmation supports an informed choice

- **WHEN** the worker asks the user to confirm the global resolution strategy
- **THEN** the adjacent worker-authored strategy identifies the affected behavior, alternatives, trade-offs, and current decision state in plain language

### Requirement: Conflict-language question carries complete context

The coordinator-authored conflict-language question SHALL name the language decision, explain that the language controls conflict explanation and resolution strategy, offer the available language choices in plain words, and carry the current conflict state. It SHALL be presented only after conflict detection and SHALL use the ambient conversation language for explanatory wording while preserving exact language-token values.

#### Scenario: Language question follows conflict detection

- **WHEN** the worker returns `conflict_detected` with `continuation_state: language-selection`
- **THEN** the coordinator asks `Which language should I use for the conflict explanation and resolution strategy?` after presenting the conflict notice

#### Scenario: Clean merge has no language question

- **WHEN** the merge outcome is clean
- **THEN** no conflict-language decision prompt is presented

### Requirement: Strategy question preserves source fidelity

The worker-authored global strategy question and options SHALL be forwarded unchanged by the coordinator after the strategy source is rendered as ordinary text. Protocol values SHALL remain stable while explanatory labels may be localized.

#### Scenario: Strategy options remain stable

- **WHEN** the strategy confirmation is presented
- **THEN** its ordered values remain `apply-strategy`, `revise-strategy`, and `decline-strategy`

### Requirement: Concise-format section replaces exemption registry
The policy file SHALL define the concise-format rule with split, limits, self-sufficiency, universal scope, literal preservation, and fallback, and SHALL NOT retain a pinned exemption registry.
#### Scenario: Policy carries concise rule without exemptions
- **WHEN** the question-context policy is read
- **THEN** it presents the concise-format rule and contains no exemption registry

