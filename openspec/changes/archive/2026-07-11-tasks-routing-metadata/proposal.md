## Why

`sai-2-design` produces a `tasks.md` scaffold that lists the implementation steps a future orchestrator will dispatch. The scaffold encodes **what** each step touches (`**Files Affected**`) and **how** to verify it (`**Testing Strategy**`), but no routing cues: a future orchestrator that wants to send each step to a specialized agent (fe-ui, fe-code, backend, infra, …) has to re-derive the routing from the step body every run, and cannot evolve its agent roster without re-tagging every archived `tasks.md`. Capturing the routing at design time as cheap planning-time metadata — three descriptive dimensions, not agent names — keeps `tasks.md` self-contained, lets the orchestrator evolve independently, and avoids regenerating every change the day the router lands.

## What Changes

- Add a new `**Routing**` keyword line to every `## Step N` in `tasks.md`, placed immediately after the step title and before `**Files Affected**`, formatted as `**Routing**: layer=<layer> · discipline=<discipline> · complexity=<complexity>` (key=value tagged format, not positional).
- Define the enum vocabulary for all three dimensions in a new `tasks-routing-metadata` capability spec. The vocabulary is intentionally small and orthogonal — layer has three values (the architectural location) plus one escape hatch; discipline has five values (the type of thinking or agent specialty) orthogonal to layer; complexity is a coarse three-tier scalar (low/medium/high).
  - `<layer>`: `frontend`, `backend`, `infra`, plus the escape hatch `cross-cutting` for steps that span layers in a non-trivial way.
  - `<discipline>`: `ui-ux`, `app-code`, `service`, `data`, `config`. Orthogonal to layer: `(layer=frontend, discipline=ui-ux)` and `(layer=frontend, discipline=app-code)` are both valid and meaningfully different.
  - `<complexity>`: `low`, `medium`, `high` — a coarse design-time judgment, refined freely by `sai-3-implement` without re-tagging `tasks.md`.
- Derivation rules: layer is read from `**Files Affected**` paths against path patterns; discipline is read from `**Files Affected**` paths against a parallel set of patterns; complexity is a coarse judgment over file count, layer spread, public-API touch, and breaking-change risk.
- Update the `tasks` artifact instruction in `openspec/schemas/sai-workflow/schema.yaml` and the template at `openspec/schemas/sai-workflow/templates/tasks.md` to include the new line in the step structure.
- Update the design instructions (`sai/instructions/design.md`, mirrored per harness) with the derivation rubric, written as static planning-time guidance the design agent applies to the planned file snapshot.
- Modify the `tasks-scaffold-format` capability spec so the step structure requires the new `**Routing**` keyword line in the same position as the other step fields.
- Inline only: no separate `routing.md`, no change to the agent roster, no router/consumer built in this change. The metadata is advisory and coarse; `sai-3-implement` is free to refine any value with full-project domain access. A future orchestrator (a separate change) maps the descriptive tokens to its own agent roster at dispatch time.
- Optional one-line parenthetical justification MAY follow each token for audit (e.g. `layer=frontend · discipline=ui-ux · complexity=medium (Next.js component)`). The parser MUST ignore anything from the first `(` onward on the line; the parenthetical is human-audit metadata, not part of the routing tuple.
- Excluded for now: the `parallelizable` dimension. It is acknowledged as future work but does not land in this change.

Non-goals: no router/consumer; no agent names in the vocabulary; no per-step parallelization hint; no machine-readable routing block (the formatted line is the only artifact); no retroactive re-tagging of archived `tasks.md` files.

## Capabilities

### New Capabilities
- `tasks-routing-metadata`: per-step `**Routing**` line on `tasks.md` — three descriptive dimensions (layer, discipline, complexity), enum vocabulary, derivation rules, and the design-time-only contract that `sai-3-implement` may refine any value but must not reframe the tokens as agent names.

### Modified Capabilities
- `tasks-scaffold-format`: extends the step structure to require the new `**Routing**` keyword line as the first sub-field of every `## Step N` section, and extends the `schema-tasks-instruction-updated` requirement to describe the new line.

## Impact

- **Modified files**: `openspec/schemas/sai-workflow/schema.yaml` (`tasks` artifact instruction, plus the schema docstring if it enumerates the step fields), `openspec/schemas/sai-workflow/templates/tasks.md` (template adds a `**Routing**` line in its `## Step N` skeleton), `sai/instructions/design.md` (derivation rubric for the design agent), and the per-harness mirror copies of the design instructions.
- **No new files** at the design-instruction or schema layer.
- **No changes** to `implementation.md`, `interfaces.md`, `review.md`, or the audit phases. The Routing line is `tasks.md`-only.
- **No effect on running changes**: archived `tasks.md` files are not retroactively re-tagged. New `tasks.md` files emitted by `/sai-2-design` after this change lands carry the line.
- **GLOSSARY.md**: append four new terms (`Routing Line`, `Routing Layer`, `Routing Discipline`, `Routing Complexity`) per `<glossary_format>` append rules.
- **Cost impact**: ~10–20 extra tokens per step at design time to emit the line. No runtime cost — no consumer reads it in this change.

## Proposal Research Documentation

**Local files**:
- `openspec/schemas/sai-workflow/schema.yaml:84-138` — `tasks` artifact definition, current step structure, instruction text
- `openspec/schemas/sai-workflow/templates/tasks.md` — current step template
- `sai/instructions/design.md:79-129` — where `tasks.md` step structure is emitted; site of the derivation rubric edit
- `openspec/specs/tasks-scaffold-format/spec.md` — current step format contract; will be MODIFIED
- `openspec/specs/tasks-authoring-rules/spec.md` — concise-step discipline (must not be violated by the Routing line)
- `openspec/specs/model-routing/spec.md` — adjacent but unrelated (covers command-level model assignments in YAML frontmatter, not per-step routing)
- `openspec/changes/add-advisor-skill-family/tasks.md` — reference for the existing step format
- `GLOSSARY.md` — current terms; will be appended

**External URLs**: (none)

## Additional Notes

- The user explicitly excluded `parallelizable` from this change; it remains a future-work item that can land in a separate change without disturbing this metadata.
- The layer vocabulary is small by design — `frontend`, `backend`, `infra`, plus the escape hatch `cross-cutting` — to keep the derivation mechanical and to keep the layer axis orthogonal to the discipline axis (which is the finer split). Project-specific layers (e.g. `ml`, `firmware`) can be added later by a separate change once a real consumer requests them; nothing in the design forces the closed set to be permanent.
- The discipline vocabulary is grounded in path patterns keyed to agent specialty — `ui-ux` (presentation/UX sensibility), `app-code` (client-side non-UI logic), `service` (server-side business logic), `data` (persistence), `config` (declarative artifacts including config files and markdown docs) — which is what the design agent already inspects when writing the step. The derivation is essentially free.
- The complexity dimension is explicitly a coarse judgment the design agent makes once and `sai-3-implement` is free to refine (e.g. split a `high` step) — `tasks.md` does not need to be revisited when the implementation agent re-sizes the work. The metadata is descriptive, not prescriptive.
- The Routing line is the *only* routing artifact. There is no companion `routing.md`, no table, no JSON sidecar. The orchestrator (a future change) parses the same single line that the design agent writes.
- Format: the line uses key=value tagged pairs, not positional tokens. The key prefix (`layer=`, `discipline=`, `complexity=`) is mandatory on every line; a positional parser cannot validate which dimension a value belongs to without assuming the order, and the tagged form is robust to reordering or future dimension additions. The middle dot (U+00B7) is the pair separator — not a comma, not a pipe, not a slash — so a downstream parser splits on a single character. Any text from the first `(` onward is a human-audit parenthetical and MUST be ignored by the parser.
- Layer × discipline orthogonality: every (layer, discipline) combination is valid, and the four core cases the user named in explore are encoded as `(frontend, ui-ux)` for FE with UI/UX sensibility, `(frontend, app-code)` for FE code-only, `(backend, service)` for backend services, `(backend, data)` for the backend data layer, and `(infra, config)` for pure declarative artifacts. Nonsensical combinations (e.g. `backend, ui-ux`) are not enumerated as primary routings but remain legal in the line; the orchestrator (out of scope) decides what to do with them.
- The design instructions will encode the derivation as static planning-time rules (path → token lookup tables, a precedence list for ambiguity, a short justification note per token). The rules are reproducible without code: a second design agent with the same `**Files Affected**` list must produce the same Routing line.
