# explore-post-crystallization-review-loop Specification

## Purpose

Define the user-triggered, read-only post-crystallization review loop in `sai-explore` over the changes crystallized in the current chat.

## Requirements

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

While the global review invitation remains plain text, the per-change navigation menu SHALL remain a harness native option-picker. For each change in the tracked crystallized set, `sai-explore` SHALL present the four options `Review sai-1's artifacts`, `Review sai-2's artifacts`, `Review change-overview`, and `Skip` through the harness option-picker per the "Closed-choice prompts" rule in `sai/instructions/remember.md`. The plain-text treatment applies ONLY to the global review invitation and SHALL NOT be extended to this per-change menu.

#### Scenario: per-change menu still uses the native picker

- **WHEN** the user answers yes to the global invitation and the per-change loop iterates a change
- **THEN** the four-option per-change menu (`Review sai-1's artifacts`, `Review sai-2's artifacts`, `Review change-overview`, `Skip`) is presented through the harness option-picker

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

For the change currently being iterated, selecting `Review sai-1's artifacts` SHALL produce a read-only review of that change's `proposal.md` and `specs/**`, selecting `Review sai-2's artifacts` SHALL produce a read-only review of that change's `design.md`, `tasks.md`, and `interfaces.md`, and selecting `Review change-overview` SHALL produce a read-only review of that change's `change-overview.md` for human presentation, reading the overview's source artifacts (`proposal.md`, `specs/**`, `design.md`, `tasks.md`, `interfaces.md`) to validate its completeness and consistency against them. When a requested artifact does not exist for the change, the agent SHALL report its absence without treating it as an error and without leaving the loop.

A `Review change-overview` transaction SHALL complete as a review only when the overview is the change's current review surface: `overview.state` reads `current` in `.openspec.yaml` AND the CLI reports `change-overview.md` present/done (`openspec status --change <name> --json`). When the state is non-`current` — `unmaterialized`, `materializing`, `failed`, or `stale` — or when current metadata is paired with a missing/not-`done` file, the transaction SHALL produce an availability/integrity report naming the state and the mismatch, SHALL NOT produce a findings tally, and SHALL leave the loop in place. Such an availability report is not a completed review: it SHALL NOT mark or clear any review-evidence item (per the `explore-review-evidence-marking` capability). The review loop SHALL NOT write `overview.state` or any artifact while performing this check.

#### Scenario: Review sai-1's artifacts reads proposal and specs

- **WHEN** the user selects `Review sai-1's artifacts` for the current change
- **THEN** the agent produces a read-only review of that change's `proposal.md` and `specs/**`

#### Scenario: Review sai-2's artifacts reads design, tasks, and interfaces

- **WHEN** the user selects `Review sai-2's artifacts` for the current change
- **THEN** the agent produces a read-only review of that change's `design.md`, `tasks.md`, and `interfaces.md`

#### Scenario: Review change-overview reads the overview and its sources

- **WHEN** the user selects `Review change-overview` for the current change and the overview is the current review surface (`overview.state: current` plus CLI-reported done)
- **THEN** the agent produces a read-only review of that change's `change-overview.md` for human presentation
- **AND** it reads the overview's source artifacts to validate completeness and consistency, reporting divergences between the overview and its sources as findings

#### Scenario: non-current overview produces an availability report, not a review

- **WHEN** the user selects `Review change-overview` for a change whose `overview.state` is `materializing`, `failed`, `stale`, or `unmaterialized`, or whose current metadata is paired with a missing/not-`done` file
- **THEN** the agent produces an availability/integrity report naming the state and the mismatch
- **AND** it produces no findings and no `Summary:` tally, and the transaction does not mark or clear any review-evidence item

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

The review loop SHALL be strictly read-only. It SHALL NOT create, modify, or delete `proposal.md`, `specs/**`, `design.md`, `tasks.md`, `interfaces.md`, `change-overview.md`, or any other file under any change directory. It SHALL NOT alter the already-emitted `Ready to Propose` block — neither its content nor its language. Review findings are advisory only: accepted corrections are applied by the owning worker through the writable handoff protocol defined below, never by the review loop itself, and exactly one overview regeneration follows those edits per the `change-overview-synchronization` capability.

#### Scenario: reviewed artifacts are never edited

- **WHEN** the user reviews any sai-1, sai-2, or change-overview artifact through the loop
- **THEN** no reviewed artifact file is created, modified, or deleted

#### Scenario: the emitted block is never altered

- **WHEN** the review loop runs after a `Ready to Propose` block was printed
- **THEN** the loop does not alter that block's content or language

### Requirement: Correction acceptance and handoff protocol

When a review transaction surfaces findings, the loop SHALL present them for acceptance as a distinct step, and no correction SHALL be applied without that explicit acceptance. Because the harness pickers are single-select (per `sai/policies/remember.md`), the loop SHALL NOT offer one multi-finding picker; it SHALL iterate the findings one at a time in deterministic order — by severity in the order High → Medium → Low, then by ascending numeric identifier within each severity (for example `H1`, `H2`, then `M1`, then `L1` per the shared finding contract) — and SHALL present one yes/no picker per finding through the native option-picker: `Accept` / `Decline`. Answering `Accept` marks that finding accepted; `Decline` marks it declined; the loop proceeds to the next finding, and after the last finding it SHALL present a single confirmation of the accepted set before any handoff. The loop SHALL NOT auto-accept findings.

Accepted corrections SHALL be handed off as feedback payloads in the shared review finding shape (`sai/policies/artifact-review-contract.md`): severity-prefixed identifier, severity, artifact location, issue statement, and recommended correction. Ownership SHALL follow the source artifact's writer, and every accepted correction SHALL be applied by a worker that can consume the current change:

- findings on `design.md`, `tasks.md`, or `interfaces.md` — owned by the **design worker**; they are applied only through a writable design-worker transaction (a re-invoked `/sai-2-design` or the supervised design phase's feedback channel);
- findings on `proposal.md` or `specs/**` — owned by the **design worker's consent-gated spec-amendment path**: the design phase already holds consent-gated authority to amend `proposal.md` and `specs/**` in place (per `sai/instructions/design.md`), so applying such findings requires explicit user consent and SHALL be executed by a design worker through that path. There is no live spec-proposal worker at review time and `/sai-1-spec` cannot consume an existing change, so the spec-worker continuation is not a supported path.

Regeneration after accepted corrections SHALL be conditioned on the change's persisted `overview.state` (per the `change-overview-synchronization` capability): exactly one regeneration follows the design-worker edits **only when the overview is already materialized** (`overview.state` is `current` or `stale`). Before first materialization — `unmaterialized` or `failed` — accepted corrections update only their authoritative source artifacts and SHALL NOT regenerate or generate an overview; the overview is generated exactly once later, at the successful sai-2 `Continue` processing. The review loop itself SHALL NOT apply, forward, or regenerate on behalf of the user: it SHALL only report which findings were accepted and hand the payload to the user for the owning-worker path.

#### Scenario: findings are accepted one at a time in deterministic order

- **WHEN** a review transaction closes with findings and the user proceeds to acceptance
- **THEN** the loop presents one `Accept` / `Decline` picker per finding, iterating by severity order High → Medium → Low and ascending numeric identifier within each severity
- **AND** the loop presents a single confirmation of the accepted set before any handoff

#### Scenario: user accepts findings explicitly

- **WHEN** the user answers `Accept` for one or more findings and confirms the accepted set
- **THEN** the loop presents the accepted findings as handoff payloads in the shared finding shape
- **AND** no declined or unconfirmed finding is handed off

#### Scenario: design-artifact corrections route to the design worker

- **WHEN** the user accepts a finding on `design.md`, `tasks.md`, or `interfaces.md`
- **THEN** the correction is applied by a design worker through a writable design-worker transaction, never by the loop
- **AND** exactly one regeneration follows after the design-worker edits complete, only if the overview is already materialized (`current` or `stale`)

#### Scenario: proposal or specs corrections route through the design worker's consent-gated amendment path

- **WHEN** the user accepts a finding on `proposal.md` or `specs/**` and explicitly consents to the amendment
- **THEN** a design worker applies the amendment through the design phase's consent-gated spec-amendment path
- **AND** exactly one regeneration follows after the edits complete, only if the overview is already materialized
- **AND** no spec-worker continuation is used, because none is live at review time

#### Scenario: accepted corrections before first materialization update sources only

- **WHEN** accepted corrections are applied to source artifacts of a change whose overview is not yet materialized (`overview.state` is `unmaterialized` or `failed`)
- **THEN** the corrections update only their authoritative source artifacts
- **AND** no overview is generated or regenerated by them — the overview is generated exactly once later at the successful sai-2 `Continue` processing

#### Scenario: proposal or specs corrections without consent are not applied

- **WHEN** the user accepts a finding on `proposal.md` or `specs/**` but does not consent to the amendment
- **THEN** no amendment is applied
- **AND** the finding remains open for a later consented request

#### Scenario: no acceptance, no handoff

- **WHEN** the user declines all findings or accepts none
- **THEN** the loop hands off no correction payload
- **AND** no source artifact is modified and no regeneration occurs

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

When the post-crystallization review loop terminates and at least one review (`Review sai-1's artifacts`, `Review sai-2's artifacts`, or `Review change-overview`) has happened during the loop, `sai-explore` SHALL close the loop without proposing any new command prompt. Any next-step command prompt SHALL be suppressed at loop close, including but not limited to `/sai-1-spec`, `/sai-2-design`, and `/sai-3-implement`; a templated next-step prompt is still a prompt and is therefore prohibited. `sai-explore` SHALL NOT propose `/sai-1-spec` for any change in the tracked crystallized set at loop close, because sai-1's artifacts are exactly what the loop reviews. A minimal status indicator that the loop has closed (for example, a short "Loop closed" line) MAY be printed, and pure silence is also acceptable; the prohibition is on proposing a new command prompt, not on printing a status indicator. This requirement fires on whether any review happened during the loop, not on which artifact sets were reviewed. The existing **Explicit re-crystallization path** behavior is unchanged: a user-initiated re-crystallization request is not an auto-emitted prompt and does not violate this rule.

#### Scenario: loop closes silently after at least one review

- **WHEN** the review loop terminates and at least one `Review sai-1's artifacts`, `Review sai-2's artifacts`, or `Review change-overview` review happened during the loop
- **THEN** the loop closes without proposing any new command prompt
- **AND** at most a minimal status indicator (or nothing) is printed

#### Scenario: no sai-1-spec proposal for a tracked change at close

- **WHEN** the review loop closes after reviewing a change in the tracked crystallized set
- **THEN** `sai-explore` does not propose `/sai-1-spec` for that change or any other change in the tracked set

#### Scenario: templated next-step prompt is also suppressed

- **WHEN** the review loop closes after at least one review
- **THEN** no templated next-step command prompt (such as `/sai-2-design` or `/sai-3-implement`) is proposed either

#### Scenario: rule fires regardless of which artifact set was reviewed

- **WHEN** the loop closes after the user reviewed only sai-1 artifacts, or only sai-2 artifacts, or only the change-overview, or any combination, for any tracked change
- **THEN** the silent-close rule applies identically in every case, because it fires on whether any review happened, not on which set

#### Scenario: explicit re-crystallization remains available

- **WHEN** the user explicitly requests re-crystallization after the reviews
- **THEN** that user-initiated request routes through the crystallization language gate and a revised `Ready to Propose` block may be emitted
- **AND** this does not count as the loop proposing a new command prompt

### Requirement: Manual review output follows the shared finding contract

Each review transaction produced by the loop (`Review sai-1's artifacts`, `Review sai-2's artifacts`, or `Review change-overview`) SHALL structure its output per the shared review finding contract of the `review-finding-format` capability: findings carry severity-prefixed identifiers and severities from the shared vocabulary, and the review SHALL close with the contract's `Summary:` tally line. The output format SHALL NOT alter the loop's read-only constraint, its navigation, its language-gate reuse, or its silent-close behavior, all of which remain as defined in this capability.

#### Scenario: findings follow the shared contract

- **WHEN** the loop reviews a change's `proposal.md` and `specs/**`, its `design.md`, `tasks.md`, and `interfaces.md`, or its `change-overview.md`
- **THEN** every finding carries a severity-prefixed identifier and a severity per the shared contract

#### Scenario: review closes with a summary tally

- **WHEN** the loop completes a review transaction over available artifacts
- **THEN** the review closes with the contract's `Summary:` tally line
- **AND** the counts match the review's findings

#### Scenario: absent artifacts produce no review content

- **WHEN** a requested artifact does not exist for the change
- **THEN** the agent reports the absence per the existing rule
- **AND** it produces no findings and no `Summary:` line

#### Scenario: read-only and silent-close are unchanged

- **WHEN** the loop produces review output per the shared contract
- **THEN** no artifact is created, modified, or deleted
- **AND** the loop still closes silently after at least one review without proposing a new command prompt
