# ADR 0003: Fetch Path Convention for Shared Command Bodies

## Status

Accepted

## Context

After extracting shared sai-* command bodies to `commands/sai/` at the project root, harness wrapper files need a Fetch directive to load the shared body at runtime. The Fetch directive path is resolved relative to the harness config root (`~/.claude/` for Claude Code, `~/.config/opencode/` for OpenCode), not relative to the project root.

Three path formats were considered:
- `@commands/<cmd>.md` — flat, no namespace; collides with future non-sai commands
- `@sai/<cmd>.md` — shorter, but diverges from the established `commands/` top-level directory
- `@commands/sai/<cmd>.md` — mirrors project layout, namespaced, consistent with `instructions/sai/` and `skills/*/`

## Decision

Use `@commands/sai/<cmd>.md` as the Fetch path in all wrapper files.

## Rationale

Mirrors the project layout (`commands/sai/` at project root) and is consistent with how other shared paths are structured (`instructions/sai/`, `skills/*/`). The `commands/` prefix namespaces command bodies separately from other config root contents.

## Consequences

- Shared body files must be installed to `<config-root>/commands/sai/` — existing users must re-run install steps.
- Changing this path after installation breaks existing installed wrappers (requires user reinstall).
- If a harness resolves `@` paths relative to CWD instead of config root, all shared bodies silently fail. No file-level mitigation available; documented as a known runtime dependency.
