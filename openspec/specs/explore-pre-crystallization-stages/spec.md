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

The stage progression SHALL advance only when the user explicitly requests it: the literal token `next-step` (bare, optionally with trivial punctuation or a greeting, or as the turn's dominant intent — the same recognition machinery as the `review-loop` token), clear natural-language intent naming the next stage or requesting crystallization, or a semantic confirmation of the proposed list at the `Review edge cases` or `Implementation details` stages. Mere containment of the string `next-step` SHALL NOT fire the token: it fires only when the turn is a bare token or when advancing the progression is the turn's dominant intent, and a turn that negates, defers, quotes, or discusses the token SHALL NOT advance the progression. `sai-explore` SHALL NOT advance a stage on its own judgment that the idea is solid or ready. The recorded empty-list conditions — at the `review-edge-cases` stage when the recorded edge-case list is empty, and at the `implementation-details` stage when the recorded implementation-details list is empty — are content-based rules owned by the `explore-idea` machine and do not constitute readiness judgments. The one-line readiness signal (`explore-crystallization-on-demand`) does not advance the stages. The machine consumes the recorded list state and returns the next stage and step pointer to the caller.

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

### Requirement: Crystallize stage defers overview-language resolution

The `Crystallize` stage SHALL run the size-based slicing assessment, integration-point friction assessment, and technical-uncertainty assessment before emitting any `Ready to Propose` block. When uncertainty fires, it SHALL run the uncertainty pause and complete the applicable Ask 1 and post-POC path before the crystallization language gate and block emission. The language gate SHALL run only after those checks complete. It MUST NOT run overview-language gate 9 at stage entry; gate 9 belongs to the later supervised Plan (unattended) activation.

Advancing into the `Crystallize` stage SHALL itself count as an explicit crystallization request. The slicing assessment and language-gate sequence SHALL start only after the crystallization step file named by `next.follow` is fetched. Deterministic empty-set advancement into this stage SHALL have the same effect. An explicit crystallize request made from an earlier stage SHALL first run the mandatory edge-case review when the review has not reached agreement, then proceed through all three assessments and any required uncertainty pause.

A POC is not a crystallized feature slice and does not clear or replace the stage TODO. The stage TODO is cleared only when feature crystallization begins emitting its first feature slice and the idea progress list takes the panel.

#### Scenario: crystallization runs slicing then the crystallization gate

- **WHEN** the user explicitly requests crystallization, including by advancing into the `Crystallize` stage
- **THEN** the size, friction, and uncertainty assessments run first, followed by any required uncertainty pause and then gate 8 before a `Ready to Propose` block prints
- **AND** overview-language gate 9 is not run during crystallization emission

#### Scenario: natural-language entry into the stage crystallizes

- **WHEN** the user names the `Crystallize` stage in natural language from the `Implementation details` stage
- **THEN** the advance counts as the explicit crystallization request and all required assessments and pauses run before a block prints
- **AND** overview-language gate 9 remains deferred

#### Scenario: an empty-list chain reaches crystallization in the same turn

- **WHEN** the in-scope edge-case list and implementation-details list are both empty and the user advances the progression
- **THEN** deterministic empty-set rules advance through both stages and the `Crystallize` entry runs the assessments and any required uncertainty pause before block emission
- **AND** the POC, if selected, does not become a feature slice or clear the stage TODO

#### Scenario: premature crystallize enters the review before slicing

- **WHEN** the user explicitly requests crystallization before the edge-case review has reached agreement
- **THEN** the review runs with no skip path and the assessments and any uncertainty pause run only after agreement

#### Scenario: fast-track preserves stage and gate boundaries

- **WHEN** `--fast-track` is active during crystallization and later supervised Plan (unattended) activation
- **THEN** language questions resolve by their separate rules without weakening or skipping either stage or the uncertainty pause
- **AND** mandatory edge-case review and staged progression remain neither skipped nor weakened

#### Scenario: Crystallize fetches the follow-named step before assessments

- **WHEN** explore enters the `Crystallize` stage and `/emit` returns `next.follow` naming the crystallization protocol
- **THEN** that step file is fetched before the slicing assessment and language-gate sequence starts

### Requirement: A materially changed idea resets the stage progression

When the idea under exploration materially changes into a new stable idea, `sai-explore` SHALL close the current sidecar session and spawn a fresh one, resetting the stage progression to the `Explore change` stage: the stage TODO re-renders with `Explore change` as the `in_progress` stage and the remaining stages `pending`, completed stages are no longer rendered as completed, and previously agreed lists are discarded for the new idea's progression. The reset SHALL NOT re-run the edge-case review by itself: a fresh review is entered only when the new idea advances into the `Review edge cases` stage or requests crystallization prematurely. The reset SHALL NOT change the Closure State handling of the new idea (a new `active-uncrystallized` lifecycle).

#### Scenario: A materially changed idea re-renders the TODO from stage 1

- **WHEN** exploration materially changes the current idea into a new stable idea
- **THEN** the sidecar session closes, a fresh session spawns at `explore-change`, and the stage TODO re-renders with `Explore change` `in_progress` and the other three stages `pending`

#### Scenario: Agreed lists do not carry over the reset

- **WHEN** the progression resets for a materially changed idea and a fresh sidecar session begins
- **THEN** the previously agreed edge-case list and implementation-details list are discarded and are re-surfaced only when the new idea reaches those stages again

#### Scenario: The reset alone does not start a fresh review

- **WHEN** a materially changed idea resets the progression and spawns a fresh sidecar session, but the user has not advanced into `Review edge cases` or requested crystallization
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

### Requirement: Sidecar session lifecycle

Explore SHALL obtain pre-crystallization stage order, pointer routing, transition rules, and the progression state itself from the `explore-idea` machine (`explore-idea@1`) hosted by the `sai-state` sidecar, and after crystallization SHALL consume `explore-slice@1` in the same chat for slice inventory and Direct Build TODO. The sidecar is invoked as a black-box service through its command-line interface and loopback routes. The sidecar owns the progression state as a durable store: it persists each machine's state in its own session file under the system temp directory and reloads it automatically, so a sidecar process dying at turn end loses nothing and every stage-event turn (a user intent that advances the progression or a recorded list at an agreement gate) SHALL run the same minimal cycle — spawn (reuse-or-fresh), then `/emit` — with no state ever sent in a request. Every emit SHALL name `machineId: "explore-idea@1"` or `machineId: "explore-slice@1"`; an omitted or mistyped `machineId` is a closed error (`INVALID_EVENT` / `UNKNOWN_MACHINE`) and nothing falls back to the first machine. The `/emit` response SHALL be consumed as the minimal wire outcome `{stage, next: {follow, hint}, rejected?, warnings?}`; no state object and no snapshot SHALL travel on the wire in either direction. The returned `stage` SHALL be authoritative as the current stage, superseding the agent's at-most-one disposable presentation hint and any prose-derived stage identity. The returned `next` pointer's `follow` field SHALL identify the step file to be fetched and consumed for continued progression. After each `/emit`, explore SHALL fetch whatever `next.follow` names with no file whitelist; the sidecar pointer is the contract. If that follow load fails, explore SHALL stop, show the error, and wait for the user; it SHALL NOT guess another file and SHALL NOT route the failure through worker Bounded Recovery. If `/emit` fails or returns `rejected`, explore SHALL NOT fetch `crystallization-protocol.md`, `slice.md`, or `pipeline-direct-build.md` on its own. A `warnings` array on an `/emit` or `/restore` response (first value `SESSION_FILE_CORRUPT`) reports store degradation in that same response with no extra turns. `/restore` SHALL be an optional read-only probe that requires `{machineId}` and returns `{stage, next, warnings?}` for recovery and panel re-render and SHALL never be part of the required cycle. Entering crystallize SHALL NOT `/close`: `explore-slice@1` can emit in the same chatId while `explore-idea@1` stays at crystallize in the map. At session end explore SHALL call `/close`, which purges the persisted state and tombstones the record so reopening the same chat identifier starts from the initial state. When a restore probe fails due to version mismatch or closed session, or when the sidecar is unreachable, explore SHALL fall to the degraded path: hold the current stage without auto-advancing and ask the user to advance explicitly by a direct `next-step` request, continuing without re-deriving the transition table in prose.

#### Scenario: Lazy spawn on first stage event

- **WHEN** a stage event occurs on the first turn that carries it
- **THEN** the sidecar spawns (reuse-or-fresh) and the machine processes the event, returning the new or unchanged stage with no restore call

#### Scenario: State and pointer consumption

- **WHEN** the machine returns from a stage-event emission
- **THEN** the returned `stage` becomes the authoritative current stage over the presentation hint, the `next.follow` pointer is fetched and consumed for continued progression, and no state object or snapshot is carried in conversation

#### Scenario: Restore-per-turn cycle on every stage-event turn

- **WHEN** any stage-event turn runs, whether it advances the progression or records a list at an agreement gate
- **THEN** explore spawns the sidecar (reuse-or-fresh) and emits the event, and the returned minimal wire outcome — not any conversation-carried state — supplies the current stage and pointer

#### Scenario: Optional restore probe

- **WHEN** recovery or panel re-render needs the sidecar-owned current stage
- **THEN** the `/restore` probe with `{machineId}` returns `{stage, next, warnings?}` without mutating the session and the required cycle still does not include it

#### Scenario: Sidecar failure falls to degraded path

- **WHEN** the sidecar is unreachable, a restore probe fails due to version mismatch or closed session, or a connection cannot be established
- **THEN** the progression holds the current stage without advancing, asks the user to advance explicitly, and continues without re-deriving the transition table in prose

#### Scenario: Session boundary on material change

- **WHEN** the explored idea materially changes into a new stable idea
- **THEN** the current sidecar session closes and a fresh one spawns, beginning at `explore-change`, with the persisted state purged by `/close` and no stage or list state carried forward to the new session

#### Scenario: Restore-per-turn cycle is harness-neutral

- **WHEN** the sidecar lifecycle prose prescribing the minimal spawn-then-emit cycle is inspected for Claude Code and opencode
- **THEN** the same shared, harness-neutral prose applies to both harnesses with no per-harness branches

#### Scenario: Crystallize does not close the sidecar session

- **WHEN** explore enters the crystallize stage
- **THEN** it does not `/close`, `explore-idea@1` stays at crystallize in the map, and `explore-slice@1` can emit in the same chatId

#### Scenario: Follow load uses next.follow with no whitelist

- **WHEN** `/emit` returns a `next.follow` path
- **THEN** explore fetches that named file with no file whitelist

#### Scenario: Follow load failure stops and waits

- **WHEN** the follow load for `next.follow` fails
- **THEN** explore stops, shows the error, and waits for the user without guessing another file or routing the failure through worker Bounded Recovery

#### Scenario: Emit failure does not self-fetch follow-loaded files

- **WHEN** `/emit` fails or returns `rejected`
- **THEN** explore does not fetch `crystallization-protocol.md`, `slice.md`, or `pipeline-direct-build.md` on its own

### Requirement: Machine-owned stage state persists in the sidecar store

The stage progression state SHALL be owned by the sidecar rather than held in conversation only: the machine-owned portion (the current stage and the agreed lists) SHALL be persisted by the `sai-state` sidecar in its own session file under the system temp directory and reloaded automatically across process restarts, while the pending crystallization request, Closure State, and readiness tracking remain conversation-held. The agent SHALL memorize no state JSON and SHALL never send state in a request, holding at most one disposable presentation hint (the last rendered stage, used only for panel rendering on event-less turns and to notice regressions); the sidecar response SHALL always win over the hint. The session SHALL NOT write this state to any file, artifact, change directory, configuration, or `.openspec.yaml` inside the project — the only persistence is the sidecar's own session file under the system temp directory — and `sai-explore` remains read-only.

#### Scenario: Stage state survives a sidecar process restart

- **WHEN** the sidecar process dies between stage-event turns and a fresh process spawns for the same chat identifier
- **THEN** the machine-owned stage progression continues from the persisted stage with no restore call and no state JSON in conversation

#### Scenario: The project stays read-only

- **WHEN** the stage progression advances or a list is recorded
- **THEN** the only write is the sidecar's own session file under the system temp directory and no project file, artifact, change directory, configuration, or `.openspec.yaml` is touched

### Requirement: Post-crystallization next-slice close

After crystallization, Plan and Manual SHALL close the active slice only on the literal token `next-slice`, recognized by the same bare-token or dominant-intent rule as `next-step`. Mere containment of the string `next-slice` SHALL NOT fire the token, and a turn that negates, defers, quotes, or discusses the token SHALL NOT close the slice. Direct Build SHALL NEVER use `next-slice`; completing Archive marks the slice done and clears active. Plan's sai-1 → sai-2 → Implement table stays conversation prose in this change; `next-slice` while Plan is still on sai-1 or sai-2 SHALL NOT complete Implement and SHALL NOT mark the slice done. Manual has no TODO; the user closes the slice with `next-slice`. Slice names come from Ready to Propose blocks in chat, not the wire.

#### Scenario: Bare next-slice closes a Manual slice

- **WHEN** the user sends the bare token `next-slice` after crystallization on Manual
- **THEN** the active slice is closed and a turn that only mentions, quotes, or negates `next-slice` does not close it

