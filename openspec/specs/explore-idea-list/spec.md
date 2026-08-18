# explore-idea-list Specification

## Purpose

TBD - seeded from delta spec `explore-idea-list` in change `explore-idea-progress-plan`.

## Requirements

### Requirement: idea-list-scope-and-state

`sai-explore` SHALL maintain a chat-scoped idea progress list that tracks the explored idea, held in the session: in conversation and, where a native task panel is bound, in the harness's task-panel session state. The session SHALL NOT write the list to any file, artifact, change directory, or configuration, and SHALL NOT derive it from repository state (no `openspec list --json`, no disk enumeration, no artifact reads). Harness-internal persistence of the harness's own task-panel state is harness session machinery, not a session write, and is out of scope of that prohibition.

#### Scenario: fresh chat holds the list in the session

- **WHEN** a fresh `sai-explore` chat begins
- **THEN** the idea progress list is tracked in the session with a single unmarked research item
- **AND** the list is not rendered while it holds only that item

#### Scenario: the session never persists the list

- **WHEN** the explore session adds, updates, or marks list items
- **THEN** the session creates, modifies, or deletes no file, artifact, change directory, or configuration
- **AND** harness-internal persistence of the harness's own task-panel state is outside the scope of that constraint

#### Scenario: list is never derived from repository state

- **WHEN** the list is rendered or updated
- **THEN** its contents come only from in-session evidence and never from `openspec list --json`, disk enumeration, or artifact reads

### Requirement: idea-list-item-catalog

The idea progress list SHALL contain exactly these item kinds: one research item, and — per crystallized slice — one slice-crystallization item, one reviewed-sai-1 item, and one reviewed-sai-2 item. A crystallized slice SHALL be one `**Change name**` value emitted by a crystallization turn (items 5/6 of `sai/commands/explore/instructions.md`). Items SHALL be added in the order the slicing assessment identifies the slices; a duplicate later identification of a change name already present in the list SHALL add no items. The list SHALL contain no implementation item and no other item kind.

#### Scenario: single-change chat produces four items

- **WHEN** a chat crystallizes one change
- **THEN** the list contains the research item plus that slice's three items: slice-crystallization, reviewed-sai-1, and reviewed-sai-2

#### Scenario: sliced crystallization produces the research item plus per-slice sets

- **WHEN** a sliced crystallization turn emits N blocks
- **THEN** the list contains the research item plus N ordered sets of three per-slice items, in slice-identification order

#### Scenario: duplicate identification adds nothing

- **WHEN** a crystallization turn identifies a slice whose change name is already present in the list
- **THEN** no new items are added for that slice

#### Scenario: no implementation item exists

- **WHEN** a later command implements the slice in another session
- **THEN** the list never gains an implementation item
- **AND** no item is added or marked from that event

### Requirement: idea-list-review-in-progress-state

When the post-crystallization review loop (item 9 of `sai/commands/explore/instructions.md`) begins processing a change, the active review check SHALL be selected once as the first review item of that slice in fixed order — reviewed-sai-1 if not marked completed, otherwise reviewed-sai-2 — that is not marked completed; when both review items are marked completed, no item of the slice SHALL render `in_progress`. While the loop processes the change, the selected active review check SHALL render `in_progress`. The active SHALL be a sticky reference: it SHALL NOT be recomputed from any later mark or clear of a review item, and it SHALL move only forward, and only when it is itself marked completed. The active item SHALL persist across review transactions and per-change picker re-shows while the loop processes the change, until it is marked completed. When the active item is marked completed by a tally reporting `High=0` — from a `Review sai-1's artifacts`, `Review sai-2's artifacts`, or `Review change-overview` transaction — the active SHALL advance to the slice's next review item not marked completed, and when none remains no item of the slice SHALL render `in_progress`. A completed review over the active item that reports at least one High finding SHALL leave the item not marked completed, SHALL keep it the active item, and SHALL keep it rendering `in_progress`; marking-clear wording applies only to previously marked items. A review that clears a review item other than the active one SHALL NOT move the active. Selecting `Skip` for the change, selecting `Exit review loop`, or closing the loop, SHALL resolve the change's in-progress item to render `pending`. The state is render-only: setting, advancing, or resolving it SHALL NOT mark or clear any item, and the evidence-based marking hooks (`explore-review-evidence-marking` requirements `review-item-no-high-pass-marks`, `review-item-per-slice-targeting`, and `review-item-evidence-only-marking`) SHALL remain unchanged. The research item and slice-crystallization items SHALL never render `in_progress`.

While the supervised pipeline (item 10 of `sai/commands/explore/instructions.md`) processes a change, the supervised review rounds SHALL set and resolve the in-progress state by phase: during spec-phase review rounds, the change's reviewed-sai-1 item SHALL render `in_progress`; during design-phase review rounds, the change's reviewed-sai-2 item SHALL render `in_progress`, regardless of reviewed-sai-1's mark state, because the design phase reviews the sai-2 artifact set. A completed supervised round reporting `High=0` SHALL mark the corresponding item per the evidence rules. When the supervised pipeline's review rounds end without that item being marked — cap exhaustion, a `failed` worker, or a `cancelled` worker — the in-progress item SHALL resolve to render `pending`. The state remains render-only: setting, advancing, or resolving it SHALL NOT mark or clear any item, and the evidence-based marking hooks apply unchanged.

#### Scenario: loop start sets the first uncompleted review check in progress

- **WHEN** the review loop begins processing a change whose reviewed-sai-1 item is not marked completed
- **THEN** reviewed-sai-1 renders `in_progress` and reviewed-sai-2 renders `pending`

#### Scenario: loop entry renders the active item before the first transaction

- **WHEN** the review loop begins processing a change and presents its per-change picker for the first time
- **THEN** the slice's active review item renders `in_progress` before any review transaction for that change has run
- **AND** the item keeps rendering `in_progress` through every later picker re-show until it is marked completed

#### Scenario: the active is the second review check when the first is completed

- **WHEN** the review loop begins processing a change whose reviewed-sai-1 item is marked completed and whose reviewed-sai-2 item is not
- **THEN** reviewed-sai-2 renders `in_progress`

#### Scenario: no item is in progress when both review checks are completed

- **WHEN** the review loop begins processing a change whose reviewed-sai-1 and reviewed-sai-2 items are both marked completed
- **THEN** no item of the slice renders `in_progress`

#### Scenario: the active item persists across transactions and re-shows

- **WHEN** a review transaction completes over the active item's slice leaving the active item not marked completed, and the per-change picker re-shows
- **THEN** the same item remains the active one and renders `in_progress`

#### Scenario: a completed marking advances the active

- **WHEN** the active reviewed-sai-1 item is marked completed by a `Review sai-1's artifacts` transaction closing with `High=0`
- **THEN** reviewed-sai-2 becomes the active item and renders `in_progress` when it is not marked completed

#### Scenario: a High=0 transaction renders once after mark and advance

- **WHEN** a `Review sai-1's artifacts` transaction closes with `High=0`, marking the active reviewed-sai-1 item completed and advancing the active to reviewed-sai-2
- **THEN** the list renders exactly once, after both the mark and the advance have been applied
- **AND** the panel shows reviewed-sai-1 `completed` and reviewed-sai-2 `in_progress`

#### Scenario: a change-overview pass can complete the active sai-2 item

- **WHEN** the active reviewed-sai-2 item is marked completed by a completed `Review change-overview` transaction closing with `High=0`
- **THEN** no item of the slice renders `in_progress`, because reviewed-sai-1 is already marked completed and no uncompleted review check remains

#### Scenario: a High-finding review keeps the active item in progress

- **WHEN** a completed review over the active item reports at least one High finding
- **THEN** the item stays not marked completed, remains the active item, and renders `in_progress`

#### Scenario: clearing a non-active review item does not move the active

- **WHEN** a completed review clears a marked review item that is not the active one
- **THEN** the active item remains unchanged and keeps rendering `in_progress`

#### Scenario: Skip resolves the in-progress state

- **WHEN** the user selects `Skip` for the change
- **THEN** the change's in-progress item resolves to render `pending`

#### Scenario: Exit review loop resolves the in-progress state

- **WHEN** the user selects `Exit review loop`
- **THEN** the change's in-progress item resolves to render `pending`

#### Scenario: closing the loop leaves no item in progress

- **WHEN** the review loop terminates after processing every tracked change
- **THEN** no item of any processed slice renders `in_progress`

#### Scenario: supervised spec rounds render reviewed-sai-1 in progress

- **WHEN** the supervised pipeline begins its spec-phase review rounds over a change whose reviewed-sai-1 item is not marked completed
- **THEN** the change's reviewed-sai-1 item renders `in_progress`

#### Scenario: supervised design rounds render reviewed-sai-2 in progress

- **WHEN** the supervised pipeline begins its design-phase review rounds over a change
- **THEN** the change's reviewed-sai-2 item renders `in_progress` regardless of reviewed-sai-1's mark state

#### Scenario: design rounds after spec cap exhaustion render reviewed-sai-2 in progress

- **WHEN** the spec phase ended by cap exhaustion with reviewed-sai-1 left unmarked and the run continues to the chained design phase
- **THEN** the change's reviewed-sai-2 item renders `in_progress` while the design-phase rounds process it

#### Scenario: a converging supervised round marks the reviewed item

- **WHEN** a supervised spec-phase round reports `High=0`
- **THEN** the change's reviewed-sai-1 item is marked per the evidence rules
- **AND** the design-phase rounds then render reviewed-sai-2 `in_progress` while they process it

#### Scenario: supervised cap exhaustion resolves the in-progress item

- **WHEN** the supervised pipeline's review rounds end by cap exhaustion without the active item being marked
- **THEN** the in-progress item resolves to render `pending`
- **AND** no item is marked or cleared by that resolution

#### Scenario: failed or cancelled worker resolves the in-progress item

- **WHEN** the phase worker returns `failed` or `cancelled` while the supervised pipeline's review rounds are in progress
- **THEN** the in-progress item resolves to render `pending`
- **AND** no review round is launched over the half-finished state

### Requirement: idea-list-render-adapter-placement

The idea-list render binding for each supported harness SHALL be a harness-specific adapter source at `sai/adapters/{harness}/idea-list-render.md` and SHALL be projected to `adapters/{harness}/idea-list-render.md` in that harness's installed SAI root. The binding SHALL remain a non-worker runtime-glue asset: it SHALL NOT define worker lifecycle, dispatch, continuation, an `InvocationEnvelope`, or a routed progress plan, and SHALL NOT be counted among the seven routed worker bindings. No idea-list-render source SHALL remain under `sai/orchestration/workers/bindings/{claude,opencode}/` after the relocation.

#### Scenario: Claude uses its adapter render binding

- **WHEN** the Claude Code installation resolves the idea-list render binding
- **THEN** it loads `adapters/claude/idea-list-render.md` from the Claude adapter projection
- **AND** that binding is sourced from `sai/adapters/claude/idea-list-render.md`

#### Scenario: opencode uses its adapter render binding

- **WHEN** the opencode installation resolves the idea-list render binding
- **THEN** it loads `adapters/opencode/idea-list-render.md` from the opencode adapter projection
- **AND** that binding is sourced from `sai/adapters/opencode/idea-list-render.md`

#### Scenario: the render binding is outside the worker matrix

- **WHEN** the routed worker matrix is projected or audited
- **THEN** `idea-list-render.md` is not included in the seven routed worker destinations
- **AND** `sai/orchestration/workers/bindings/` retains `worker-template.md` and the routed worker binding sources remain unchanged

#### Scenario: wrappers resolve the matching adapter

- **WHEN** `sai-explore` runs under either supported harness
- **THEN** its wrapper fetches the matching harness-qualified adapter path
- **AND** the 17 routed-worker Fetch lines continue to target `orchestration/workers/bindings/{phase}-worker.md` unchanged

### Requirement: idea-list-render-retirement

The manifest SHALL recognize the superseded installed path `orchestration/workers/bindings/idea-list-render.md` as retired for both supported harnesses. It SHALL carry one hash-gated retirement record per harness, each containing every exact raw Git-blob SHA-256 digest of a distinct content variant that a shipped manifest revision projected to that path, without line-ending normalization. The records SHALL contain these three Claude digests: `238b0fd7ef14b3f155e4bee008be9883948ad9b17e8a9477e79f0d013e878f23`, `792d0614a8a724ef19364976195ba8f6f0d08e70bc4d5db68eee0343603f54b0`, and `8376ebfd6f8c59709d65a6d79be0dfbf10baaeb6f282bd76442a302c26f30b37`; and these three opencode digests: `af9f1b8915db80210f9595c1adf7568c695401ba059f03e408c99e6273856347`, `5d26dd5bb555d525c4e7658fc021cb70a0dcdf90f248d020c51b2409ddf9a348`, and `74516e0219b92fc12be50b19d411af5031861ced9616e794630f32b1386a7dbf`.

#### Scenario: managed old copies are retired on upgrade

- **WHEN** an existing installation contains the old idea-list-render destination with bytes matching its harness retirement record
- **THEN** the installer removes the old destination and writes the matching new adapter destination

#### Scenario: edited old copies are preserved

- **WHEN** an existing installation contains the old destination with bytes that match none of that harness's retired managed hashes
- **THEN** the old file is preserved and reported as a managed-hash mismatch
- **AND** the new harness-qualified adapter file is still projected

#### Scenario: retirement records cover shipped variants

- **WHEN** the retirement inventory is audited against manifest history
- **THEN** each supported harness has exactly one record for `orchestration/workers/bindings/idea-list-render.md`
- **AND** each record contains the three distinct historical variants listed above

### Requirement: idea-list-rendering

The list SHALL NOT be rendered while it holds only the research item; it SHALL first render when it first carries more than the research item, at the first slice identification, and SHALL re-render whenever an item is added, marked, or cleared, or an item's in-progress state is set or resolved, after that. Rendering SHALL be performed through the per-harness idea-list render adapter at `sai/adapters/{harness}/idea-list-render.md`, and the adapter SHALL declare whether its harness has a native task panel — panel availability is declared by the adapter, never determined at runtime. The two supported harnesses (Claude Code and opencode) SHALL declare a native task panel, and their adapters SHALL render the list on the panel, replacing plain in-conversation text — the same list state SHALL NOT render on both surfaces. On the panel, a marked item SHALL render `completed`, a cleared item SHALL render back to `pending`, and the slice's active review item SHALL render `in_progress` while the post-crystallization review loop processes that slice — `in_progress` SHALL be carried only by reviewed-sai-1 and reviewed-sai-2 items per `idea-list-review-in-progress-state`, never by the research item or a slice-crystallization item. Each item's slice `**Change name**` key SHALL be carried in a settable-and-readable machine-readable panel entry field distinct from the label — opencode SHALL use `priority` and Claude Code SHALL use `description` — for stable item identity, so that the label is not reduced to the raw key. The adapter SHALL use the ownership marker `sai-idea-list:<change-name>` in the same machine-readable field. The label SHALL remain visually unambiguous on every rendered surface: a slice's items SHALL be distinguishable from every other slice's items, with the slice's change name rendered in the label. An adapter that declares no native task panel SHALL render plain in-conversation Markdown checkbox text — `- [ ]` for an unmarked item, `- [~]` for the active in-progress review item, `- [x]` for a marked item — as the declared fallback; no supported harness exercises that branch today, so it is a declared extension point for a future harness, never a runtime-detected path. The panel update SHALL originate exclusively from the coordinator session, never from a worker subagent. A turn that adds, marks, or clears an item, or that sets or resolves an item's in-progress state, SHALL render the list exactly once, after all of that turn's additions and state changes have been applied.

#### Scenario: no list while it holds only the research item

- **WHEN** a fresh `sai-explore` chat holds only the unmarked research item
- **THEN** no list is rendered
- **AND** the research item's state is still tracked in the session

#### Scenario: the list first renders at the first slice identification

- **WHEN** the slicing assessment first identifies a slice
- **THEN** the list renders with the research item and that slice's three items in their current states

#### Scenario: later turns re-render on change

- **WHEN** an item is added, marked, or cleared after the first render
- **THEN** the list re-renders with the updated content

#### Scenario: in-progress state changes re-render

- **WHEN** an item's in-progress state is set or resolved after the first render
- **THEN** the list re-renders with the updated content

#### Scenario: a turn renders the list once

- **WHEN** a crystallization turn identifies slices, emits blocks, and marks items
- **THEN** the list is rendered exactly once, after all of that turn's additions and state changes have been applied

#### Scenario: adapter-declared panel behavior is unchanged

- **WHEN** a supported harness's adapter declares a native task panel and the list first carries more than the research item
- **THEN** the adapter renders the list on that panel
- **AND** no plain in-conversation checkbox list is rendered for the same state

#### Scenario: adapter relocation preserves list state and identity

- **WHEN** a reviewed item is marked, cleared, or becomes the active review item after the adapter relocation
- **THEN** the panel entry renders `completed`, `pending`, or `in_progress` according to the existing state rules
- **AND** its machine-readable field continues to carry the ownership marker and slice change name
- **AND** the label remains unchanged and identifies the slice

#### Scenario: a binding declaring no panel falls back to plain text

- **WHEN** the idea-list render binding declares that its harness has no native task panel
- **THEN** the binding renders the list as plain in-conversation Markdown checkbox text
- **AND** no supported harness (Claude Code or opencode) exercises that branch today

#### Scenario: the plain-text fallback renders the active review item distinctly

- **WHEN** a binding declaring no native task panel renders the list while a review item is the active one
- **THEN** the active review item renders as `- [~]`
- **AND** an unmarked item renders as `- [ ]` and a marked item renders as `- [x]`

#### Scenario: panel state expresses mark and clear

- **WHEN** a reviewed-sai-1 item is marked after a completed review reporting no High findings and is cleared after a later completed review reporting at least one High finding
- **THEN** the item's panel entry renders `completed` and then renders back to `pending`
- **AND** the item's label is unchanged

#### Scenario: panel state expresses the active review item

- **WHEN** a slice's reviewed-sai-1 item is the active review item while the post-crystallization review loop processes the change
- **THEN** the item's panel entry renders `in_progress` and the item's label is unchanged
- **AND** when that item is later marked completed, its panel entry renders `completed` and the slice's next not-completed review item renders `in_progress`

#### Scenario: change-name key rides a machine-readable field

- **WHEN** a slice's items render on the panel
- **THEN** the slice's `**Change name**` key is carried in a machine-readable panel entry field for stable item identity

#### Scenario: labels distinguish slices on every surface

- **WHEN** a sliced crystallization renders several slices' items, on the panel or in the plain-text fallback
- **THEN** each item's label carries its slice's change name
- **AND** no two slices' items are indistinguishable on the rendered surface

#### Scenario: coordinator remains the sole emitter

- **WHEN** the idea-list state changes on a supported harness
- **THEN** the relocated adapter update is emitted by the coordinator session
- **AND** no worker subagent emits the panel update

### Requirement: idea-list-panel-ownership

While a `sai-explore` chat is active and the idea progress list has rendered — from its first render at the first slice identification onward — the harness's native task panel's declared owner SHALL be the session's idea progress list, exclusive in that the list never coexists with entries from any other surface and every one of its renders leaves the panel holding exactly the full idea list with no foreign entries, realized through the render outcome of `idea-list-panel-lifecycle`. Before the idea list's first render, the panel's declared owner SHALL be the pre-crystallization stage TODO (`explore-pre-crystallization-stages`), which renders during active exploration and is cleared at crystallization when the idea list takes the panel. A future surface that needs the panel during an active explore chat SHALL renegotiate the ownership rule rather than write alongside the idea progress list. The ownership rule SHALL be stated in `sai/commands/explore/instructions.md` and SHALL NOT be written into any routed worker binding file or idea-list adapter file under `sai/adapters/{claude,opencode}/`. The supervised run is the illustrative case: during supervised coordination no adapter-declared progress plan is in force, so dispatched workers' progress events SHALL be received and processed per the shared command-runner contract (`sai/orchestration/command-runner.md`) for their plan-independent obligations — every path in the event's `changed_files` is added to the supervision report in first-seen order, and the same worker is continued with exactly `continue_after_progress`; step marking has no application, since marking is defined only against an adapter-declared plan and none exists in the supervised flow. No plan-based list renders on the panel, because the neutral task-list policy (`sai/policies/todo-structure.md`) and the worker bindings govern routed phases whose adapters declare a progress plan and the supervised flow declares none. The ownership rule therefore SHALL change no observable supervised-run behavior. Standalone `/sai-1-spec` and `/sai-2-design` progress rendering SHALL remain unchanged, governed by their own phase adapters' declared progress plans.

#### Scenario: ownership excludes other emitters

- **WHEN** a supervised run is active and the idea progress list holds panel ownership
- **THEN** no other producer emits to the panel: no routed phase plan or other list appears alongside the idea progress list

#### Scenario: pre-crystallization ownership belongs to the stage TODO

- **WHEN** a `sai-explore` chat is actively exploring and no slice has been identified yet
- **THEN** the panel holds the pre-crystallization stage TODO and no idea-list entry renders

#### Scenario: exclusivity holds outside supervised runs

- **WHEN** a `sai-explore` chat is active outside a supervised run and the idea progress list renders
- **THEN** no other surface's entries appear alongside the idea progress list: the render displaces whatever the panel holds, and the list never coexists with foreign entries

#### Scenario: the rule lives in explore's contract

- **WHEN** the ownership rule's location is inspected
- **THEN** it is stated in `sai/commands/explore/instructions.md`
- **AND** it is absent from every routed worker binding and idea-list adapter file

#### Scenario: progress events are processed, not rendered

- **WHEN** a supervised run is active and a dispatched worker emits a progress event
- **THEN** the supervisor adds every path in the event's `changed_files` to the supervision report in first-seen order and continues the same worker with exactly `continue_after_progress`
- **AND** the event's step ids are not rendered on the panel, whose declared owner is the idea progress list

#### Scenario: standalone progress rendering is unchanged

- **WHEN** `/sai-1-spec` or `/sai-2-design` runs standalone through its routed coordinator
- **THEN** its declared progress plan renders on the panel as before
- **AND** the ownership rule does not suppress it

### Requirement: idea-list-panel-lifecycle

The idea list's panel entries are session-level render state of the current chat's list, not durable data: the list's content stays chat-scoped, while its rendering lives on the session-level panel until replaced. Each render SHALL leave the panel holding exactly the full idea list with no foreign entries — the idea list SHALL NOT coexist with entries from any other surface — and this resulting content is the mechanism by which the panel ownership declared in `idea-list-panel-ownership` is realized wherever it holds; on opencode, where `todowrite` replaces the whole list per call, the binding emits the full array on every render, while on Claude Code, whose task model is incremental, the binding converges the panel to the full list by updating existing entries in place, creating entries that are new, and deleting only entries that are no longer in the list. At first render (the first slice identification), the binding SHALL displace any pre-existing panel entries, including a routed phase's progress plan or another `sai-explore` chat's earlier list, with the full idea list. A new `sai-explore` chat starts with a fresh chat-scoped list, and the binding SHALL clear the panel at the chat's start of the entries a previous idea list rendered — a claim action distinct from rendering the list, which remains forbidden while the list holds only the research item — so a previous chat's entries never linger as current and a chat that never identifies a slice leaves no idea-list entries on the panel. Every idea-list panel entry SHALL carry an ownership marker in its machine-readable panel entry field — the same settable-and-readable field that carries the slice's `**Change name**` key per `idea-list-rendering` — and the start clear SHALL remove exactly the entries bearing that marker, leaving every other entry in place. The binding SHALL read panel entry state for that classification; the read covers the marker only and never derives list content, so the list's in-session-evidence rule is unaffected. The start clear SHALL NOT remove entries rendered by other surfaces — a routed phase's progress plan or `/sai-4-apply`'s step projection — which bear no marker and remain on the panel until the idea list's first render displaces them wholesale. When the explore chat ends, its last-rendered entries remain on the panel as session state — the chat performs no end-of-life cleanup — and any later surface that renders on the panel, including the next explore chat's start clear of the idea list's own entries, replaces them wholesale.

#### Scenario: first render displaces pre-existing entries

- **WHEN** the list first renders while the panel already holds entries from another surface (a routed phase's progress plan or `/sai-4-apply`'s step projection)
- **THEN** the full idea list replaces those entries
- **AND** no foreign entry remains and no coexistence occurs

#### Scenario: every render emits the full list

- **WHEN** a turn adds, marks, or clears an item
- **THEN** the binding emits the full idea list, replacing the panel's current content in that update

#### Scenario: a new explore chat clears its own previous entries at its start

- **WHEN** a `sai-explore` chat begins while the panel holds entries a previous idea list rendered
- **THEN** the binding clears at the chat's start exactly the entries bearing the idea-list ownership marker in their machine-readable field
- **AND** they have no separate panel presence afterwards, even before the new list first renders
- **AND** entries rendered by other surfaces (a routed phase's progress plan or `/sai-4-apply`'s step projection), which bear no such marker, are left in place

#### Scenario: a chat that never crystallizes leaves no idea-list entries

- **WHEN** a `sai-explore` chat begins and never identifies a slice
- **THEN** the panel holds no idea-list entries: the start clear removed any previous idea-list entries, and the list is never rendered while it holds only the research item
- **AND** entries from other surfaces, if any, remain untouched

#### Scenario: entries persist after the chat ends

- **WHEN** the explore chat ends and no other surface renders on the panel
- **THEN** the idea list's last-rendered entries remain on the panel as session state
- **AND** the ended chat performs no cleanup of them

#### Scenario: a later surface replaces the entries

- **WHEN** after the explore chat the session runs a command that renders its own task list on the panel
- **THEN** that render replaces the idea list's entries wholesale

### Requirement: research-item-marking

The research item SHALL be added unmarked at the start of the chat and SHALL be marked when the chat's first `Ready to Propose` block is emitted (the single-change protocol, or the first block of a sliced emission). No other event SHALL mark it.

#### Scenario: first emission marks research

- **WHEN** the chat emits its first `Ready to Propose` block
- **THEN** the research item is marked

#### Scenario: no emission leaves research unmarked

- **WHEN** the session ends without any crystallization emission
- **THEN** the research item remains unmarked

#### Scenario: a sliced set marks research once

- **WHEN** a sliced crystallization turn emits several blocks
- **THEN** the research item is marked at the first emission and is not re-marked

### Requirement: slice-crystallization-item-marking

When the slicing assessment (item 4 of `sai/commands/explore/instructions.md`) identifies a slice, its slice-crystallization item and its two review items SHALL be added in the unmarked state. The slice-crystallization item SHALL be marked when that slice's `Ready to Propose` block is emitted; the two review items SHALL remain unmarked, awaiting review-pass evidence.

#### Scenario: assessment adds slice items unmarked

- **WHEN** the slicing assessment identifies a slice
- **THEN** its slice-crystallization, reviewed-sai-1, and reviewed-sai-2 items are added in the unmarked state

#### Scenario: block emission marks the slice item

- **WHEN** a slice's `Ready to Propose` block is emitted
- **THEN** its slice-crystallization item is marked
- **AND** its review items remain unmarked

### Requirement: Separate dispatch state

The idea list SHALL retain `tracked_changes` for review-loop iteration and SHALL maintain separate `last_crystallization_set` selector state, replacing it per crystallization turn without persistence.

#### Scenario: a crystallization emits change names

- **WHEN** a crystallization turn emits one or more change names
- **THEN** selector dispatch uses only the latest emitted set while review navigation retains its tracked set
