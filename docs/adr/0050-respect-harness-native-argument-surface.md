# ADR 0050: Respect each harness's native argument-surface convention for `--fast-track`

## Status

Accepted

## Context

The three harnesses do not share the same argument-surface mechanism. Claude Code and Copilot wrappers carry an `argument-hint:` frontmatter key; opencode's `sai-2-design`/`sai-4-apply` use a `**Change-name argument:** $ARGUMENTS` echo line and have no `argument-hint`; opencode's `sai-explore` has neither mechanism. Mirror discipline requires wrapper-level changes to stay consistent across harnesses, but consistency must be per-mechanism, not by forcing a foreign key into a harness that does not support it.

## Decision

Mirror discipline is honored per-mechanism:
- Claude + Copilot (6 wrappers): append the optional flag to the existing `argument-hint` (e.g. `"[change-name] [--fast-track]"`).
- opencode `sai-2-design`/`sai-4-apply`: add a one-line comment documenting the optional `--fast-track` so the wrapper stays self-describing; no echo-line change needed because the flag is body-parsed.
- opencode `sai-explore`: no hint surface exists and the flag is body-parsed — no wrapper edit required.

## Alternatives Considered

- **Force `argument-hint` into opencode wrappers** — rejected: the key is foreign to opencode's command format and would be ignored or malformed.
- **Add an echo line to opencode `sai-explore`** — rejected: the command has no change-name argument, so an echo line would be misleading.

## Consequences

- All three harnesses receive identical flag behavior from the shared body files.
- Wrapper surfaces remain native to each harness.
- Mirror discipline is preserved per-command (all wrapper edits for a command ship in the same commit).

## Related

- `openspec/changes/add-fast-track-flag/design.md` — Decision D3
- `commands/claude/sai-explore.md`, `sai-2-design.md`, `sai-4-apply.md`
- `commands/opencode/sai-explore.md`, `sai-2-design.md`, `sai-4-apply.md`
- `commands/copilot/sai-explore.prompt.md`, `sai-2-design.prompt.md`, `sai-4-apply.prompt.md`
