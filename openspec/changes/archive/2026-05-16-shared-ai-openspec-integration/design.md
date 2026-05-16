## Context

shared-AI is a prompt library installed as global commands in Claude Code and opencode. It currently runs two parallel, disconnected pipelines:

1. **ai-* pipeline**: `spec → plan → implement → review → quality gates → commit/PR`. Rich instructions (isolation mode, caveman, RED→GREEN, GLOSSARY, cost discipline). Artifacts land in `plans/{feature-name}/`.
2. **opsx pipeline**: `explore → propose → apply → archive`. Schema-driven lifecycle via OpenSpec CLI. Artifacts land in `openspec/changes/{name}/`. Thin instructions, no enrichment.

The overlap is in planning + implementation phases. Both produce planning artifacts and drive implementation — differently, incompatibly.

## Goals / Non-Goals

**Goals:**
- ai-* commands wrap opsx skills, adding shared-AI quality behaviors without modifying skill files
- Single artifact directory per change (`openspec/changes/{name}/`)
- OpenSpec skills remain owned and versioned by the OpenSpec CLI
- opencode platform kept in parity with Claude Code
- Graceful, actionable errors when OpenSpec is not set up

**Non-Goals:**
- Migrating existing `plans/` artifacts from active projects
- Supporting projects without OpenSpec CLI installed
- Bundling OpenSpec skills inside shared-AI
- Modifying OpenSpec CLI or its schema

## Decisions

### D1: ai-* as additive wrappers, not skill forks

**Decision:** ai-* command files `Fetch` the opsx skill content and prepend shared-AI behaviors (caveman, isolation mode, glossary, model routing). Skill files are never modified.

**Why:** OpenSpec CLI may regenerate skill files (they carry `generatedBy` metadata). Any edits to skills would be overwritten on CLI update. Keeping enrichment in the wrapper layer (which we own) avoids this fragility.

**Alternative considered:** Modify SKILL.md files directly. Rejected: version sync risk, maintenance burden.

### D2: implementation.md lives inside openspec/changes/{name}/

**Decision:** `ai-2-implement` writes `implementation.md` to the change directory alongside `proposal.md`, `design.md`, `tasks.md`. OpenSpec CLI ignores it (not in schema), but co-location keeps all change artifacts in one place.

**Why:** Avoids split state between `openspec/` and `plans/`. The CLI ignores unknown files — it doesn't error or delete them.

**Alternative considered:** Keep `implementation.md` in `plans/`. Rejected: two directories for the same change is confusing and breaks the single-source principle.

### D3: ai-3-apply does NOT wrap opsx:apply user command

**Decision:** `ai-3-apply` reads `implementation.md` directly and uses the openspec CLI for status/context. It does not invoke `opsx:apply`.

**Why:** `opsx:apply` reads `tasks.md` (high-level). `ai-3-apply` reads `implementation.md` (granular, produced by the more capable model in `ai-2-implement`). Different inputs, different behavior. Wrapping would discard the granular plan.

**Alternative considered:** Wrap opsx:apply. Rejected: implementation.md would be ignored, defeating ai-2-implement.

### D4: Skills stay in OpenSpec, not in shared-AI

**Decision:** shared-AI install script does not copy OpenSpec skills to `~/.claude/skills/`. Users must run `openspec init` in each project.

**Why:** Skills require the OpenSpec CLI binary to function. If binary is required, `openspec init` is a trivial additional step. Bundling skills in shared-AI would create version desync between skill files and CLI behavior.

**Alternative considered:** Bundle skills globally as fallback. Rejected: desync risk, no real benefit.

### D5: spec.common.md adapted for wrapper context

**Decision:** Create `instructions/spec.propose.md` — a variant of `spec.common.md` adapted for use inside the `ai-1-spec` wrapper. Removes sections that conflict with or duplicate opsx:propose skill instructions.

**Why:** Fetching the full `spec.common.md` inside an opsx skill context would create contradictory instructions (two sets of output templates, two workflows). A targeted variant avoids confusion without losing the quality content.

## Risks / Trade-offs

**Risk: OpenSpec skill updates break wrapper assumptions**
→ Mitigation: wrappers use `Fetch` (content injection), not tight coupling. If skill structure changes significantly, review wrapper Fetch order. Track openspec releases.

**Risk: implementation.md ignored by openspec status**
→ Mitigation: acceptable. ai-3-apply reads it directly. Document clearly that `openspec status` shows schema artifacts only.

**Risk: Breaking change for users with existing plans/**
→ Mitigation: document migration path in AGENTS.md. Old commands kept in git history. No auto-migration (too risky).

**Risk: opencode parity drift**
→ Mitigation: changes to `claude/commands/` must be mirrored to `opencode/commands/` in the same commit. Enforce via PR checklist.

## Migration Plan

1. Update `claude/commands/` — all ai-* wrappers
2. Mirror to `opencode/commands/`
3. Create `instructions/spec.propose.md`
4. Update `INSTALL.claude.md` + `INSTALL.opencode.md` with OpenSpec prerequisites
5. Update `AGENTS.md` pipeline diagram and artifact paths
6. Update `README.md`
7. No `plans/` migration — document as breaking change

## Open Questions

- None. All decisions resolved in exploration phase.
