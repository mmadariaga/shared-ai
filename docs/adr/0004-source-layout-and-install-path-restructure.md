# ADR 0004: Source Layout and Install Path Restructure for sai-* Commands and Skills

## Status

Accepted

## Context

The repository source layout and installation paths had grown inconsistent:

- `commands/sai/` held shared command bodies, but `commands/` also held harness wrappers (`claude/commands/` and `opencode/commands/`), mixing two different abstractions under one root.
- `instructions/sai/` held shared instruction content, but the `instructions/` root was otherwise unused.
- `claude/` and `opencode/` directories at repo root contained only `commands/` subdirectories, wasting a directory level.
- `opencode/opencode.jsonc` sat under a harness-named directory even though it is a generic config sample.
- ADR 0002 documented `explorer.claude.md` and `explorer.opencode.md` living under `~/.claude/instructions/sai/`, but opencode wrappers do not search that path, making the ADR partially inapplicable once opencode wrappers were introduced.
- Budget skills were loaded individually in wrapper files (3 `Fetch` directives), creating duplication across harnesses and increasing maintenance surface.

## Decision

1. **Move sai payload under a single `sai/` root:**
   - `commands/sai/` → `sai/commands/`
   - `instructions/sai/` → `sai/instructions/`

2. **Move harness wrappers under a single `commands/` root:**
   - `claude/commands/` → `commands/claude/`
   - `opencode/commands/` → `commands/opencode/`

3. **Move generic config samples to `configs/`:**
   - `opencode/opencode.jsonc` → `configs/opencode.jsonc`

4. **Update install destinations to mirror the new source layout:**
   - `<config-root>/commands/sai/` → `<config-root>/sai/commands/`
   - `<config-root>/instructions/sai/` → `<config-root>/sai/instructions/`

5. **Replace per-harness resolver instruction files with per-harness skills and a universal aggregator:**
   - Remove `explorer.claude.md` and `explorer.opencode.md` as standalone instruction files.
   - Introduce `skills/universal/budget/SKILL.md` as an aggregator that loads the three budget skills (`budget-explorer`, `budget-executor`, `token-efficient-languages`).
   - Harness-specific budget skills remain in `skills/claude/budget-explorer/`, `skills/opencode/budget-explorer/`, etc.
   - Wrapper files (`commands/claude/budget.md`, `commands/opencode/budget.md`) now load a single skill: `Fetch @skills/budget/SKILL.md`.

## Alternatives Considered

- **Keep `commands/sai/` and `instructions/sai/` as-is** — Preserves the mixing of harness wrappers and shared bodies under `commands/`. Rejected because it makes the repo layout harder to explain and the install paths asymmetric.
- **Use harness-prefixed roots (`claude-commands/`, `opencode-commands/`)** — Avoids the `commands/` nesting but creates non-standard directory names. Rejected.
- **Keep individual `Fetch` directives for budget skills in every wrapper** — Avoids the aggregator indirection but duplicates the skill list in every harness wrapper. Rejected because adding or reordering skills would require touching N wrapper files.

## Consequences

- **Users must reinstall.** The install destinations changed; existing installations at `<config-root>/commands/sai/` or `<config-root>/instructions/sai/` will not be found by updated wrappers.
- **Fetch paths in wrappers changed.** All sai-* wrappers now use `@sai/commands/<cmd>.md` instead of `@commands/sai/<cmd>.md`. This is the amended decision already recorded in ADR 0003.
- **Per-harness resolver files are no longer instruction files.** `explorer.claude.md` / `explorer.opencode.md` are now skills. ADR 0002 remains historically accurate for the period when those files existed as instructions, but no longer describes the current architecture.
- **Budget skill loading is centralized.** The universal `budget` skill acts as a single point of truth for which budget sub-skills are active. New budget sub-skills can be added in one place.
- **Mirror discipline remains in force.** Any change to `commands/claude/` must still be mirrored to `commands/opencode/` in the same commit (and vice versa). The restructure does not relax this rule.

## Related

- ADR 0001 — Still valid; per-harness separation is now achieved via `skills/claude/` vs `skills/opencode/` rather than via separate instruction files.
- ADR 0002 — Partially obsolete. The decision to place both harness files under `~/.claude/instructions/sai/` no longer applies because those files no longer exist in that form.
- ADR 0003 — Amended. The decision (`@sai/commands/<cmd>.md`) is correct, but the Consequences section still mentions the old install path `<config-root>/commands/sai/`. This ADR supersedes that path detail.
