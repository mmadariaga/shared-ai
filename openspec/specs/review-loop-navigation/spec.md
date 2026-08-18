# review-loop-navigation Specification

## Purpose

TBD - seeded from delta spec `review-loop-navigation` in change `extract-review-engine`.

## Requirements

### Requirement: manual-path-ownership-and-scope

The navigation shell of the post-crystallization review loop — the entry paths, the chat-scoped iteration, the five-option picker, `Skip`, `Exit review loop`, the picker re-entry invariant, and the print-for-paste handoff — SHALL stay outside the review engine and SHALL remain owned by the manual path. The shell SHALL apply only within `sai-explore`; no other `sai-*` command's behavior SHALL change. The shell's behavior SHALL be documented in `sai/commands/explore/instructions.md` only; no other instruction file, wrapper, or policy SHALL define or restate it.

The manual review-loop SHALL behave exactly as defined by this capability together with the review engine: the shell and the engine together fully determine the loop's behavior, and no other surface SHALL add to or alter it.

#### Scenario: other sai commands are unaffected

- **WHEN** any `sai-*` command other than `sai-explore` runs
- **THEN** its behavior is unchanged and no post-crystallization review section is offered

#### Scenario: the shell's behavior is confined to explore's instructions

- **WHEN** the navigation shell's behavior is located in the instruction surface
- **THEN** it is expressed entirely in `sai/commands/explore/instructions.md`
- **AND** no wrapper, `AGENTS.md`, or other instruction file defines or restates it

#### Scenario: the loop's behavior is fully defined by the shell and the engine

- **WHEN** the manual review loop's behavior is inspected
- **THEN** every observable behavior — entry paths, tracked-set iteration, picker labels and order, re-entry invariant, findings-block handoff, and close acknowledgment — is defined by this capability or the review engine
- **AND** no other surface defines or alters any of them

### Requirement: entry-paths

The review SHALL NOT be auto-offered as a harness option-picker immediately after a `Ready to Propose` block. Instead, `sai-explore` SHALL treat the review as a **user-triggered, plain-text standing invitation**: the crystallization block closes by recommending the user keep the explore window open, and the user triggers the review on return. The invitation carries **no precondition** — it is available whether or not any downstream artifact exists and whether or not this chat crystallized any change.

On the semantic path, `sai-explore` SHALL ask, in plain conversational text (never a harness option-picker), a single yes/no question rendered in the conversation's ambient language: whether the user wants to review the downstream artifacts of the changes crystallized in this chat. This plain-text question is a **deliberate exception** to the "Closed-choice prompts" native-picker rule in `sai/policies/remember.md`; it applies only to this global review invitation. Answering no SHALL be a hard stop on the entire review section. Answering yes SHALL enter the per-change loop over the chat-crystallized set. When the tracked crystallized set is empty, accepting the invitation SHALL be a no-op that ends the section immediately after the yes.

The token path SHALL be governed by the literal token `review-loop`: `sai-explore` SHALL recognize it as an explicit trigger that enters the per-change loop over the tracked crystallized set directly, without asking the plain-text global yes/no question first, because typing the token already expresses consent. The token SHALL fire only when the turn is a bare token (optionally with trivial punctuation or a greeting) or when entering the review loop is the turn's dominant intent; mere containment of the string SHALL NOT fire it, and a turn that negates, defers, quotes, or discusses the token SHALL NOT fire it. The token SHALL be live for the whole session, independently of when or whether a crystallization turn occurred. The token SHALL be a literal English string: it SHALL NOT be localized or translated, and a localized paraphrase SHALL NOT fire the token path (it may still fire the semantic path on its own merits, which still asks the global question). When the tracked crystallized set is empty, the token SHALL end the section immediately without entering any iteration and SHALL print a one-line acknowledgment in the conversation's ambient language stating that no change has been crystallized in this chat and there is nothing to review. When a single turn satisfies both the token path and the artifact-review path, the item-3 review SHALL be served first, then the loop SHALL be entered directly with the global question skipped.

#### Scenario: review is not auto-offered at crystallization

- **WHEN** `sai-explore` prints a `Ready to Propose` block (single-change or the final block of a sliced turn)
- **THEN** it does NOT auto-offer a harness Yes/No review picker below the block
- **AND** the review invitation is instead left as a standing invitation the user triggers on return

#### Scenario: triggered invitation is asked in plain text, not a picker

- **WHEN** the user triggers the review by accepting the standing invitation or asking to review the crystallized changes' downstream artifacts
- **THEN** `sai-explore` asks the yes/no review question as plain conversational text in the ambient language
- **AND** it does NOT present that global question through the harness option-picker

#### Scenario: no is a hard stop

- **WHEN** the user answers no to the plain-text review invitation
- **THEN** the entire post-crystallization review section ends immediately and no per-change loop is entered

#### Scenario: yes enters the per-change loop

- **WHEN** the user answers yes to the plain-text review invitation and the tracked crystallized set is non-empty
- **THEN** `sai-explore` enters the per-change review loop over the chat-crystallized set in its preserved first-emission order

#### Scenario: yes with an empty tracked set ends the section

- **WHEN** the user answers yes but the chat has crystallized no change names
- **THEN** the per-change loop performs no iterations and the section ends immediately after the yes

#### Scenario: the plain-text global invitation is a deliberate remember.md exception

- **WHEN** the global review invitation is presented on a harness that has a native option-picker (for example Claude Code)
- **THEN** it is still presented as plain conversational text, as a deliberate documented exception to the "Closed-choice prompts" rule, and is not "corrected" back into an option-picker

#### Scenario: token enters the loop directly without the global question

- **WHEN** the user fires the literal token `review-loop` as a bare token or with entering the review loop as the turn's dominant intent
- **THEN** the loop is entered directly over the tracked crystallized set
- **AND** the plain-text global yes/no question is not asked

#### Scenario: token containment does not fire the token path

- **WHEN** a turn merely contains the string `review-loop` without the token's firing condition — for example negating, deferring, quoting, or discussing it
- **THEN** the token path does not fire
- **AND** the turn is treated on its own merits (the semantic path may still fire, which still asks the global question)

#### Scenario: a dominant-intent turn fires the token path

- **WHEN** the user's turn embeds the literal token while entering the review loop is the turn's dominant intent (for example, "review-loop — let's go through the changes we crystallized")
- **THEN** the token path fires and the per-change loop is entered directly
- **AND** the plain-text global yes/no question is not asked

#### Scenario: token with an empty tracked set yields a one-line acknowledgment

- **WHEN** the user fires the token while the tracked crystallized set is empty
- **THEN** the section ends immediately without entering any iteration
- **AND** a one-line acknowledgment is printed in the ambient language stating that no change has been crystallized in this chat and there is nothing to review

#### Scenario: mixed trigger serves the requested review first

- **WHEN** a single turn both fires the token path and asks for an artifact review of a tracked crystallized change (item 3's path)
- **THEN** the item-3 review is produced first
- **AND** the loop is then entered directly, with the global question skipped

### Requirement: tracked-crystallized-set

The loop SHALL iterate only the set of change names that the current `sai-explore` chat has crystallized. This tracked set SHALL be in-conversation state only: it SHALL start empty at the beginning of the chat, SHALL be updated only when crystallization output emits a change name, SHALL preserve first-emission order, and SHALL ignore duplicate later emissions of the same change name. The loop SHALL iterate the tracked set in that preserved order, without re-sorting and without repository-wide change discovery — `openspec list --json` or any other enumeration of non-archived changes on disk SHALL NOT be run. The loop SHALL NOT include unrelated non-archived changes that were not crystallized in the current chat. When the tracked set is empty, the per-change loop SHALL be a no-op and terminate immediately after the global Yes (or, on the token path, the empty-set token acknowledgment).

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

#### Scenario: no repository-wide change discovery runs

- **WHEN** the per-change loop iterates the tracked set
- **THEN** it does not run `openspec list --json` and does not otherwise enumerate non-archived changes on disk

### Requirement: five-option-picker

For each change in the tracked set, the loop SHALL present a five-option picker parameterized by the current change, in this fixed order: `Review sai-1's artifacts`, `Review sai-2's artifacts`, `Review change-overview`, `Skip`, and `Exit review loop`. The option labels SHALL be fixed English literals and SHALL NOT be localized.

The picker SHALL be presented through the harness native option-picker per the "Closed-choice prompts" rule in `sai/policies/remember.md` when the harness's declared picker capacity can present all five options, and otherwise as plain text preserving the fixed labels and their fixed order. The per-harness picker capacity SHALL be declared in the Closed-choice prompts mapping of `sai/policies/remember.md` — per the established declared-not-runtime-detected pattern — and SHALL NOT be inferred at run time from tool behavior. The option semantics SHALL be identical either way: the fixed labels, their order, and every selection behavior of `Skip` and `Exit review loop` do not change with the presentation surface. This capacity fallback is distinct from the deliberate plain-text exception granted to the global review invitation: that exception applies ONLY to the global question and SHALL NOT be extended to this per-change picker's option semantics.

#### Scenario: per-change menu presents five options in fixed order

- **WHEN** the per-change loop iterates a change
- **THEN** the picker presents `Review sai-1's artifacts`, `Review sai-2's artifacts`, `Review change-overview`, `Skip`, and `Exit review loop` in that fixed order

#### Scenario: the five labels are fixed English literals

- **WHEN** the per-change picker is presented in any conversation language
- **THEN** the five option labels appear as the fixed English literals and are not localized

#### Scenario: per-change menu uses the native picker when capacity permits

- **WHEN** the harness's declared picker capacity can present all five options
- **THEN** the per-change picker is presented through the harness native option-picker

#### Scenario: capacity fallback preserves the labels and their order

- **WHEN** the harness's declared picker capacity is below five options (for example, four)
- **THEN** the per-change picker is presented as plain text preserving the five fixed labels in their fixed order
- **AND** every selection behavior of `Skip` and `Exit review loop` is unchanged

#### Scenario: capacity is declared, never runtime-detected

- **WHEN** the loop decides how to present the per-change picker
- **THEN** it reads the declared per-harness picker capacity from the Closed-choice prompts mapping in `sai/policies/remember.md`
- **AND** it does not infer capacity from runtime tool behavior

#### Scenario: the invitation's plain-text exception does not extend to the per-change picker

- **WHEN** the global review invitation is presented as plain text
- **THEN** the per-change picker is unaffected by that exception and continues to honor the native-picker-or-capacity-fallback rule

#### Scenario: fast-track never suppresses the controls

- **WHEN** the `--fast-track` signal is active during the loop
- **THEN** the global Yes/No question and the per-change picker are still presented every time in the ambient language

### Requirement: transaction-invocation

Every `Review sai-1's artifacts`, `Review sai-2's artifacts`, or `Review change-overview` selection SHALL be treated as a new review transaction, including a repeated selection for the same change and artifact set, and SHALL invoke the review engine (`review-engine-extraction`) for that transaction. The navigation SHALL perform no review work itself: it SHALL NOT resolve change directories, check artifact existence, reread artifacts from disk, or form findings on its own.

#### Scenario: repeated selection is a new transaction

- **WHEN** the user selects `Review sai-1's artifacts` for a change and later selects it again for the same change
- **THEN** the second selection is treated as a new review transaction invoking the engine afresh
- **AND** it does not reuse the first transaction's findings or reads

#### Scenario: every review selection invokes the engine

- **WHEN** the user selects `Review sai-1's artifacts`, `Review sai-2's artifacts`, or `Review change-overview` for a change
- **THEN** the selection invokes the engine with the current change name and the corresponding artifact-set designator
- **AND** the navigation performs no review work itself

#### Scenario: navigation performs no review work

- **WHEN** the navigation shell's definition in `sai/commands/explore/instructions.md` is audited
- **THEN** it does not restate directory resolution, existence checks, disk rereads, or finding formation
- **AND** those behaviors are owned by the review engine

### Requirement: picker-re-entry-invariant

Every loop turn over a change SHALL end by re-presenting that same change's five-option picker, except a turn closed by `Skip` or `Exit review loop`. This SHALL include every completed review and every non-completing transaction — a missing change directory, a missing artifact set, a review blocked by missing specs, or an availability/integrity report. For every non-closing turn, re-presenting the picker SHALL be the only closing action: the turn SHALL NOT end silently, SHALL NOT propose a new command prompt, and SHALL NOT advance to another change. `Skip` SHALL advance to the next tracked change. `Exit review loop` SHALL terminate the loop immediately, leaving remaining tracked changes unprocessed. The loop SHALL terminate when the tracked set is exhausted through `Skip` or when `Exit review loop` is selected.

Re-presenting the picker SHALL be loop navigation only: it SHALL NOT filter, pre-select, or confirm any finding, SHALL NOT be an additional encoding of the findings, and SHALL NOT be an acceptance step.

#### Scenario: review re-shows the picker for the same change

- **WHEN** the user selects `Review sai-1's artifacts` or `Review sai-2's artifacts` for a change
- **THEN** after the review the same change's five-option picker is re-presented

#### Scenario: non-completing transactions re-show the picker

- **WHEN** a transaction ends without a completed review — a missing change directory, a missing artifact set, a review blocked by missing specs, or an availability/integrity report
- **THEN** the same change's five-option picker is re-presented as the only closing action

#### Scenario: Skip advances to the next change

- **WHEN** the user selects `Skip` for the current change
- **THEN** the loop advances to the next tracked change (or terminates if none remain)

#### Scenario: Exit review loop terminates the loop

- **WHEN** the user selects `Exit review loop`
- **THEN** the loop terminates immediately
- **AND** remaining tracked changes are left unprocessed

#### Scenario: loop terminates when the tracked set is exhausted

- **WHEN** the user has processed every change in the tracked set (by `Skip`)
- **THEN** the loop terminates

#### Scenario: picker re-entry is excluded from the single-encoding prohibition and from acceptance semantics

- **WHEN** the picker is re-presented after a findings block
- **THEN** the re-presentation is loop navigation, not review output, not an additional encoding of the findings, and not an acceptance step
- **AND** it never filters, pre-selects, or confirms a finding

### Requirement: print-for-paste-handoff

When a review transaction surfaces findings, the loop SHALL print exactly one findings block — every finding from the transaction in the engine's deterministic order (by severity High → Medium → Low, then by ascending numeric identifier within each severity), each presented with the severity-prefixed identifier heading (the `Finding H1`-style label) that renders the contract's `Identifier` field, followed by the contract's remaining four fields in their contract order, closing with the contract's base-form summary tally — and SHALL print nothing else: no separate `## DesignCorrectionRequest` block, no `change:` header, and no acceptance step (no per-finding `Accept` / `Decline` picker, no accepted-set confirmation, and no in-loop filtering of the findings that enter the block). A completed review that surfaces no findings SHALL still close with the contract's base-form summary tally as the findings block's only content (the tally-only block); the picker is then re-presented per the re-entry invariant. The findings block IS the handoff payload: the user pastes it at the feedback gate of a re-invoked `/sai-2-design`, and the user MAY drop any line when pasting.

Handed-off corrections SHALL be applied by a worker that can consume the current change, with ownership following the source artifact's writer: findings on `design.md`, `tasks.md`, or `interfaces.md` are owned by the design worker and applied only through a writable design-worker transaction (a re-invoked `/sai-2-design` or the supervised design phase's feedback channel); findings on `proposal.md` or `specs/**` are owned by the design worker's consent-gated spec-amendment path, applied only with explicit user consent through the closed choice **apply in place** vs **do not apply / leave open** — routing to `/sai-1-spec` SHALL NOT be offered for review-loop findings, because `/sai-1-spec` creates a new change and cannot amend the current one.

Regeneration after handed-off corrections SHALL be conditioned on the change's persisted `overview.state` per the `change-overview-synchronization` capability: exactly one regeneration follows the design-worker edits only when the overview is already materialized (`overview.state` is `current` or `stale`); before first materialization — `unmaterialized` or `failed` — handed-off corrections update only their authoritative source artifacts and SHALL NOT regenerate or generate an overview. The loop SHALL NOT apply, forward, or regenerate on behalf of the user: it SHALL only print the findings block and hand the payload to the user for the owning-worker path.

#### Scenario: review output is a single findings block in deterministic order

- **WHEN** a review transaction closes with findings
- **THEN** the loop prints exactly one findings block listing every finding from the transaction in the shared finding shape, in severity order High → Medium → Low and ascending numeric identifier within each severity, closing with the contract's base-form summary tally
- **AND** it prints nothing else — no separate `## DesignCorrectionRequest` block and no `change:` header

#### Scenario: a no-findings review closes with the tally-only block

- **WHEN** a review transaction completes over available artifacts with no findings
- **THEN** the loop closes the review with the contract's base-form summary tally as the findings block's only content
- **AND** the same change's five-option picker is then re-presented per the re-entry invariant

#### Scenario: every finding is handed off without acceptance

- **WHEN** a review transaction closes with findings
- **THEN** the loop presents every finding from the transaction as the handoff payload
- **AND** no `Accept` / `Decline` picker and no accepted-set confirmation is presented, and no finding is filtered, pre-selected, or excluded by an in-loop decision

#### Scenario: design-artifact corrections route to the design worker

- **WHEN** the user pastes the findings block at the feedback gate of a re-invoked `/sai-2-design`, including findings on `design.md`, `tasks.md`, or `interfaces.md`
- **THEN** the design worker applies those corrections directly through the writable design-worker transaction, never by the loop
- **AND** exactly one regeneration follows after the design-worker edits complete, only if the overview is already materialized (`current` or `stale`)

#### Scenario: proposal or specs corrections route through the design worker's consent-gated amendment path

- **WHEN** the user pastes the findings block at the feedback gate of a re-invoked `/sai-2-design`, including findings on `proposal.md` or `specs/**`, and explicitly consents to the amendment
- **THEN** a design worker applies the amendment through the design phase's consent-gated spec-amendment path with the closed choice **apply in place** vs **do not apply / leave open**
- **AND** exactly one regeneration follows after the edits complete, only if the overview is already materialized
- **AND** no spec-worker continuation is used, because none is live at review time, and routing to `/sai-1-spec` is not offered

#### Scenario: handed-off corrections before first materialization update sources only

- **WHEN** handed-off corrections are applied to source artifacts of a change whose overview is not yet materialized (`overview.state` is `unmaterialized` or `failed`)
- **THEN** the corrections update only their authoritative source artifacts
- **AND** no overview is generated or regenerated by them — the overview is generated exactly once later at the successful sai-2 `Continue` processing

#### Scenario: proposal or specs corrections without consent are not applied

- **WHEN** a handed-off finding on `proposal.md` or `specs/**` reaches the design gate and the user does not consent to the amendment
- **THEN** no amendment is applied
- **AND** the finding remains open for a later consented request

### Requirement: language-gate-reuse

Before producing any review content for a `Review sai-1's artifacts` or `Review sai-2's artifacts` turn, the loop SHALL evaluate item 3's artifact-review language gate (including its Persistence rule), naming the exact artifact set of the current review turn as the tracked target so that re-asks fire automatically: a different artifact set or a different change triggers a re-ask; the same set on the same change reuses the previously chosen language. The control prompts (the global Yes/No question and the per-change picker) SHALL be asked in the conversation's ambient language every time and SHALL NOT be suppressed by `--fast-track`; the five per-change option labels remain the fixed English literals declared by the picker contract. The `--fast-track` signal SHALL skip only the language-gate question for review content.

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

### Requirement: review-in-progress-state-wiring

While the loop processes a change, the navigation SHALL set and resolve the slice's active review-item in-progress state exactly per the `explore-idea-list` capability's `idea-list-review-in-progress-state` requirement: the active review item renders `in_progress` from loop-processing start, persists across review transactions and per-change picker re-shows until it is marked completed, and is resolved to render `pending` by `Skip`, `Exit review loop`, or loop close. Setting, advancing, or resolving the state SHALL be render-only: it SHALL NOT mark or clear any item, and the evidence-based marking hooks of `explore-review-evidence-marking` SHALL apply unchanged.

#### Scenario: active review item renders in progress at loop start

- **WHEN** the loop begins processing a change
- **THEN** the slice's active review item renders `in_progress` per `idea-list-review-in-progress-state`
- **AND** it keeps rendering `in_progress` through every later picker re-show until it is marked completed

#### Scenario: Skip and Exit review loop resolve the state to pending

- **WHEN** the user selects `Skip` for the change or `Exit review loop`, or the loop closes
- **THEN** the change's in-progress item is resolved to render `pending`
- **AND** no item is marked or cleared by that resolution

### Requirement: loop-read-only

The navigation shell SHALL be strictly read-only: it SHALL NOT create, modify, or delete `proposal.md`, `specs/**/*.md`, `design.md`, `tasks.md`, `interfaces.md`, `change-overview.md`, or any other file under any change directory, and SHALL NOT write `overview.state` in any `.openspec.yaml`. The loop SHALL NOT alter the already-emitted `Ready to Propose` block — neither its content nor its language.

#### Scenario: the loop writes nothing

- **WHEN** the review loop runs any transaction
- **THEN** no file under any change directory is created, modified, or deleted by the loop

#### Scenario: the emitted block is never altered

- **WHEN** the review loop runs after a `Ready to Propose` block was printed
- **THEN** the loop does not alter that block's content or language

### Requirement: Separate review navigation

The manual review loop SHALL remain picker-free at crystallization. The `Auto`/`Manual` selector MUST govern delegated execution only and MUST NOT offer, start, or replace `review-loop`.

#### Scenario: selector follows crystallization

- **WHEN** crystallization closes and the selector is presented
- **THEN** the review invitation remains a standing user-triggered reminder separate from the execution choice

### Requirement: close-and-re-crystallization

When the loop terminates — the tracked set is exhausted through `Skip` or `Exit review loop` is selected — the loop SHALL print a minimal close acknowledgment (for example, `Loop closed`), unconditionally, whether or not any review happened during the loop; pure silence is NOT acceptable. The close SHALL NOT propose a new command prompt, including `/sai-1-spec`, `/sai-2-design`, `/sai-3-implement`, or any templated next-step prompt. This close rule applies only after the loop actually ran; the `review-loop` token fired against an empty tracked set keeps its distinct one-line acknowledgment.

The loop SHALL NOT auto-emit a new `Ready to Propose` block. If the user wants the idea re-crystallized in light of the reviews, they SHALL explicitly request it; that request SHALL re-fire item 8's crystallization language gate afresh, and a revised block MAY then be emitted.

#### Scenario: close prints a minimal acknowledgment unconditionally

- **WHEN** the loop terminates by tracked-set exhaustion through `Skip` or by selection of `Exit review loop`
- **THEN** a minimal close acknowledgment is printed, whether or not any review happened during the loop

#### Scenario: no command prompt is proposed at close

- **WHEN** the loop terminates after running
- **THEN** no new command prompt is proposed — not `/sai-1-spec`, `/sai-2-design`, `/sai-3-implement`, or any templated next-step prompt

#### Scenario: empty-set token keeps its distinct acknowledgment

- **WHEN** the `review-loop` token fires against an empty tracked set
- **THEN** the distinct one-line acknowledgment is printed
- **AND** the close rule for a loop that actually ran does not apply

#### Scenario: no automatic re-crystallization

- **WHEN** the user completes one or more reviews through the loop
- **THEN** the agent does not automatically emit a new `Ready to Propose` block

#### Scenario: explicit request re-fires the crystallization gate

- **WHEN** the user explicitly requests re-crystallization after reviewing
- **THEN** item 8's crystallization language gate is evaluated afresh and a revised block may be emitted
