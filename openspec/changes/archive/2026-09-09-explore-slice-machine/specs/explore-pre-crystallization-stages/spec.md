## ADDED Requirements

### Requirement: Post-crystallization next-slice close

After crystallization, Plan and Manual SHALL close the active slice only on the literal token `next-slice`, recognized by the same bare-token or dominant-intent rule as `next-step`. Mere containment of the string `next-slice` SHALL NOT fire the token, and a turn that negates, defers, quotes, or discusses the token SHALL NOT close the slice. Direct Build SHALL NEVER use `next-slice`; completing Archive marks the slice done and clears active. Plan's sai-1 → sai-2 → Implement table stays conversation prose in this change; `next-slice` while Plan is still on sai-1 or sai-2 SHALL NOT complete Implement and SHALL NOT mark the slice done. Manual has no TODO; the user closes the slice with `next-slice`. Slice names come from Ready to Propose blocks in chat, not the wire.

#### Scenario: Bare next-slice closes a Manual slice

- **WHEN** the user sends the bare token `next-slice` after crystallization on Manual
- **THEN** the active slice is closed and a turn that only mentions, quotes, or negates `next-slice` does not close it

## MODIFIED Requirements

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

### Requirement: Sidecar session lifecycle

Explore SHALL obtain pre-crystallization stage order, pointer routing, transition rules, and the progression state itself from the `explore-idea` machine (`explore-idea@1`) hosted by the `sai-state` sidecar, and after crystallization SHALL consume `explore-slice@1` in the same chat for slice inventory and Direct Build TODO. The sidecar is invoked as a black-box service through its command-line interface and loopback routes. The sidecar owns the progression state as a durable store: it persists each machine's state in its own session file under the system temp directory and reloads it automatically, so a sidecar process dying at turn end loses nothing and every stage-event turn (a user intent that advances the progression or a recorded list at an agreement gate) SHALL run the same minimal cycle — spawn (reuse-or-fresh), then `/emit` — with no state ever sent in a request. Every emit SHALL name `machineId: "explore-idea@1"` or `machineId: "explore-slice@1"`; an omitted or mistyped `machineId` is a closed error (`INVALID_EVENT` / `UNKNOWN_MACHINE`) and nothing falls back to the first machine. The `/emit` response SHALL be consumed as the minimal wire outcome `{stage, next: {follow, hint}, rejected?, warnings?}`; no state object and no snapshot SHALL travel on the wire in either direction. The returned `stage` SHALL be authoritative as the current stage, superseding the agent's at-most-one disposable presentation hint and any prose-derived stage identity. The returned `next` pointer's `follow` field SHALL identify the step file to be fetched and consumed for continued progression. A `warnings` array on an `/emit` or `/restore` response (first value `SESSION_FILE_CORRUPT`) reports store degradation in that same response with no extra turns. `/restore` SHALL be an optional read-only probe that requires `{machineId}` and returns `{stage, next, warnings?}` for recovery and panel re-render and SHALL never be part of the required cycle. Entering crystallize SHALL NOT `/close`: `explore-slice@1` can emit in the same chatId while `explore-idea@1` stays at crystallize in the map. At session end explore SHALL call `/close`, which purges the persisted state and tombstones the record so reopening the same chat identifier starts from the initial state. When a restore probe fails due to version mismatch or closed session, or when the sidecar is unreachable, explore SHALL fall to the degraded path: hold the current stage without auto-advancing and ask the user to advance explicitly by a direct `next-step` request, continuing without re-deriving the transition table in prose.

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
