## ADDED Requirements

### Requirement: Completion next-prompt recommendations append a fast-track hint when the recommended command supports the flag

When a command's `## Completion` block prints a next-prompt recommendation naming a follow-on command (a code span of the form `/sai-{N}-{name} {name}` or `/sai-{name} {name}`), the recommendation SHALL have the literal string ` (--fast-track)` appended immediately after the recommended-command code span — and before any remaining sentence text such as "**in a new chat** when ready." — if and only if the recommended command is a member of the fast-track set.

The fast-track set is not owned by this capability: it is the single canonical membership list defined by the `sai-fast-track-flag` capability ("The fast-track command set is the single canonical membership list" requirement in `openspec/specs/sai-fast-track-flag/spec.md`), currently `sai-explore`, `sai-2-design`, `sai-4-apply`, `sai-archive`. This requirement resolves membership against that list rather than restating it as an independent source.

The hint SHALL be evaluated on the **recommended** command, not the emitting command. The emitting command does not need to support `--fast-track` itself for its completion to carry the hint. The hint is purely textual: it changes only the printed completion string and SHALL NOT alter any behavior of the emitting or recommended command. The recommended command's behavior is unchanged unless the user subsequently types the `--fast-track` flag.

The hint SHALL be single-sourced in the same shared instruction / body files all three harnesses fetch, so Claude Code, opencode, and GitHub Copilot print identical completion strings.

The concrete emitting locations that gain the hint under this requirement, because each recommends a fast-track-set command, are:
- `sai/commands/sai-1-spec.md` completion → recommends `/sai-2-design {name}`
- `sai/instructions/implement-invocation.md` completion (printed after `sai-3-implement`) → recommends `/sai-4-apply {name}`
- `sai/commands/sai-backfill.md` completion → recommends `/sai-archive {name}`

#### Scenario: sai-1-spec completion appends the hint

- **WHEN** `sai-1-spec` reaches its MANDATORY STOP and prints "Spec proposal done … run `/sai-2-design {name}` **in a new chat** when ready."
- **THEN** the printed line reads "… run `/sai-2-design {name}` (--fast-track) **in a new chat** when ready.", because `sai-2-design` is in the fast-track set

#### Scenario: sai-3-implement completion appends the hint

- **WHEN** the `implement-invocation` completion prints "Implementation plan done … Review and run `/sai-4-apply {name}` **in a new chat** when ready."
- **THEN** the printed line appends ` (--fast-track)` after the `/sai-4-apply {name}` code span, because `sai-4-apply` is in the fast-track set

#### Scenario: sai-backfill completion appends the hint

- **WHEN** `sai-backfill` prints its completion recommending "**Open a new chat** and run `/sai-archive {name}`."
- **THEN** the printed line appends ` (--fast-track)` after the `/sai-archive {name}` code span, because `sai-archive` is in the fast-track set

#### Scenario: sai-2-design completion does not append the hint

- **WHEN** `sai-2-design` prints its completion recommending `/sai-3-implement {name}`
- **THEN** no ` (--fast-track)` is appended, because `sai-3-implement` is not in the fast-track set

#### Scenario: sai-4-apply completion does not append the hint

- **WHEN** `sai-4-apply` prints its completion recommending `/sai-5-review {name}`
- **THEN** no ` (--fast-track)` is appended, because `sai-5-review` is not in the fast-track set

#### Scenario: The hint is textual only and does not change behavior

- **WHEN** a completion line carries the ` (--fast-track)` hint and the user follows the recommendation without typing the flag
- **THEN** the recommended command runs with all its gates intact, exactly as if the hint had not been present — the hint carries no behavioral effect on its own
