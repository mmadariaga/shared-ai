# ADR 0009: Claude-Specific Fetch Skill at skills/claude/fetch/

## Status

Accepted

## Context

`Fetch @<subpath>` resolution paths differ per runtime: Claude Code uses `.claude/<subpath>`
and `~/.claude/<subpath>`; opencode uses `.opencode/<subpath>` and
`~/.config/opencode/<subpath>`. The two runtimes already have separate budget skills
(`skills/claude/` vs `skills/opencode/`) following this per-runtime split convention.

## Decision

Create `skills/claude/fetch/SKILL.md` as a Claude Code–specific fetch resolution skill,
separate from the opencode equivalent at `skills/opencode/fetch/SKILL.md`.
The file declares `compatibility: claude` and maps `Fetch @<subpath>` to `.claude/<subpath>`
then `~/.claude/<subpath>`.

## Alternatives Considered

| Option | Pro | Con |
|---|---|---|
| Universal skill with runtime-conditional paths | One file | No runtime-detection mechanism in a SKILL.md body; mixing path roots in one rule table is error-prone |
| Separate Claude-specific skill (chosen) | Mirrors existing per-runtime split; paths stay explicit and unambiguous | Minor duplication — two fetch skill files exist |

## Consequences

- `skills/claude/fetch/SKILL.md` is the canonical fetch resolution skill for Claude Code.
- `skills/opencode/fetch/SKILL.md` is unchanged.
- All `commands/claude/*.md` wrappers load this skill before any `@sai/` fetch directive.
- `INSTALL.claude.md` copies the skill to `~/.claude/skills/fetch/SKILL.md` (always overwritten on reinstall, no skip guard — same pattern as budget-explorer and budget-executor).

## Related

- `skills/opencode/fetch/SKILL.md` — the opencode equivalent
- ADR 0003 — Fetch path convention for commands/sai
