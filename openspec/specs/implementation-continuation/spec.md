## ADDED Requirements

### Requirement: Recommended default emitted first at the implementation-continuation gate

The sai-2-design proceed-to-implementation gate — which offers (a) `Stop for a new chat` and (b) `Continue now in this chat` — SHALL declare `Stop for a new chat` as its default option, emit it as the FIRST option in the harness option-picker, and label that first option `Recommended`. Reordering plus the label are the ONLY changes: the gate SHALL still wait for the user, SHALL NOT auto-select the default, and SHALL NOT write the choice to any file. The `Continue now in this chat` option stays second and remains fully available. Recommending `Stop for a new chat` steers toward the cheaper branch (fresh, isolated context and a cheaper model for `/sai-3-implement`) rather than an inflated same-chat context.

#### Scenario: Stop for a new chat is the first option and carries the Recommended label

- **WHEN** the gate asks how to proceed to implementation after design artifacts are written
- **THEN** the first option presented is `Stop for a new chat` carrying the `Recommended` marker, and `Continue now in this chat` is presented after it

#### Scenario: default is not auto-selected

- **WHEN** the gate is presented with `Stop for a new chat` first and labeled Recommended
- **THEN** no option is pre-selected; the agent waits for the user's explicit choice

#### Scenario: continue branch remains available

- **WHEN** the user explicitly selects `Continue now in this chat`
- **THEN** the agent proceeds with the same-chat continuation exactly as before the Recommended ordering was applied
