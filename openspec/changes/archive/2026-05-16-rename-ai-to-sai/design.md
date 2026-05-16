## Context

The project exposes AI workflow commands across three integrations (Claude Code, GitHub Copilot, OpenCode). All commands share the prefix `/ai-*`, inherited from early development. The project is named "Shared AI", making `/sai-*` the natural prefix. Old `/ai-*` versions of the prompts still circulate, causing confusion when both are installed.

36 files need renaming across `claude/commands/`, `github/prompts/`, and `opencode/commands/`. Documentation references in `AGENTS.md`, `README.md`, `INSTALL.claude.md`, and `INSTALL.copilot.md` also need updating.

## Goals / Non-Goals

**Goals:**
- Rename every `ai-*.md` / `ai-*.prompt.md` file to `sai-*`
- Update all prose references from `/ai-` to `/sai-`
- Keep file content (command logic) unchanged

**Non-Goals:**
- Changing command behavior or prompt content
- Versioning or backwards-compat shim (old name simply disappears)
- Updating user-local aliases or shell configs (out of scope)

## Decisions

**Plain file rename, no symlinks**
Symlinks from old name → new name would maintain backwards compat but add permanent clutter. Since this is a breaking rename by design, delete old names outright.

**Bulk rename via shell script / git mv**
Doing 36 renames manually risks typos. A single loop with `git mv` preserves git history per file and is atomic within one commit.

**Update docs in same commit**
Splitting the rename and the doc update into separate commits leaves the repo in a broken state mid-history. One commit keeps things consistent.

## Risks / Trade-offs

- **Users with saved `/ai-*` shortcuts break** → Documented as BREAKING in proposal; migration is trivial (rename alias)
- **OpenCode model-variant files** (`ai-1-spec-gemini.md`, `ai-1-spec-gpt.md`, `ai-1-spec-opus.md`) need renaming too → Covered explicitly in tasks

## Migration Plan

1. Run `git mv` for all 36 command files
2. Update all prose references in docs
3. Single commit with message `rename: /ai-* commands to /sai-*`
4. No rollback strategy needed — pure rename, revert with `git revert` if required
