# explore-crystallization-on-demand Specification

## Purpose

Define the on-demand emission mechanism for `sai-explore`'s `Ready to Propose` block: a one-line readiness signal replaces state-triggered auto-emission, the full block is printed only on explicit user request, the signal fires at most once per stable idea, and the `§7` inline-proposal path is fixed for coherence under on-demand emission.

## Requirements

### Requirement: Pre-crystallization closure is distinct from readiness signaling

The readiness statement SHALL remain a once-per-stable-idea emission carried inside the closure reminder line, while the actionable closure for an `active-uncrystallized` idea SHALL be evaluated on every successful qualifying turn. When no genuine unresolved question remains, the stage-aware closure reminder SHALL be emitted and SHALL repeat on each later qualifying turn; when a genuine unresolved question remains, that question takes precedence. The closure reminder SHALL NOT emit the `Ready to Propose` block or weaken the existing explicit-request gate for that block.

#### Scenario: Repeated closure does not repeat readiness

- **WHEN** a stable idea has already emitted its once-per-stable-idea readiness statement and a later successful turn has no genuine unresolved question
- **THEN** `sai-explore` SHALL repeat the actionable closure reminder for the current stage
- **AND** it does not re-emit the readiness statement
- **AND** it does not emit a `Ready to Propose` block without an explicit request

#### Scenario: A question takes precedence over the reminder

- **WHEN** a later successful active-uncrystallized turn has a genuine unresolved question
- **THEN** the response ends with that question
- **AND** it does not manufacture or append a fallback reminder solely because readiness tracking suppresses the readiness statement

### Requirement: Readiness signal replaces state-triggered auto-emission

When the explored idea becomes solid, `sai-explore` (`sai/commands/explore/instructions.md`) SHALL NOT auto-print the `Ready to Propose` block. Instead, the first closure reminder emitted after solidification SHALL carry the readiness statement — the one-line maturity judgment that the idea is solid enough to crystallize on request — inside the reminder line, never as a separate closing line and never by itself ending a turn. When the idea crystallizes before any closure reminder has fired (for example, a solidification turn that ended with a genuine question followed by a direct crystallize request), the readiness statement SHALL NOT be emitted: the explicit crystallization request itself conveys the trigger action. "Solid" is judged at the same qualitative threshold as today's "idea is clear" wording in §5/§6; only the reaction changes (a statement inside the reminder instead of the block). This gate applies to both the single-change protocol (§5) and the sliced protocol (§6).

#### Scenario: solid idea produces the reminder with the statement, not the block

- **WHEN** the idea under discussion becomes solid enough that today's `sai-explore` would have printed the `Ready to Propose` block
- **THEN** `sai-explore` emits the closure reminder carrying the readiness statement and does NOT print the `Ready to Propose` block

#### Scenario: crystallization before any reminder drops the statement

- **WHEN** the idea solidifies on a turn that ends with a genuine question and the user then explicitly requests crystallization before any closure reminder fires
- **THEN** the readiness statement is not emitted and the explicit request itself is the trigger action

#### Scenario: continued refinement does not re-print the block

- **WHEN** the user keeps refining the idea across subsequent turns after it was judged solid
- **THEN** `sai-explore` does not print or re-print the `Ready to Propose` block on any of those turns

### Requirement: Readiness signal is actionable

The closure reminder carrying the readiness statement SHALL communicate how the user can advance toward the block: it names the token that advances from the user's current stage of the pre-crystallization progression, so that under full on-demand emission the mechanism is discoverable and the user does not wait for a block that will never auto-appear. The verbatim reminder wording remains unpinned by this change; only the requirement that the reminder convey the advancement action is normative.

#### Scenario: the reminder names how to advance

- **WHEN** `sai-explore` emits the closure reminder carrying the readiness statement
- **THEN** the reminder communicates how the user can advance toward the `Ready to Propose` block, without pinning a specific verbatim wording

### Requirement: Readiness signal fires once per stable idea

The readiness statement SHALL be carried by the closure reminder at most once per stable idea, reusing the in-conversation Persistence pattern of the §3 language gate: the agent tracks the current idea in-conversation, does NOT re-emit the statement on later reminder repetitions while the idea remains substantially the same, and re-fires the statement only when the idea materially changes into a new stable idea. This tracking state is held in-conversation only and SHALL NOT be written to any file or configuration.

#### Scenario: the statement does not repeat while the idea is stable

- **WHEN** the idea was already judged solid and the readiness statement already fired inside a closure reminder, and the user continues discussing the same idea
- **THEN** later closure reminders repeat the stage's token guidance without re-emitting the readiness statement

#### Scenario: the statement re-fires for a materially different idea

- **WHEN** the discussion shifts to a materially different idea that then becomes solid
- **THEN** `sai-explore` may emit the readiness statement once for the new stable idea, inside its first closure reminder

#### Scenario: tracking state is never persisted

- **WHEN** the readiness statement fires and its per-idea tracking is recorded
- **THEN** that tracking is held in-conversation only and is not written to any artifact, configuration file, or other on-disk state

### Requirement: Full block is emitted only on explicit user request

`sai-explore` SHALL print or re-print the full `Ready to Propose` block or blocks only when the user explicitly asks to crystallize — for example, by asking for the paste-ready block, asking to crystallize, or asking to create a proposal or run `/sai-1-spec`. Absent such an explicit request, no block is printed even when the idea is solid.

This user-triggered gate applies to both the single-change and sliced protocols. When the technical-uncertainty assessment fires, an explicit request SHALL first enter the uncertainty pause. Feature blocks remain withheld until Ask 1 is resolved: an explicit POC decline permits full crystallization with the accepted risk, while a viable POC permits feature crystallization only after the user selects `Crystallize full` and size and friction are re-evaluated. A viable `Exit` emits no block, and a not-viable POC emits no block until the user chooses re-exploration or the idea-dead exit path.

When the user explicitly asks to crystallize before the idea is judged solid, `sai-explore` SHALL honor the request after running the slicing assessment and any required uncertainty pause. The existing inline-proposal path remains an explicit-request path and SHALL follow the same pause before feature emission.

#### Scenario: explicit request prints the single-change block

- **WHEN** the idea fits one change, is solid, and the user explicitly asks for the paste-ready block or to crystallize, with no uncertainty pause pending
- **THEN** `sai-explore` prints the single-change `Ready to Propose` block

#### Scenario: explicit request prints the full sliced set

- **WHEN** the idea was sliced, is solid, and the user explicitly asks to crystallize after any required uncertainty pause has completed
- **THEN** `sai-explore` prints the full ordered set of per-slice `Ready to Propose` blocks

#### Scenario: no block without an explicit request

- **WHEN** the idea is solid but the user has not explicitly asked to crystallize or for the block
- **THEN** `sai-explore` prints no `Ready to Propose` block
- **AND** an active-uncrystallized idea receives the separate actionable closure required by this change

#### Scenario: explicit request before the idea is solid

- **WHEN** the user explicitly asks to crystallize while the idea has not yet been judged solid
- **THEN** `sai-explore` honors the request and emits the block or blocks after first running the size, friction, and uncertainty assessments and resolving any required uncertainty pause

### Requirement: Readiness judgment stays qualitative

The judgment of whether the idea is "solid" SHALL remain a qualitative judgment at the same threshold as today's "idea is clear" language. This change SHALL NOT introduce a numeric threshold, score, or count-based metric for readiness.

#### Scenario: no numeric threshold is introduced

- **WHEN** `sai-explore` decides whether the idea is solid enough to emit the readiness signal
- **THEN** the decision is a qualitative judgment and is not gated on any numeric threshold, score, or count

### Requirement: Block content and slicing routing are unchanged

This change SHALL alter only *when* the `Ready to Propose` block is emitted, not its content or the slicing routing that decides how many blocks exist. When a block is printed on request, its sections continue to follow the existing format (the `explore-crystallization-block` capability), and the single-vs-sliced routing and per-slice composition of §4/§6 (`explore-vertical-slicing`, `explore-refactor-first-slicing`) are unchanged.

#### Scenario: emitted block keeps its existing format

- **WHEN** `sai-explore` prints a `Ready to Propose` block in response to an explicit request
- **THEN** the block's sections match the existing format defined for the single-change or sliced protocol, with no section added, removed, or reordered by this change

### Requirement: Inline-proposal path does not assume a prior emission

The §7 inline-proposal path SHALL NOT presuppose that a `Ready to Propose` block was already emitted earlier in the session. Its wording SHALL NOT use deixis (such as "the block(s) above") that is false when no block was auto-printed; when §7 prints the block on request, its wording refers to the block it prints, not to a nonexistent earlier one. This keeps §7 coherent under on-demand emission, where the user's first explicit act may be to request a proposal with no block yet in the transcript.

#### Scenario: inline-proposal request with no prior block

- **WHEN** the user's first explicit act is to ask to create a proposal or run `/sai-1-spec` now, with no `Ready to Propose` block earlier in the session
- **THEN** `sai-explore` prints the block via the §7 path and its wording refers to the block it just printed, not to a block "above" that was never emitted
