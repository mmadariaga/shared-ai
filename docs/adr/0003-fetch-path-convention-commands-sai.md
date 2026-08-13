# ADR 0003: Fetch Path Convention for Shared Command Bodies

## Status

Superseded by [ADR 0004](./0004-source-layout-and-install-path-restructure.md)

## Context

After extracting shared sai-* command bodies to `commands/sai/` at the project root, harness wrapper files need a Fetch directive to load the shared body at runtime. The Fetch directive path is resolved relative to the harness config root (`~/.claude/` for Claude Code, `~/.config/opencode/` for OpenCode), not relative to the project root.

Three path formats were considered:
- `@commands/<cmd>.md` — flat, no namespace; collides with future non-sai commands
- `@sai/<cmd>.md` — shorter, but diverges from the established `commands/` top-level directory
- `@commands/sai/<cmd>.md` — mirrors project layout, namespaced, consistent with `instructions/sai/` and `skills/*/`

## Decision

`@sai/commands/<name>.md` remains the canonical Fetch path for command cards: routed cards live under `sai/commands/{phase}/{coordinator,worker,invocation}.md`, utility cards under `sai/commands/{name}/body.md`, and every command card carries its command-local phase content as `sai/commands/{name}/instructions.md` with neighboring `.template.md` files (e.g. `sai/commands/review/review-report.template.md`, `sai/commands/implement/implementation-plan.template.md`, `sai/commands/pr/pr-body.template.md`). Phase content is folded into the command directories; there is no maintained `sai/instructions/` tree. Three root exceptions install at the `sai` destination root: `sai/change-overview.md`, `sai/adr-index.template.md`, and `sai/ddr-index.template.md`.

## Rationale

The `sai/` root groups all sai-owned payload separately from harness wrapper packages (`commands/claude/`, `commands/opencode/`). Folding each phase's instruction and template into its command directory co-locates every surface one `/sai-*` command loads, so fetch resolution, install projection, and documentation all resolve through the single recursive `sai-commands` projection (which installs `sai/commands/**/*.md` for both harnesses). The files that are shared rather than command-owned — the change-overview generation contract and the project-agnostic ADR/DDR index templates — stay at the `sai/` root as explicit root exceptions with their own projections. `@sai/commands/<name>.md` mirrors this source layout and aligns with the `sai/commands/` install destination under the harness config root.

## Amendment 3

**Date:** 2026-08-13
**Change:** `fold-sai-instructions-templates` — folded `sai/instructions/` into the command directories

**Original decision:** `@sai/commands/<cmd>.md` — each wrapper entered a per-harness boot adapter (`@sai/adapters/claude/boot.md` for Claude Code, `@sai/adapters/opencode/boot.md` for opencode) which loaded the neutral `@sai/command-runner.md` protocol and selected the requested command card; phase content and shared templates lived under a maintained `sai/instructions/` tree, with the canonical project-agnostic index templates at `sai/instructions/_templates/adr-index.md` and `sai/instructions/_templates/ddr-index.md`.

**Original rationale:** The `sai/` root grouped all sai-owned payload (command bodies under `sai/commands/`, instructions under `sai/instructions/`) separately from harness wrapper packages. `@sai/commands/<cmd>.md` mirrored the source layout and aligned with the `sai/commands/` install destination, consistent with `@sai/instructions/` used by command bodies.

**Reason for amendment:** The `sai/instructions/` tree was folded into the command directories it serves. Phase content now lives at `sai/commands/{name}/instructions.md`, report/plan templates are co-located `.template.md` files beside their owning card, and the shared change-overview instruction plus the ADR/DDR index templates moved to the `sai/` root as `sai/change-overview.md`, `sai/adr-index.template.md`, and `sai/ddr-index.template.md`. The former `sai/instructions/` destinations are retired in `sai/install-manifest.json` and remain historical.

## Consequences

- Shared body files must be installed to `<config-root>/commands/sai/` — existing users must re-run install steps.
- Changing this path after installation breaks existing installed wrappers (requires user reinstall).
- If a harness resolves `@` paths relative to CWD instead of config root, all shared bodies silently fail. No file-level mitigation available; documented as a known runtime dependency.

## Amendment

**Date:** 2026-05-21
**Change:** `restructure-vendor-paths` refactor

**Original decision:** `@commands/sai/<cmd>.md`

**Original rationale:** Mirrors the project layout (`commands/sai/` at project root) and is consistent with how other shared paths are structured (`instructions/sai/`, `skills/*/`). The `commands/` prefix namespaces command bodies separately from other config root contents.

**Reason for amendment:** The `restructure-vendor-paths` refactor moved `commands/sai/` to `sai/commands/` and changed the install destination from `<config-root>/commands/sai/` to `<config-root>/sai/commands/`. The new `@sai/commands/<cmd>.md` path mirrors the new source layout.

## Amendment 2

**Date:** 2026-08-13
**Change:** `sai-command-runner-layout` card-class restructure

**Original decision:** `@sai/commands/<cmd>.md` — each wrapper fetched the shared command body directly.

**Reason for amendment:** Wrappers no longer fetch a shared body directly; they enter a per-harness boot adapter. Each wrapper fetches `@sai/adapters/claude/boot.md` (Claude Code) or `@sai/adapters/opencode/boot.md` (opencode), the boot loads the neutral `@sai/command-runner.md` protocol first, and the boot selects the requested command card. Command content now lives in card folders under `sai/commands/`: routed cards (`{spec,design,implement,review,security,performance,accessibility}/{coordinator,worker,invocation}.md`) and utility cards (`{apply,archive,backfill,commit,explore,pr,status,worktree}/body.md`). Both card classes are installed to the matching `sai/commands/` destination under each harness config root. The direct `@sai/commands/<cmd>.md` body-fetch convention this ADR recorded is historical.
