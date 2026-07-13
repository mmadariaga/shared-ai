## ADDED Requirements

### Requirement: Claude Code post-install summary

When the user selects Claude Code and `installClaude()` returns without error, the installer SHALL print three summary lines naming the populated base directories under `<claude-base>`, in the order:

- `Claude commands installed to: <claude-base>/commands`
- `Claude SAI commands/instructions installed to: <claude-base>/sai`
- `Claude skills installed to: <claude-base>/skills`

`<claude-base>` is the resolved Claude Code base directory (e.g. `~/.claude/` on Unix, `%USERPROFILE%\.claude\` on Windows). The summary lines SHALL be printed after `installClaude()` returns and before the shared post-install reminder. They SHALL be printed in `main()` (the same placement as the existing Copilot summary block), never inside `installClaude()`, so the install function stays pure I/O. The summary format SHALL match the existing Copilot summary style (template-literal `console.log` of a harness-prefixed label and the resolved full path).

#### Scenario: Claude branch prints three summary lines
- **WHEN** the user selects Claude Code and `installClaude()` returns without error
- **THEN** the installer prints exactly three summary lines naming `<claude-base>/commands`, `<claude-base>/sai`, and `<claude-base>/skills`, in that order, before the shared post-install reminder

#### Scenario: Claude summary lines mirror the Copilot style
- **WHEN** the installer prints the Claude summary lines
- **THEN** each line follows the existing Copilot summary style (label of the form `<Harness> <thing> installed to: <full-path>`), with `Harness = "Claude"` and `thing` taken from `{commands, SAI commands/instructions, skills}`

### Requirement: Opencode post-install summary

When the user selects Opencode and `installOpencode()` and `copyOpencodeConfig()` return without error, the installer SHALL print three summary lines naming the populated base directories under `<opencode-base>`, in the order:

- `Opencode commands installed to: <opencode-base>/commands`
- `Opencode SAI commands/instructions installed to: <opencode-base>/sai`
- `Opencode skills installed to: <opencode-base>/skills`

`<opencode-base>` is the resolved Opencode base directory (e.g. `~/.config/opencode/` on Unix, `%USERPROFILE%\.config\opencode\` on Windows). The summary lines SHALL be printed after `installOpencode()` and `copyOpencodeConfig()` return and before the shared post-install reminder. They SHALL be printed in `main()` (the same placement as the existing Copilot summary block), never inside `installOpencode()`, so the install function stays pure I/O. The summary format SHALL match the existing Copilot summary style.

#### Scenario: Opencode branch prints three summary lines
- **WHEN** the user selects Opencode and `installOpencode()` and `copyOpencodeConfig()` return without error
- **THEN** the installer prints exactly three summary lines naming `<opencode-base>/commands`, `<opencode-base>/sai`, and `<opencode-base>/skills`, in that order, before the shared post-install reminder

#### Scenario: Opencode summary lines mirror the Copilot style
- **WHEN** the installer prints the Opencode summary lines
- **THEN** each line follows the existing Copilot summary style (label of the form `<Harness> <thing> installed to: <full-path>`), with `Harness = "Opencode"` and `thing` taken from `{commands, SAI commands/instructions, skills}`

### Requirement: Asymmetric summary count across harnesses is intentional

The Claude Code branch SHALL print three summary lines and the Opencode branch SHALL print three summary lines. The GitHub Copilot branch SHALL continue to print four summary lines (prompts, SAI, skills, agents). The slight asymmetry is intentional — summaries are emitted only for the directories the harness actually populates. The shared post-install reminder `Reminder: run 'npx github:mmadariaga/shared-ai setup' in each project to configure the SAI workflow.` SHALL continue to be printed once at the end of `main()`, regardless of which harnesses were selected.

#### Scenario: Copilot branch continues to print four summary lines
- **WHEN** the user selects GitHub Copilot
- **THEN** the installer prints exactly four summary lines (prompts / SAI / skills / agents) in the same shape and order as the existing implementation, with no behavioral change to the Copilot branch

#### Scenario: Summary placement is after the install functions and before the reminder
- **WHEN** any of the Claude, Opencode, or Copilot branches complete
- **THEN** the branch's summary lines are printed after the branch's install function(s) return and before the shared post-install reminder, so the final line of `main()` is always the reminder

#### Scenario: Multi-harness selection prints summaries in if-block order
- **WHEN** the user selects multiple harnesses (e.g. Claude Code AND Opencode, or all three)
- **THEN** the installer prints each selected harness's summary lines in the if-block evaluation order (Claude Code first, then Opencode, then GitHub Copilot) before the shared post-install reminder
- **THEN** the final line of `main()` is still the shared post-install reminder, regardless of which harnesses were selected
