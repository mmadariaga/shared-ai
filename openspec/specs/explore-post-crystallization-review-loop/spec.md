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

### Requirement: Review invitation is a user-triggered plain-text standing invitation

The global review invitation SHALL NOT be auto-offered as a harness option-picker immediately after a `Ready to Propose` block. Instead, `sai-explore` SHALL treat the review as a **user-triggered, plain-text sí/no standing invitation**: the crystallization block closes by recommending the user keep the explore window open (per the `explore-crystallization-block` capability), and the user triggers the review on return — by accepting the standing invitation or by asking to review the downstream artifacts.

When the user triggers the review, `sai-explore` SHALL ask, in **plain conversational text** (never a harness option-picker), a single sí/no question rendered in the conversation's ambient language: whether the user wants to review the downstream artifacts of the changes crystallized in this chat. This plain-text question is a **deliberate exception** to the "Closed-choice prompts" native-picker rule in `sai/instructions/remember.md`; it applies only to this global review invitation. Answering no SHALL be a hard stop on the entire review section. Answering yes SHALL enter the per-change review loop over the chat-crystallized set, unchanged from its existing behavior.

The invitation carries **no precondition** — it remains available whether or not any downstream artifact exists and whether or not this chat crystallized any change — so the section behaves identically across sessions. When the tracked crystallized set is empty, accepting the invitation SHALL be a no-op that ends the section immediately after the yes.

#### Scenario: review is not auto-offered at crystallization

- **WHEN** `sai-explore` prints a `Ready to Propose` block (single-change or the final block of a sliced turn)
- **THEN** it does NOT auto-offer a harness Yes/No review picker below the block
- **AND** the review invitation is instead left as a standing invitation the user triggers on return

#### Scenario: triggered invitation is asked in plain text, not a picker

- **WHEN** the user triggers the review by accepting the standing invitation or asking to review the crystallized changes' downstream artifacts
- **THEN** `sai-explore` asks the sí/no review question as plain conversational text in the ambient language
- **AND** it does NOT present that global question through the harness option-picker

#### Scenario: no is a hard stop

- **WHEN** the user answers no to the plain-text review invitation
- **THEN** the entire post-crystallization review section ends immediately and no per-change loop is entered

#### Scenario: yes enters the existing per-change loop

- **WHEN** the user answers yes to the plain-text review invitation and the tracked crystallized set is non-empty
- **THEN** `sai-explore` enters the per-change review loop over the chat-crystallized set in its preserved first-emission order, unchanged

#### Scenario: yes with an empty tracked set ends the section

- **WHEN** the user answers yes but the chat has crystallized no change names
- **THEN** the per-change loop performs no iterations and the section ends immediately after the yes

#### Scenario: plain-text global invitation is a deliberate remember.md exception

- **WHEN** the global review invitation is presented on a harness that has a native option-picker (for example Claude Code)
- **THEN** it is still presented as plain conversational text, as a deliberate documented exception to the "Closed-choice prompts" rule, and is not "corrected" back into an option-picker

### Requirement: Per-change review picker remains a harness option-picker

While the global review invitation becomes plain text, the per-change navigation menu SHALL remain a harness native option-picker. For each change in the tracked crystallized set, `sai-explore` SHALL present the three options `Review sai-1's artifacts`, `Review sai-2's artifacts`, and `Skip` through the harness option-picker per the "Closed-choice prompts" rule in `sai/instructions/remember.md`. The plain-text treatment applies ONLY to the global review invitation and SHALL NOT be extended to this per-change menu.

#### Scenario: per-change menu still uses the native picker

- **WHEN** the user answers yes to the global invitation and the per-change loop iterates a change
- **THEN** the three-option per-change menu (`Review sai-1's artifacts`, `Review sai-2's artifacts`, `Skip`) is presented through the harness option-picker

#### Scenario: plain-text exception does not extend to the per-change menu

- **WHEN** the global review invitation is presented as plain text
- **THEN** the per-change picker is unaffected and continues to honor the native-picker rule

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

### Requirement: Silent loop close after any review

When the post-crystallization review loop terminates and at least one review (`Review sai-1's artifacts` or `Review sai-2's artifacts`) has happened during the loop, `sai-explore` SHALL close the loop without proposing any new command prompt. Any next-step command prompt SHALL be suppressed at loop close, including but not limited to `/sai-1-spec`, `/sai-2-design`, and `/sai-3-implement`; a templated next-step prompt is still a prompt and is therefore prohibited. `sai-explore` SHALL NOT propose `/sai-1-spec` for any change in the tracked crystallized set at loop close, because sai-1's artifacts are exactly what the loop reviews. A minimal status indicator that the loop has closed (for example, a short "Loop closed" line) MAY be printed, and pure silence is also acceptable; the prohibition is on proposing a new command prompt, not on printing a status indicator. This requirement fires on whether any review happened during the loop, not on which artifact sets were reviewed. The existing **Explicit re-crystallization path** behavior is unchanged: a user-initiated re-crystallization request is not an auto-emitted prompt and does not violate this rule.

#### Scenario: loop closes silently after at least one review

- **WHEN** the review loop terminates and at least one `Review sai-1's artifacts` or `Review sai-2's artifacts` review happened during the loop
- **THEN** the loop closes without proposing any new command prompt
- **AND** at most a minimal status indicator (or nothing) is printed

#### Scenario: no sai-1-spec proposal for a tracked change at close

- **WHEN** the review loop closes after reviewing a change in the tracked crystallized set
- **THEN** `sai-explore` does not propose `/sai-1-spec` for that change or any other change in the tracked set

#### Scenario: templated next-step prompt is also suppressed

- **WHEN** the review loop closes after at least one review
- **THEN** no templated next-step command prompt (such as `/sai-2-design` or `/sai-3-implement`) is proposed either

#### Scenario: rule fires regardless of which artifact set was reviewed

- **WHEN** the loop closes after the user reviewed only sai-1 artifacts, or only sai-2 artifacts, or both, for any tracked change
- **THEN** the silent-close rule applies identically in every case, because it fires on whether any review happened, not on which set

#### Scenario: explicit re-crystallization remains available

- **WHEN** the user explicitly requests re-crystallization after the reviews
- **THEN** that user-initiated request routes through the crystallization language gate and a revised `Ready to Propose` block may be emitted
- **AND** this does not count as the loop proposing a new command prompt
