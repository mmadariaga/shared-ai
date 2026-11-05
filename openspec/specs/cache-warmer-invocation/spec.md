# cache-warmer-invocation Specification

## Purpose
Define explicit cache-warmer invocation and deterministic interval, local target, and fixed closing-time resolution.

## Requirements

### Requirement: Explicit provider-agnostic invocation

The cache-warmer skill SHALL activate only at the user's explicit request, remain in the current conversation, and leave the provider, model, subscription, and configuration unchanged. It SHALL require no OpenSpec setup and SHALL NOT inspect or query those provider settings.

#### Scenario: Explicit invocation with complete arguments
- **WHEN** the user invokes `/sai-cache-warmer 30 min 18:00` with a same-day target still within its closing margin
- **THEN** the helper resolves a thirty-minute interval and a local closing time of 18:01 without redundant input questions.

### Requirement: Deterministic interval and local target resolution

The helper SHALL accept a positive interval in seconds, minutes, or hours, with bare numbers interpreted as minutes, and local targets in `HH:mm`, `YYYY-MM-DD HH:mm`, or `now + Nh` form. It SHALL reject invalid intervals and dates, retain valid values while correcting other inputs, and fix closing time at the resolved target plus one minute.

#### Scenario: Invalid target retains interval
- **WHEN** the supplied interval is `30 min` and the target is invalid
- **THEN** preparation requests only the target and retains the valid thirty-minute interval.

#### Scenario: Relative target survives interval correction
- **WHEN** a relative target has resolved and the user later corrects a missing or invalid interval
- **THEN** preparation preserves the originally resolved target instant including its seconds and milliseconds rather than recomputing it from the later time.

#### Scenario: Target replacement invalidates the saved instant
- **WHEN** a user supplies a different target while correcting inputs
- **THEN** preparation resolves the new target instead of reusing the old target's saved instant.

#### Scenario: Invalid calendar date
- **WHEN** a supplied date does not represent the requested local calendar date and time
- **THEN** preparation requests a valid target rather than silently accepting a normalized date.

### Requirement: Resolved closing state

Successful preparation SHALL return a fixed interval and closing instant for the entire activity. Explicitly dated targets SHALL need no implicit-day confirmation, including targets whose closing margin has already passed.

#### Scenario: Explicit past target
- **WHEN** an explicitly dated target plus one minute has already passed
- **THEN** preparation supplies the resolved state and the wait helper finishes without waiting.

### Requirement: Command wrapper loads the cache-warmer skill on both harnesses

The system SHALL ship a `/sai-cache-warmer` command wrapper for Claude Code (`commands/claude/sai-cache-warmer.md`) and for opencode (`commands/opencode/sai-cache-warmer.md`). Each wrapper SHALL read `sai-cache-warmer/SKILL.md` from the project-local harness skills root first (`.claude/skills/` or `.opencode/skills/`) and from the user-global root second (`~/.claude/skills/` or `~/.config/opencode/skills/`), follow it in the current conversation, and pass `$ARGUMENTS` unchanged as the invocation input. When neither copy exists, the wrapper SHALL report that the sai-cache-warmer skill is not installed and stop. The wrapper SHALL read `SKILL.md` directly rather than invoke the skill through the harness skill tool, so the skill's explicit-only activation is preserved.

#### Scenario: Explicit command follows the skill unchanged
- **WHEN** the user invokes `/sai-cache-warmer` with or without arguments on Claude Code or opencode
- **THEN** the wrapper follows the installed `sai-cache-warmer` skill in the current conversation with the invocation input passed through unchanged.

#### Scenario: Project-local copy takes precedence
- **WHEN** both the project-local and the user-global copy of `sai-cache-warmer/SKILL.md` exist
- **THEN** the wrapper reads the project-local copy.

#### Scenario: Skill is not installed
- **WHEN** neither the project-local nor the user-global copy of `sai-cache-warmer/SKILL.md` exists
- **THEN** the wrapper reports that the sai-cache-warmer skill is not installed and stops.
