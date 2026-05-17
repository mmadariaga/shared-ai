## Context

shared-ai is a prompt/instruction library with no application code. It uses OpenSpec for change lifecycle management. The current schema (`spec-driven`) is the OpenSpec default — it has no knowledge of the shared-AI artifact types, templates, or the two-phase spec/design split. The pipeline currently runs as a single `opsx:propose` call that generates proposal → design → tasks in one shot, giving no natural checkpoint for the user to review specs before design begins.

OpenSpec supports custom schemas as directories under `openspec/schemas/<schema-name>/` containing a `schema.yaml` and a `templates/` subdirectory. This is the extension mechanism we use.

The commands are markdown files with YAML frontmatter. Renaming them is a straightforward file rename. The approval gate is not a feature of the OpenSpec CLI — it must be implemented by the command wrappers themselves (read/write `.openspec.yaml`).

## Goals / Non-Goals

**Goals:**
- Encode the full artifact graph (9 artifacts, dependency edges, apply requirements) in a first-class OpenSpec schema
- Provide purpose-built templates that match the structure the instructions already produce
- Insert a hard gate between specs and design that records user approval in a queryable location (`.openspec.yaml`)
- Renumber commands consistently with the two-phase split
- Keep wrappers thin — they orchestrate, they do not duplicate instruction content

**Non-Goals:**
- Modifying the OpenSpec CLI binary or skill SKILL.md files
- Migrating in-flight changes that use the old `spec-driven` schema
- Adding programmatic enforcement of the gate (CLI-level) — wrapper-level check is sufficient for the use case
- Changing the content of existing `instructions/sai/*.md` files (separate concern)

## Decisions

### D1: Custom schema stored in openspec/schemas/sai-workflow/
**Decision**: Create `openspec/schemas/sai-workflow/schema.yaml` and `templates/*.md` following the OpenSpec custom schema convention.
**Rationale**: This is the supported extension point. Avoids forking the CLI and keeps the schema co-located with the project that uses it.
**Alternatives considered**:
- Extending `spec-driven` in-place: rejected — `spec-driven` is owned by OpenSpec CLI, would be overwritten on CLI update.
- Encoding the artifact graph only in command wrappers (no schema): rejected — loses the status/dependency tracking that `openspec status` provides; downstream `opsx:apply` would not know which tasks to track.

**ADR check**: Hard to reverse (schema name baked into config.yaml and all change directories), surprising without context (why not spec-driven?), real trade-off (custom schema vs simpler wrapper-only approach). → Document rationale in schema.yaml header comment.

### D2: Approval gate implemented via .openspec.yaml YAML write in sai-1-spec
**Decision**: `sai-1-spec` writes `approval.specs.approved_at` + `approval.specs.notes` into the change's `.openspec.yaml` after user confirmation. `sai-2-design` reads it before proceeding.
**Rationale**: `.openspec.yaml` is the canonical per-change state file. Writing there keeps all change state in one place. The check is a simple YAML key existence test — no new tooling needed.
**Alternatives considered**:
- Separate `approval.yaml` file: rejected — another file to track, no benefit over `.openspec.yaml`.
- Gate enforced by OpenSpec CLI (schema-level `requires.approval`): not currently supported by the CLI; would require upstream contribution and tight version coupling.
- No gate, rely on user discipline: rejected — the whole point of this change is to make the checkpoint explicit and unambiguous.

**ADR check**: Surprising without context (why write to .openspec.yaml?), real trade-off (vs separate file). → Comment in sai-1-spec wrapper explains the intent.

### D3: sai-2-apply renamed to sai-4-apply (shift all numbers)
**Decision**: All commands sai-2-implement through sai-7-accessibility are renamed to sai-3-implement through sai-8-accessibility. This is a breaking change, same class as the prior ai→sai rename.
**Rationale**: Users who have the old numbers in muscle memory will adapt quickly (one-time rename, like the ai→sai rename). Keeping a consistent integer sequence is more important than minimizing breakage for an audience that already went through one rename.
**Alternatives considered**:
- Keep old numbers and add sai-2-design as an alias: rejected — two commands with overlapping numbers is confusing and creates docs debt permanently.
- Use a letter suffix (sai-1b-design): rejected — uglier and inconsistent with the established pattern.

### D4: Audit templates always include "Not Applicable" section
**Decision**: Templates for security.md, performance.md, accessibility.md each include a mandatory "Not Applicable" section with a `justification:` placeholder. The section must be filled in even when the artifact is not applicable — it cannot be left empty.
**Rationale**: Without this, agents skip the artifact silently and reviewers have no record of whether it was intentionally omitted or forgotten. Forcing a justification creates an explicit, reviewable decision.
**Alternatives considered**:
- Optional section: rejected — too easy to skip without intention.
- External tracking (issue, PR comment): rejected — artifacts are the source of truth; external state drifts.

### D5: implementation.md artifact tracked by sai-workflow schema but not by apply
**Decision**: `implementation.md` is declared as an artifact in the schema (so it shows up in `openspec status`) but `applyRequires` is `["tasks", "implementation"]` — both are required before `sai-4-apply` runs.
**Rationale**: The implementation plan is the input to apply; requiring it before apply enforces that sai-3-implement runs first. Including it in the schema makes it visible in status.
**Note**: OpenSpec may not glob `implementation.md` by default since spec-driven only used tasks.md for apply. The schema.yaml must declare `implementation` as a tracked artifact with `outputPath: implementation.md`.

## Risks / Trade-offs

- **Breaking change for users with in-flight sai-2-implement through sai-7-accessibility invocations** → Mitigation: document migration path in AGENTS.md (same section as the ai→sai rename note).
- **Approval gate is wrapper-enforced, not CLI-enforced** → If a user bypasses sai-2-design and calls opsx:continue directly, the gate is not checked. Mitigation: AGENTS.md documents that opsx:* commands are internal; the gate comment in sai-2-design makes the intent clear.
- **Custom schema may not be auto-discovered by OpenSpec CLI** → Mitigation: verify `openspec status` resolves `sai-workflow` from `openspec/schemas/sai-workflow/schema.yaml` before finalizing tasks. If discovery requires registration, add it to config.yaml.
- **Templates diverge from actual instruction output over time** → Mitigation: templates are intentionally structural (section headers + placeholders), not content-prescriptive, so minor instruction drift does not break them.

## Migration Plan

1. Create schema directory and files.
2. Update `openspec/config.yaml` schema field.
3. Rename command files (claude/commands/ and opencode/commands/).
4. Verify `openspec status` resolves the new schema on a test change.
5. Update AGENTS.md and README.md.

In-flight changes using `spec-driven` schema continue to work as-is (schema is per-change, stored in the change's `.openspec.yaml`). Only new changes created after the config.yaml update use `sai-workflow`.

## Open Questions

- Does the OpenSpec CLI discover custom schemas from `openspec/schemas/<name>/schema.yaml` automatically, or does `config.yaml` need a `schemaPath` field? → Verify during tasks execution.
- What is the exact YAML structure of `.openspec.yaml` for the approval gate — is there a risk of colliding with reserved keys? → Read an existing `.openspec.yaml` to confirm namespace is free.
