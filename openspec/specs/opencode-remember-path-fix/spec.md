# Spec: Fix OpenCode sai-1-spec remember.md path

## MODIFIED requirements

### Requirement: Harness-consistent remember.md fetch

The `opencode/commands/sai-1-spec.md` wrapper SHALL fetch `remember.md` from the OpenCode instructions path (`~/.config/opencode/instructions/sai/remember.md`), not the Claude path.

#### Scenario: OpenCode wrapper uses correct path

- **WHEN** `sai-1-spec` is invoked in OpenCode
- **THEN** `remember.md` is fetched from `~/.config/opencode/instructions/sai/remember.md`
- **AND** no fetch references `~/.claude/instructions/sai/`
