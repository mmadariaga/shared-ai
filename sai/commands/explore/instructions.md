You are in explore mode — a read-and-discuss context. These rules hold for the entire session:

1. **No file writes**: This command MUST NOT create, modify, or delete files — read, search, and discuss only. Delegated writes exist solely via the crystallization-close choice under its owned scopes.

2. **Research diagnostics**: When a `budget-explorer` result carries `ladder_discards`, Fetch @sai/policies/explore-agent.md and apply only § Missing-tool notice presentation to the result. Retain the complete diagnostics internally; do not adopt the explorer role or its shell restrictions.

3. **Direct-looking request classification.** Treat an input phrased as a direct implementation command — a `direct-looking request` (e.g. "Implement …", "Fix …", "Add …", "Apply …") — as the initial content of a candidate idea, never as authorization to implement, dispatch, or leave Explore. Preserve its stated objectives, constraints, and acceptance criteria as the idea's starting content and ask only the unresolved substantive questions; do not re-run full discovery for already-supplied detail. Imperative wording alone never triggers a handoff to `/sai-4-apply` or `/sai-build`, never advises exiting Explore, and never dispatches implementation before the crystallization-close route picker receives an explicit user answer. `Explore change`, `Review edge cases`, `Implementation details`, and `Crystallize` remain mandatory; the picker may be presented in the block-emission turn only after every proposal block is visible and its complete inventory is recorded, and no route starts before the answer arrives in a later turn. An explicit artifact-review deliverable keeps its existing review path, and mentioning an existing change or its artifacts authorizes nothing. Destructive or shared actions remain unperformed under the existing safety constraints.

## Step loading

Fetch @sai/commands/explore/steps/common.md
Fetch @sai/policies/stage-machine.md and follow it for every store interaction; the verbs, errors, quoting, pointer, and degraded-mode contract are single-sourced there.

Load any other step file only when a returned `next.follow` names that exact file after `/emit`. The one exception is `steps/review-loop.md`, which no machine stage names: after crystallization, fetch it when the user fires the literal `review-loop` token or asks to review the crystallized changes. Worker bindings load at their dispatch points in `steps/pipeline-plan-unattended.md` and `steps/pipeline-direct-build.md`.

**Stage machines.** Pre-crystallization progression consumes `explore-idea@1`; after crystallization the same chat consumes `explore-slice@1` for slice inventory and the Plan / Direct Build TODO. Every stage-event turn (a user intent that advances the progression, or a recorded list at an agreement gate) runs the policy's spawn-then-emit cycle against the owning machine in the same session id; entering crystallize does not close the session. The machine consumes content-based recordings of agreed or empty lists, not readiness judgments. On a completed crystallization, clear the stage panel, record the ordered inventory through the `--ready-to-propose` block emit (never a hand-composed `recordedList`), load the returned pointer, print every block exactly as sent, then present the selector's native picker as the final action of the same assistant turn; the shared close in `steps/crystallization-protocol.md` is the sole full statement of this sequence. Only a successful block emit may return the `route-selector.md` pointer. The picker is presentation only: no route intent, route entry, or dispatch occurs until an explicit picker answer arrives in a later turn. Then emit `{intent: route-choice}` to `explore-slice@1`, follow the returned pointer, and let `route-selector.md` interpret only the recorded picker answer. If the user revises the proposal instead of choosing a route, follow the material-change rule and do not route the stale set. An incomplete inventory rejects route intents, and a cancelled, absent, or ambiguous picker response starts no route. After a route result, a selector pointer presents a fresh picker for the first pending slice; never reuse an earlier answer. The separate Direct Build continuation picker remains distinct and is the only authorization for automatically starting later slices.

**Step map** (each reached through `next.follow` unless noted):
- Pre-crystallization TODO, `next-step` advancement, persistence, Phase A panel — `steps/common.md`
- `Review edge cases` stage — `steps/review-edge-cases.md`
- `Implementation details` stage — `steps/implementation-details.md`
- Crystallization-turn close — `steps/crystallization-protocol.md`
- `review-loop` token — `steps/review-loop.md` (fetched directly, per the exception above)
- Deferred route choice — `steps/route-selector.md` (loaded from the returned pointer after complete inventory recording to present the picker; after its valid answer, emit `{intent: route-choice}` and follow the returned pointer); supervision — `steps/pipeline-selector.md`
- Phase B idea-list panel — `steps/idea-list.md`
- `next-slice` slice close — `steps/slice.md`
