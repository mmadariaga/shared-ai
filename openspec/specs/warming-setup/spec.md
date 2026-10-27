# warming-setup Specification

## Purpose
TBD - created by archiving change cache-warming-setup. Update Purpose after archive.

## Requirements

### Requirement: Cache warming section rows

The `Cache warming` section in `bin/warming-setup.js` SHALL edit the single `warming` value of `.sai/settings.jsonc` under the prompt title `Cache warming:`. It SHALL list, under a `-- Role defaults --` header, the rows `Default for agent` and `Default for subagent`, then, per role with at least one row, a `-- Rules for <role> --` header followed by one row for each guided pair of that role and then one row for each stored rule of that role that matches no guided pair, followed by a `Done` row. A guided pair with a stored rule for the same provider, model, and role SHALL show that rule; a guided pair without one SHALL show `<provider>/<model>: no rule`. A stored rule that matches no guided pair SHALL carry the note ` (no installed file uses it)`. An enabled entry SHALL show `every <interval> min, up to <max> min`; an absent entry, `false`, or `"enabled": false` SHALL show `off`.

#### Scenario: New project shows both defaults off
- **WHEN** `.sai/settings.jsonc` holds no `warming` value and the user opens the section
- **THEN** the section lists `Default for agent: off` and `Default for subagent: off`, so nothing warms until the user enables an entry

#### Scenario: Unmatched stored rule stays listed
- **WHEN** the stored `warming` value holds a rule for a model that no installed SAI file declares
- **THEN** the section lists that rule with the note `(no installed file uses it)`, lets the user edit or remove it, and a save keeps it unless the user removed it

### Requirement: Guided warming pairs from installed files

The post-setup flow SHALL build the guided pairs of the section from the effective `model` frontmatter of installed SAI files of both harnesses, without writing any installed file. Command and utility targets SHALL feed the `agent` role; worker and helper agent targets SHALL feed the `subagent` role. On Claude Code the provider SHALL be `anthropic` and the model the frontmatter value; on opencode the value SHALL split at the first `/` into provider and model. An effort annotation and a `#` variant suffix SHALL be removed. Each (provider, model) pair SHALL appear at most once per role, sorted by `<provider>/<model>`. A target whose effective setting has no usable provider and model, including a target without a `model` key, SHALL contribute no pair.

#### Scenario: Pairs are deduplicated per role without suffixes
- **WHEN** two installed Claude Code commands declare `opus` with different efforts and an installed opencode command declares `opencode-go/deepseek-v4.1-flash#high`
- **THEN** the `agent` role lists `anthropic/opus` once and `opencode-go/deepseek-v4.1-flash` once

#### Scenario: Target without a model contributes no pair
- **WHEN** an installed command file has no `model` key in its frontmatter
- **THEN** that command adds no guided pair to the `agent` role

### Requirement: Enabling an entry asks for validated timings

Choosing a row SHALL offer `Enable` and `Off`, and for a stored rule also `Remove rule`. `Enable` SHALL ask for the interval and then the maximum in minutes, each pre-filled with the entry's current value or, when the entry is not enabled, with `4` and `30`; an empty answer SHALL keep the pre-filled value. When the values are not positive numbers or the maximum is below the interval, the section SHALL report the rejection and ask for both values again, so it never stores an invalid entry. Enabling a guided pair without a rule SHALL add a rule with that provider, model, and role.

#### Scenario: Empty answers keep the pre-filled defaults
- **WHEN** the user enables `Default for agent` with no stored value and gives empty answers to both prompts
- **THEN** the agent default becomes `{ "interval": 4, "max": 30 }`

#### Scenario: Invalid timings are asked again
- **WHEN** the user enters a maximum smaller than the interval
- **THEN** the section reports the rejection and asks for the interval and the maximum again

### Requirement: Turning entries off and removing rules

`Off` SHALL set a role default to `false` and a rule to its provider, optional model, and role with `"enabled": false`. `Remove rule` SHALL delete the stored rule from the value.

#### Scenario: Default and rule switched off, rule removed
- **WHEN** the user sets a default to `Off`, sets one rule to `Off`, and removes another rule, then chooses `Done`
- **THEN** the saved value holds `false` for that default, `"enabled": false` for the first rule, and no entry for the removed rule

### Requirement: Saving only the warming key of the base file

Choosing `Done` SHALL save only when at least one edit changed the value compared with the stored valid value, or when the stored value was invalid and the user made an edit. The section SHALL save through `saveSettings` with `baseOnly`, changing only the `warming` key of `.sai/settings.jsonc` and keeping its other keys and comments. A session without a changing edit SHALL leave the file byte-identical. An interrupted prompt SHALL discard the edits and save nothing. When `.sai/settings.jsonc` cannot be parsed, the section SHALL report it and return without saving. Reopening the section SHALL show the stored values again.

#### Scenario: Reopening and leaving keeps the file byte-identical
- **WHEN** the user saves a value, reopens the section, and chooses `Done` without an edit
- **THEN** `.sai/settings.jsonc` stays byte-identical

#### Scenario: Interrupt discards the edits
- **WHEN** the user edits an entry and then interrupts a prompt
- **THEN** the section reports that the edits were discarded and `.sai/settings.jsonc` stays byte-identical

### Requirement: Invalid stored value and local override warnings

When the stored `warming` value is invalid, the section SHALL show the validation warning and start from empty values; a save after an edit SHALL replace the invalid value, and leaving without an edit SHALL keep the file byte-identical. When `.sai/settings.local.jsonc` defines `warming`, the section SHALL warn that the local value replaces the value it writes, and it SHALL still write only `.sai/settings.jsonc`.

#### Scenario: Invalid stored value is replaced on save
- **WHEN** `.sai/settings.jsonc` holds an invalid `warming` value and the user enables a default and chooses `Done`
- **THEN** the section showed the validation warning, started from empty values, and the save replaces the invalid value

#### Scenario: Local override is warned about
- **WHEN** `.sai/settings.local.jsonc` defines `warming` and the user saves an edit
- **THEN** the section warns that the local value replaces the written one, writes `.sai/settings.jsonc`, and leaves `.sai/settings.local.jsonc` unchanged
