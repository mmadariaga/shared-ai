# explore-pre-crystallization-stages Specification

## Purpose

TBD

## Requirements

### Requirement: Pre-crystallization lifecycle renders as a four-stage TODO

While a candidate idea is under active exploration (Closure State `active-uncrystallized`), `sai-explore` SHALL render a four-item stage TODO with the labels `Explore change`, `Review edge cases`, `Implementation details`, and `Crystallize`, in that order. The current stage SHALL render `in_progress`, completed stages SHALL render `completed`, and remaining stages SHALL render `pending`. The TODO SHALL render on the native task panel through the per-harness idea-list render binding's phase-A machinery, SHALL render from the first turn in which a candidate idea exists, and SHALL re-render exactly once per turn that changes stage state. The TODO SHALL NOT render while no candidate idea exists.

#### Scenario: A fresh idea renders the four stages

- **WHEN** a candidate idea first exists under active exploration
- **THEN** the four stage labels render in order with `Explore change` as the `in_progress` stage and the other three `pending`

#### Scenario: Advancement re-renders the panel once

- **WHEN** a turn advances the stage progression
- **THEN** the TODO re-renders exactly once after that turn's stage-state changes, with the new current stage `in_progress`, completed stages `completed`, and remaining stages `pending`

### Requirement: Stages advance only on explicit user intent

The stage progression SHALL advance only when the user explicitly requests it: the literal token `next-step` (bare, optionally with trivial punctuation or a greeting, or as the turn's dominant intent — the same recognition machinery as the `review-loop` token), clear natural-language intent naming the next stage or requesting crystallization, or a semantic confirmation of the proposed list at the `Review edge cases` or `Implementation details` stages (`explore-edge-case-review`, `explore-implementation-details`), which records the agreed list and advances the stage within the same turn. Mere containment of the string `next-step` SHALL NOT fire the token: it fires only when the turn is a bare token or when advancing the progression is the turn's dominant intent, and a turn that negates, defers, quotes, or discusses the token SHALL NOT advance the progression. `sai-explore` SHALL NOT advance a stage on its own judgment that the idea is solid or ready. The sole exceptions are the deterministic empty-set rules of the implementation-details stage (`explore-implementation-details`) and the edge-case review stage (`explore-edge-case-review`), which are content-based rules, not readiness judgments. The one-line readiness signal (`explore-crystallization-on-demand`) does not advance the stages.

#### Scenario: The next token advances the progression

- **WHEN** the user sends the bare token `next-step` or expresses advancement as the turn's dominant intent
- **THEN** the progression advances to the following stage and the TODO re-renders with it `in_progress`

#### Scenario: Natural language names a stage

- **WHEN** the user requests a stage in natural language, such as asking to review edge cases or move on to implementation details
- **THEN** the progression advances to that stage on that explicit intent

#### Scenario: Semantic confirmation advances the stage in the same turn

- **WHEN** the user semantically confirms the proposed list at the `Review edge cases` or `Implementation details` stage
- **THEN** the list is recorded as agreed and the progression advances to the next stage within the same turn

#### Scenario: The agent's solidity judgment never advances a stage

- **WHEN** the idea becomes solid at the qualitative readiness threshold and the readiness signal fires
- **THEN** no stage advances without user intent and no stage's work (edge-case review, implementation-details surfacing, or crystallization) auto-fires

#### Scenario: Conversational uses do not fire the token

- **WHEN** the user's turn merely contains the string `next-step` in ordinary conversation — such as "what's the next step?" or a turn quoting the token while discussing it — or negates, defers, quotes, or discusses the token
- **THEN** the progression does not advance and the stage TODO stays unchanged

### Requirement: The edge-case review is the second stage and keeps its mandatory gate

The `Review edge cases` stage SHALL run the existing edge-case review when the user advances into it (`explore-edge-case-review`): numbered `E1`…`En` scope-boundary proposals, one plain conversational semantic agreement question, at most once per substantially unchanged idea. When no in-scope edge case bounds the proposed change, the deterministic empty-set rule of `explore-edge-case-review` SHALL apply instead: the agreed empty list is recorded and the progression advances without the agreement question. The mandatory gate SHALL be preserved (`explore-edge-case-gate`): `sai-explore` SHALL NOT emit a `Ready to Propose` block before semantic agreement, an explicit premature crystallize request SHALL enter the review with no skip path, and `--fast-track` SHALL NOT auto-approve, skip, or weaken this gate.

#### Scenario: Advancing to the stage runs the review

- **WHEN** the user advances into `Review edge cases`
- **THEN** the edge-case review presents its proposals and agreement question before any later stage runs

#### Scenario: Fast-track never bypasses the stage

- **WHEN** `--fast-track` is active and the user advances into `Review edge cases`
- **THEN** the mandatory review still runs and blocks crystallization until agreement

### Requirement: The Crystallize stage contains slicing and both language gates

The `Crystallize` stage SHALL contain the slicing assessment (single-vs-sliced routing and integration-point friction, item 4) and both language gates — the crystallization language gate (item 8) and the overview-language gate (`explore-overview-language-gate`) — which run when the user explicitly requests crystallization, before any `Ready to Propose` block prints. Advancing into the `Crystallize` stage SHALL itself count as an explicit crystallization request: the slicing assessment and both language gates run on stage entry, making `next-step` and `crystallize` equivalent requests from the `Implementation details` stage. A deterministic empty-set advance that completes the `Review edge cases` or `Implementation details` stage SHALL advance into the following stage within the same turn, and SHALL therefore count as the explicit crystallization request when it advances into the `Crystallize` stage. `--fast-track` SHALL bypass only the two language gates and SHALL NOT skip, weaken, or auto-complete any stage. An explicit crystallize request made from an earlier stage SHALL first run the mandatory edge-case review when the review has not reached agreement (no skip path), then proceed through the slicing assessment and both language gates.

#### Scenario: Crystallization runs slicing then both gates

- **WHEN** the user explicitly requests crystallization, including by advancing into the `Crystallize` stage
- **THEN** the slicing assessment runs first, then gate 8 and gate 9 fire in order, and only then does the `Ready to Propose` block print

#### Scenario: Natural-language entry into the stage crystallizes

- **WHEN** the user names the `Crystallize` stage in natural language from the `Implementation details` stage, such as asking to move on to the Crystallize stage
- **THEN** the advance counts as the explicit crystallization request
- **AND** the slicing assessment and both language gates run before any `Ready to Propose` block prints

#### Scenario: An empty-list chain reaches crystallization in the same turn

- **WHEN** the in-scope edge-case list and the implementation-details list are both empty and the user advances the progression by token, natural language, or confirmation
- **THEN** the deterministic empty-set rules advance the progression through the `Review edge cases` and `Implementation details` stages within the same turn
- **AND** the `Crystallize` stage entry counts as the explicit crystallization request, running the slicing assessment and both language gates before any `Ready to Propose` block prints

#### Scenario: Premature crystallize enters the review before slicing

- **WHEN** the user explicitly requests crystallization before the edge-case review has reached agreement
- **THEN** the review runs with no skip path and the slicing assessment and language gates run only after agreement

#### Scenario: Fast-track skips the language gates but never the stages

- **WHEN** `--fast-track` is active
- **THEN** both language gates select their defaults without questions
- **AND** the stages themselves — including the mandatory edge-case review — are neither skipped nor weakened

### Requirement: A materially changed idea resets the stage progression

When the idea under exploration materially changes into a new stable idea, `sai-explore` SHALL reset the stage progression to the `Explore change` stage: the stage TODO re-renders with `Explore change` as the `in_progress` stage and the remaining stages `pending`, completed stages are no longer rendered as completed, and previously agreed lists are discarded for the new idea's progression. The reset SHALL NOT re-run the edge-case review by itself: a fresh review is entered only when the new idea advances into the `Review edge cases` stage or requests crystallization prematurely (`explore-edge-case-review`). The reset SHALL NOT change the Closure State handling of the new idea (a new `active-uncrystallized` lifecycle, `explore-closure-state`).

#### Scenario: A materially changed idea re-renders the TODO from stage 1

- **WHEN** exploration materially changes the current idea into a new stable idea
- **THEN** the stage progression resets to `Explore change`
- **AND** the TODO re-renders once with `Explore change` `in_progress` and the other three stages `pending`

#### Scenario: Agreed lists do not carry over the reset

- **WHEN** the progression resets for a materially changed idea
- **THEN** the previously agreed edge-case list and implementation-details list are discarded and are re-surfaced only when the new idea reaches those stages again

#### Scenario: The reset alone does not start a fresh review

- **WHEN** a materially changed idea resets the progression but the user has not advanced into `Review edge cases` or requested crystallization
- **THEN** no edge-case review runs for the new idea yet

### Requirement: The stage TODO clears at crystallization

The stage TODO SHALL be cleared when crystallization begins to emit its output: at the first slice identification, when the idea progress list first renders and takes the panel (item 11, `explore-idea-list`). The TODO SHALL NOT re-render after crystallization. The idea progress list's catalog, rendering, marking, and lifecycle behavior SHALL remain unchanged except for the renegotiated panel ownership in `explore-idea-list`.

#### Scenario: Crystallization clears the TODO

- **WHEN** the slicing assessment identifies the first slice of a crystallizing idea
- **THEN** the stage TODO is cleared and the idea progress list takes the panel, with no stage-TODO entry re-rendered afterwards

### Requirement: Panel phase-A/phase-B lifecycle

The per-harness idea-list render bindings SHALL implement a phase-A/phase-B panel lifecycle: phase A renders the stage TODO during exploration, phase B renders the idea progress list from its first render. Each stage-TODO entry SHALL carry a stage-ownership marker distinct from the idea-list marker (`sai-idea-list:`) in the machine-readable panel entry field pinned by the binding (opencode `priority`, Claude Code `description`), with the marker value `sai-explore-stage:<stage-id>`. The binding's chat-start clear SHALL remove entries bearing either the stage-TODO marker or the idea-list marker. The Claude Code and opencode bindings SHALL mirror each other.

#### Scenario: Stage entries carry the stage marker

- **WHEN** phase A renders the stage TODO
- **THEN** every stage entry carries the `sai-explore-stage:` marker in the machine-readable panel field and the phase-A entries never coexist with idea-list entries

#### Scenario: A new chat clears both surfaces

- **WHEN** a new `sai-explore` chat starts
- **THEN** the binding removes exactly the entries bearing the `sai-explore-stage:` marker or the `sai-idea-list:` marker, leaving other surfaces' entries in place

#### Scenario: Both harness bindings mirror the phases

- **WHEN** the opencode and Claude Code idea-list render bindings are inspected
- **THEN** both declare the same phase-A/phase-B lifecycle with the same marker prefixes and the same displacement at the phase transition

### Requirement: Stage state is conversation-only

The stage progression state — the current stage, completed stages, and any agreed lists — SHALL be held in conversation only. The session SHALL NOT write the stage state to any file, artifact, change directory, configuration, or `.openspec.yaml`; `sai-explore` remains read-only.

#### Scenario: Stage state never persists

- **WHEN** the stage progression advances
- **THEN** the updated state exists only in conversation and is not written to any file, artifact, or configuration
