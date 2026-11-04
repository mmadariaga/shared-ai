# sai-fast-track-next-prompt-hint Specification

## Purpose

This capability makes completion guidance surface `--fast-track` on recommended commands that support it while keeping the hint informational only.

## Requirements

### Requirement: Completion next-prompt recommendations append a fast-track hint when the recommended command supports the flag

When a command's completion prints a next-prompt recommendation naming a follow-on command (a code span of the form `/sai-{N}-{name} {name}` or `/sai-{name} {name}`), the recommendation SHALL have the literal string ` (--fast-track)` appended immediately after the recommended-command code span — and before any remaining sentence text such as "**in a new chat** when ready." — if and only if the recommended command is a member of the fast-track set.

The fast-track set is not owned by this capability: it is the single canonical membership list defined by the `sai-fast-track-flag` capability ("The fast-track command set is the single canonical membership list" requirement in `openspec/specs/sai-fast-track-flag/spec.md`), whose membership (`sai-archive` and `sai-backfill`) is not otherwise restated here. This requirement resolves membership against that list rather than restating it as an independent source.

The hint SHALL be evaluated on the **recommended** command, not the emitting command. The emitting command does not need to support `--fast-track` itself for its completion to carry the hint. The hint is purely textual: it changes only the printed completion string and SHALL NOT alter any behavior of the emitting or recommended command. The recommended command's behavior is unchanged unless the user subsequently types the `--fast-track` flag.

The hint SHALL be single-sourced in the same shared instruction, card, or body file both harnesses fetch, so Claude Code and opencode print identical completion strings.

The only emitting location that gains the hint under this requirement, because it recommends a fast-track-set command, is the `sai/commands/backfill/coordinator.md` terminal navigation (printed after validated artifacts are written), which recommends `/sai-archive {name}`. The `sai/commands/spec/coordinator.md` completion recommends `/sai-2-design {name}`, which accepts and ignores `--fast-track`, so it carries no hint.

#### Scenario: Supported recommended command receives the hint

- **WHEN** a completion recommends a command that belongs to the canonical fast-track set
- **THEN** it places ` (--fast-track)` immediately after that recommended command's code span

#### Scenario: sai-1-spec completion carries no hint

- **WHEN** `/sai-1-spec` completes and prints ``Spec done in openspec/changes/{name}/. Review it and run `/sai-2-design {name}` in a new chat when ready.``
- **THEN** no ` (--fast-track)` is appended, because `sai-2-design` is not in the fast-track set

#### Scenario: sai-3-implement completion carries no hint

- **WHEN** `/sai-3-implement` completes
- **THEN** it ends with exactly `Implement done.` and appends no ` (--fast-track)` hint, because it recommends no follow-on command

#### Scenario: sai-backfill completion appends the hint

- **WHEN** `sai-backfill` prints its completion recommending "**Open a new chat** and run `/sai-archive {name}`."
- **THEN** the printed line appends ` (--fast-track)` after the `/sai-archive {name}` code span, because `sai-archive` is in the fast-track set

#### Scenario: sai-2-design completion does not append the hint

- **WHEN** `sai-2-design` prints its completion recommending `/sai-3-implement {name}`
- **THEN** no ` (--fast-track)` is appended, because `sai-3-implement` is not in the fast-track set

#### Scenario: sai-4-apply completion does not append the hint

- **WHEN** the command catalog is read
- **THEN** no `/sai-4-apply` command exists, so no apply completion appends the hint

#### Scenario: The hint is textual only and does not change behavior

- **WHEN** a completion line carries the ` (--fast-track)` hint and the user follows the recommendation without typing the flag
- **THEN** the recommended command runs with all its gates intact, exactly as if the hint had not been present — the hint carries no behavioral effect on its own
