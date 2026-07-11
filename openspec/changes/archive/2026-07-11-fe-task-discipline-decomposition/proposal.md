## Why

A `tasks.md` step that touches both markup (UI/UX sensibility) and logic (frontend app-code) must currently commit to a single `discipline` token at design time, even though the natural division of labor in a FE team splits markup from logic across two specialists. The closed enumeration in `tasks-routing-metadata` does not give the future orchestrator enough signal to dispatch the markup to a UI/UX-specialized agent and the logic to a programmer-specialized agent when the two live in the same step, so the routing metadata is coarser than the work it describes.

## What Changes

- Add a SHOULD heuristic to the `tasks-routing-metadata` capability spec: when a substantial frontend deliverable spans both markup and logic, `sai-2-design` SHOULD emit two consecutive steps in `tasks.md` — one tagged `(layer=frontend, discipline=ui-ux)`, the other tagged `(layer=frontend, discipline=app-code)`, in that order (back-to-back in the file, sequential numbering) — so a future orchestrator can route each step to a UI-specialized or programmer-specialized agent respectively.
- Add three new scenarios under the "Layer-discipline orthogonality" scenario: (1) the FE multi-discipline decomposition pattern for a substantial deliverable, (2) the trivial single-component FE deliverable MAY stay atomic (the SHOULD is gated on substantiality), and (3) the second step inherits a component that already contains the markup from the first step, and the implementer in `sai-4-apply` is responsible for producing one coherent final file (not two partial states).
- No new layer or discipline tokens; the existing `ui-ux` and `app-code` disciplines are reused verbatim.
- No format change to the step structure (the `**Routing**` line format and position are unchanged from `tasks-routing-metadata`).
- No retroactive re-tagging of archived `tasks.md` files; the heuristic applies at design time only.
- Trivial single-component deliverables (one `.tsx` with both markup and a small amount of state/fetch in the same file) MAY stay atomic; the split pays off only when the deliverable is substantial (multiple files, or a component complex enough that the UI checkpoint is reviewable on its own).
- The heuristic is a routing hint, not a serialization mandate. A future orchestrator MAY choose to run the two steps in parallel against different files; the `tasks.md` ordering is a recommended sequence, not a hard dependency.
- Scoped to frontend only in this change; generalizing the heuristic to other multi-discipline step pairs (e.g. `(backend, service) + (backend, data)`) is a follow-up change once the FE pattern is validated.

### Non-goals

- No new layer or discipline tokens — the existing `ui-ux` and `app-code` disciplines are reused verbatim.
- No format change to the step structure — the `**Routing**` line format, position, and key=value tagged pairs are unchanged.
- No retroactive re-tagging of archived `tasks.md` files (precedent: `tasks-routing-metadata/proposal.md:18`).
- No consumer, router, dispatcher, or any code that reads the new scenarios. The metadata remains advisory; a future orchestrator (out of scope) is responsible for mapping the descriptive tokens to its own agent roster at dispatch time.
- No generalization to other multi-discipline step pairs (e.g. `(backend, service) + (backend, data)`) — deferred as a follow-up change.
- No schema (`openspec/schemas/sai-workflow/schema.yaml`) or template (`openspec/schemas/sai-workflow/templates/tasks.md`) edits — the step structure already accommodates a multi-step `tasks.md` and needs no schema change.
- No `sai/instructions/design.md` edit — the heuristic is a spec-level guidance that `sai-2-design` consumes via spec loading; the derivation rubric is unchanged.

## Capabilities

### New Capabilities
- *(none — this is a pure spec-level modification of an existing capability)*

### Modified Capabilities
- `tasks-routing-metadata`: under the "Layer-discipline orthogonality" scenario, add three new scenarios — (1) the FE multi-discipline decomposition pattern for a substantial deliverable, describing when a substantial frontend deliverable SHOULD be split into two consecutive `## Step N` sections with `discipline=ui-ux` then `discipline=app-code`, in that order (back-to-back in the file, sequential numbering); (2) the trivial single-component FE deliverable MAY stay atomic, expressing the substantiality gate as a normative escape hatch (one `.tsx` with both markup and a small amount of state/fetch in the same file may remain a single step, typically tagged with the discipline that dominates the file's content); and (3) the "inherits markup from the first step" clarification, stating that the second step's `**Files Affected**` includes the component emitted by the first step, and that the implementer in `sai-4-apply` produces one coherent final file, not two partial states.

## Impact

- **Modified files**: `openspec/specs/tasks-routing-metadata/spec.md` (append two scenarios under "Layer-discipline orthogonality"). The capabilities that consume this spec (`openspec/specs/tasks-scaffold-format/spec.md`, the `tasks` artifact instruction in `openspec/schemas/sai-workflow/schema.yaml`, and the design instructions mirrored across `sai/instructions/` and `commands/{claude,opencode,copilot}/`) are unchanged in their format and step structure — they inherit the new scenario automatically.
- **No new files** at the schema, template, or design-instruction layer.
- **No schema or template edits** are required: the `**Routing**` line format, the `layer` / `discipline` / `complexity` tokens, and the position of the line are all unchanged. The new scenarios are normative spec-level guidance for `sai-2-design` about *when* to emit two steps instead of one, not a format change.
- **No effect on running changes**: archived `tasks.md` files are not retroactively re-tagged (precedent set by `tasks-routing-metadata/proposal.md:18`).
- **GLOSSARY.md**: no new terms. The change reuses the existing `Routing Line`, `Routing Layer`, `Routing Discipline`, and `Routing Complexity` terms verbatim.
- **Cost impact**: zero at runtime — no consumer reads the new scenarios yet. At design time, `tasks.md` grows by roughly one step per substantial FE deliverable; the SHOULD-not-SHALL framing caps the overhead to non-trivial changes.

## Proposal Research Documentation

**Local files**:
- `openspec/changes/archive/2026-07-11-tasks-routing-metadata/specs/tasks-routing-metadata/spec.md:69` — closed discipline enumeration that this change reuses (`ui-ux`, `app-code`, `service`, `data`, `config`); site of the two new scenarios.
- `openspec/changes/archive/2026-07-11-tasks-routing-metadata/specs/tasks-routing-metadata/spec.md:91-102` — current "Layer-discipline orthogonality" scenario; the two new scenarios append directly under this block.
- `openspec/changes/archive/2026-07-11-tasks-routing-metadata/proposal.md:16` — "Inline only: no separate `routing.md`... the orchestrator (a separate change) maps the descriptive tokens to its own agent roster at dispatch time" — confirms the future orchestrator is out of scope for this change.
- `openspec/changes/archive/2026-07-11-tasks-routing-metadata/proposal.md:18` — "Non-goals: ... no retroactive re-tagging of archived `tasks.md` files" — sets the precedent this change follows.
- `openspec/specs/tasks-routing-metadata/spec.md` — current source-of-truth spec; will be the live MODIFIED target (the archive copy is the historical record, but the live spec is what `sai-2-design` reads and what this change updates).
- `openspec/specs/tasks-scaffold-format/spec.md` — step structure contract; reviewed to confirm no format change is needed (Routing line format and position are unchanged).
- `openspec/schemas/sai-workflow/schema.yaml` — `tasks` artifact instruction; reviewed to confirm the existing step structure already accommodates a multi-step `tasks.md` and needs no schema edit.
- `openspec/schemas/sai-workflow/templates/tasks.md` — step template; reviewed to confirm no template edit is needed.
- `sai/instructions/design.md` — design agent instructions; reviewed to confirm the design-time derivation rubric does not need to change (the heuristic is a routing-level guidance, not a derivation rubric change).

**External URLs**: (none)

## Additional Notes

- The two-step decomposition is a **SHOULD**, not a SHALL: trivial single-component FE deliverables MAY stay atomic. The gating condition is *substantiality* — multiple files, or a component complex enough that the UI checkpoint is reviewable on its own. This framing matches the user's "trivial single-component deliverables MAY stay atomic" guidance in the original request.
- The same `.tsx` typically appears in both steps' `**Files Affected**`. The intermediate state — the file with only markup, before the second step adds the logic — is internal to the OpenSpec change and is never deployed or reviewed standalone. The implementer in `sai-4-apply` is responsible for producing one coherent final file; this is stated explicitly in the new "inherits markup" scenario so the contract is not implicit.
- The heuristic is a **routing hint**, not a serialization mandate. A future orchestrator MAY choose to run the two steps in parallel against different files (UI agent on `.css` / markup-only `.tsx`, app-code agent on a store / api-client file). The `tasks.md` ordering is a recommended sequence, not a hard dependency; the orchestrator owns the dispatch policy. This preserves the precedent that `tasks-routing-metadata` is descriptive, not prescriptive (per the "Routing tokens are descriptive, not an agent roster" requirement at `tasks-routing-metadata/spec.md:127`).
- The user's "Generalize the heuristic to all multi-discipline step pairs" alternative is **rejected for now**: the user asked specifically about FE, and generalizing is a follow-up change once the FE pattern is validated. This change does not touch `(backend, service) + (backend, data)` or any other multi-discipline pair.
- The user's "Compound discipline" alternative (e.g. `discipline=ui-ux+app-code`) is **rejected** because it would violate the closed enumeration at `tasks-routing-metadata/spec.md:69` and require a spec amendment to the vocabulary itself. The two-step decomposition is the cleanest way to provide the same signal without amending the enumeration.
- The user's "Per-file discipline annotation in `**Files Affected**" alternative is **rejected** because it would require a new metadata dimension, the same coordination problem (two agents still touch the same file), and bloat the format. The two-step decomposition reuses the existing per-step line format.
- The user's "Single step + orchestrator decomposes at runtime" alternative is **deferred** as the future orchestrator's policy (out of scope for this repo per `tasks-routing-metadata/proposal.md:16`); this change only strengthens the signal in `tasks.md`. The orchestrator remains free to also decompose or not.
- Format key=value tagged pairs and middle-dot separator are unchanged. The new scenarios do not introduce a new token or a new field on the Routing line; they only govern when `sai-2-design` emits two Routing lines instead of one for a substantial FE deliverable.
- Mapping to the design/implement mental model: the FE deliverable boundary between markup and logic mirrors the natural division of labor in FE teams (designer vs engineer). The new heuristic makes that boundary explicit at the routing level, so a future orchestrator can dispatch each side to a specialist without re-deriving the split at dispatch time.
