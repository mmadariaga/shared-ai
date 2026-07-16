## ADDED Requirements

### Requirement: Scope limited to sai-explore

The post-crystallization review loop SHALL apply only within `sai-explore`. No other `sai-*` command's behavior SHALL change. The behavior SHALL be documented in `sai/instructions/explore.md` only; this change SHALL NOT modify `AGENTS.md`, the `commands/{claude,opencode,copilot}/sai-explore.*` wrappers, or any other file.

#### Scenario: other sai commands are unaffected

- **WHEN** any `sai-*` command other than `sai-explore` runs
- **THEN** its behavior is unchanged and no post-crystallization review section is offered

#### Scenario: change is confined to explore.md

- **WHEN** this change is implemented
- **THEN** the new behavior is expressed entirely in `sai/instructions/explore.md`
- **AND** no wrapper, `AGENTS.md`, or other `sai-*` instruction file is modified

### Requirement: Global Yes/No offered unconditionally

Immediately after a `Ready to Propose` block is printed, `sai-explore` SHALL print a visual divider and then offer a single global Yes/No question asking whether the user wants to review downstream artifacts. The question SHALL be offered with **no precondition** — it SHALL be asked whether or not any downstream artifact exists — so the section behaves identically across sessions. Selecting No SHALL be a hard stop on the entire new section.

#### Scenario: question follows every Ready to Propose block

- **WHEN** `sai-explore` prints a `Ready to Propose` block
- **THEN** it prints a visual divider and offers the global Yes/No review question below the block

#### Scenario: no precondition on downstream artifacts

- **WHEN** the global Yes/No question is due to be offered and no downstream artifact exists for any change
- **THEN** the question is still offered

#### Scenario: No is a hard stop

- **WHEN** the user selects No on the global question
- **THEN** the entire post-crystallization review section ends immediately and no per-change loop is entered

#### Scenario: sliced crystallization offers the section once

- **WHEN** a crystallization turn emits multiple `Ready to Propose` blocks (sliced mode)
- **THEN** the global Yes/No question is offered only once, after the final block of that turn

### Requirement: Per-change review loop over chat-crystallized changes

When the user selects Yes, `sai-explore` SHALL iterate only the set of change names that the current `sai-explore` chat has already crystallized. This tracked set is in-conversation state only: it starts empty at the beginning of the chat, is updated only when crystallization output emits a change name, preserves first-emission order, and ignores duplicate later emissions of the same change name. The loop SHALL iterate the tracked set in that preserved order, without re-sorting and without consulting repository-wide change discovery. The loop SHALL NOT include unrelated non-archived changes that were not crystallized in the current chat. When the tracked set is empty, the per-change loop SHALL be a no-op and terminate immediately after the global Yes.

#### Scenario: iterate only over changes crystallized in this chat

- **WHEN** the user selects Yes after the current chat has crystallized one or more change names
- **THEN** the agent iterates only those crystallized change names
- **AND** it does not offer reviews for any other non-archived change in the repository

#### Scenario: tracked set starts empty for a fresh chat

- **WHEN** a fresh `sai-explore` chat reaches the global Yes path before any crystallization output emitted a change name
- **THEN** the tracked set is empty
- **AND** the per-change loop performs no iterations and ends immediately

#### Scenario: first emission order is preserved

- **WHEN** the current chat crystallizes change A, then change B, then change C
- **THEN** the global Yes path iterates A, then B, then C in that same order

#### Scenario: duplicate crystallized names are ignored

- **WHEN** the current chat crystallizes change A and later emits change A again
- **THEN** the tracked set contains change A only once
- **AND** the global Yes path offers the picker for change A only once in the loop

### Requirement: Review actions read their artifact sets

For the change currently being iterated, selecting `Review sai-1's artifacts` SHALL produce a read-only review of that change's `proposal.md` and `specs/**`, and selecting `Review sai-2's artifacts` SHALL produce a read-only review of that change's `design.md`, `tasks.md`, and `interfaces.md`. When a requested artifact does not exist for the change, the agent SHALL report its absence without treating it as an error and without leaving the loop.

#### Scenario: Review sai-1's artifacts reads proposal and specs

- **WHEN** the user selects `Review sai-1's artifacts` for the current change
- **THEN** the agent produces a read-only review of that change's `proposal.md` and `specs/**`

#### Scenario: Review sai-2's artifacts reads design, tasks, and interfaces

- **WHEN** the user selects `Review sai-2's artifacts` for the current change
- **THEN** the agent produces a read-only review of that change's `design.md`, `tasks.md`, and `interfaces.md`

#### Scenario: missing downstream artifact is reported, not fatal

- **WHEN** the user selects a review action for a change whose requested artifact does not exist
- **THEN** the agent reports the artifact's absence and remains in the loop

#### Scenario: proposal exists but sai-1 specs are missing

- **WHEN** the user selects `Review sai-1's artifacts` for a change that has `proposal.md` but no `specs/**/*.md`
- **THEN** the agent reviews the available proposal read-only
- **AND** it explicitly reports that the sai-1 artifact set is incomplete because the normative specs are missing
- **AND** it states that behavior review is blocked by the missing specs rather than presenting the artifact set as fully reviewable
- **AND** it remains in the loop

### Requirement: Picker re-entry and loop advancement

After a `Review sai-1's artifacts` or `Review sai-2's artifacts` selection for a change, the agent SHALL re-show the same three-option picker for that same change, so the user can review both artifact sets or repeat a review. Only `Skip` SHALL advance the loop to the next eligible change. The loop SHALL terminate when every eligible change in the tracked chat-scoped set has been processed.

#### Scenario: review re-shows the picker for the same change

- **WHEN** the user selects `Review sai-1's artifacts` or `Review sai-2's artifacts` for a change
- **THEN** after the review the agent re-shows the same picker for that same change

#### Scenario: both sets reviewable for one change

- **WHEN** the user selects `Review sai-1's artifacts`, and then on the re-shown picker selects `Review sai-2's artifacts` for the same change
- **THEN** the agent produces both reviews and re-shows the picker after each

#### Scenario: only Skip advances to the next change

- **WHEN** the user selects `Skip` for the current change
- **THEN** the loop advances to the next eligible change in the tracked set (or terminates if none remain)

#### Scenario: loop terminates when eligible changes are exhausted

- **WHEN** the user has processed every eligible change in the tracked chat-scoped set (by `Skip`)
- **THEN** the loop terminates and the section ends

### Requirement: Read-only constraint

The review loop SHALL be strictly read-only. It SHALL NOT create, modify, or delete `proposal.md`, `specs/**`, `design.md`, `tasks.md`, `interfaces.md`, or any other file under any change directory. It SHALL NOT alter the already-emitted `Ready to Propose` block — neither its content nor its language.

#### Scenario: reviewed artifacts are never edited

- **WHEN** the user reviews any sai-1 or sai-2 artifact through the loop
- **THEN** no reviewed artifact file is created, modified, or deleted

#### Scenario: the emitted block is never altered

- **WHEN** the review loop runs after a `Ready to Propose` block was printed
- **THEN** the loop does not alter that block's content or language

### Requirement: Language gate reuse for reviews

Each review turn produced by the loop SHALL reuse the existing artifact-review language gate (`explore.md` item 3), including its Persistence rule, so the chosen review language persists across the loop as that rule defines. The `--fast-track` signal SHALL continue to skip only the language-gate question for review content; it SHALL NOT skip the section's global Yes/No question or the per-change picker.

#### Scenario: review turns use the existing language gate

- **WHEN** the user selects a review action and the language gate's conditions apply
- **THEN** the agent evaluates the existing artifact-review language gate before producing the review content

#### Scenario: switching artifact set re-asks per the Persistence rule

- **WHEN** the user reviews the sai-1 set of a change and then, on the re-shown picker, selects `Review sai-2's artifacts` for that same change (a different artifact set)
- **THEN** the language gate re-asks before the sai-2 review, because the tracked review target changed, per item 3's Persistence rule

#### Scenario: fast-track skips only the language question

- **WHEN** the `--fast-track` signal is active during the loop
- **THEN** the agent skips the language-gate question and produces reviews directly in English
- **AND** the agent still asks the global Yes/No question and the per-change picker

### Requirement: Explicit re-crystallization path

The loop SHALL NOT auto-emit a new `Ready to Propose` block. If the user wants the idea re-crystallized in light of the reviews, they SHALL explicitly request it; that request SHALL re-fire the crystallization language gate afresh, and a revised block MAY then be emitted.

#### Scenario: no automatic re-crystallization

- **WHEN** the user completes one or more reviews through the loop
- **THEN** the agent does not automatically emit a new `Ready to Propose` block

#### Scenario: explicit request re-fires the crystallization gate

- **WHEN** the user explicitly requests re-crystallization after reviewing
- **THEN** the crystallization language gate is evaluated afresh and a revised `Ready to Propose` block may be emitted
