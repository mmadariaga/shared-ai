# warming-setup Specification

## Purpose
TBD - created by archiving change cache-warming-setup. Update Purpose after archive.

## Requirements

### Requirement: Cache warming section rows

The `Cache warming` screen in `bin/warming-setup.js` SHALL edit the `warming` value of `.sai/settings.jsonc` for one chosen harness at a time under the prompt title `Cache warming:`. It SHALL list, under a `-- Role defaults --` header, the rows `Default for agent` and `Default for subagent`, then, per role with at least one row, a `-- Rules for <role> --` header followed by one row for each guided pair of that harness and role and then one row for each stored rule of that role in that harness's block that matches no guided pair, followed by a `Done` row. A guided pair with a stored rule for the same provider, model, and role SHALL show that rule; a guided pair without one SHALL show `<provider>/<model>: no rule`. A stored rule that matches no guided pair SHALL carry the note ` (no installed file uses it)`. An enabled entry SHALL show `every <interval> min, up to <max> min`; an absent entry, `false`, or `"enabled": false` SHALL show `off`.

#### Scenario: New project shows both defaults off

- **WHEN** `.sai/settings.jsonc` holds no `warming` value and the user opens the screen and chooses a harness
- **THEN** the screen lists `Default for agent: off` and `Default for subagent: off` for that harness, so nothing warms until the user enables an entry

#### Scenario: Unmatched stored rule stays listed

- **WHEN** the chosen harness's block holds a rule for a model that no installed SAI file declares
- **THEN** the screen lists that rule with the note `(no installed file uses it)`, lets the user edit or remove it, and a save keeps it unless the user removed it

### Requirement: Guided warming pairs from installed files

The post-setup flow SHALL build the guided pairs of the screen from the effective `model` frontmatter of installed SAI files, grouped by harness and without writing any installed file. Command and utility targets of a harness SHALL feed that harness's `agent` role; worker and helper agent targets of a harness SHALL feed its `subagent` role. On Claude Code the provider SHALL be `anthropic` and the model the frontmatter value; on opencode the value SHALL split at the first `/` into provider and model. An effort annotation and a `#` variant suffix SHALL be removed. Each (provider, model) pair SHALL appear at most once per role and harness, sorted by `<provider>/<model>`. A pair used by both harnesses SHALL appear in both groups. A target whose effective setting has no usable provider and model, including a target without a `model` key, SHALL contribute no pair.

#### Scenario: Pairs are deduplicated per role without suffixes

- **WHEN** two installed Claude Code commands declare `opus` with different efforts and an installed opencode command declares `opencode-go/deepseek-v4.1-flash#high`
- **THEN** the Claude Code `agent` group lists `anthropic/opus` once and the opencode `agent` group lists `opencode-go/deepseek-v4.1-flash` once

#### Scenario: Target without a model contributes no pair

- **WHEN** an installed command file has no `model` key in its frontmatter
- **THEN** that command adds no guided pair to the `agent` role of its harness

#### Scenario: A pair used by both harnesses appears in both groups

- **WHEN** a command of each harness declares the same provider and model
- **THEN** that pair appears in the `agent` group of both harnesses, and a rule saved under one harness does not change the other harness's effective warming

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

Choosing `Done`, or `Back` from the rows of a harness, SHALL save only when at least one edit changed that harness's value compared with the stored valid value, or when the stored value was invalid and the user made an edit. The screen SHALL save through `saveSettings` with `baseOnly`, changing only the `warming` key of `.sai/settings.jsonc` and keeping its other keys and comments, including the other harness's block and the legacy global keys. The save SHALL rebuild the whole `warming` value from what is stored and replace only the edited harness's block. A session without a changing edit SHALL leave the file byte-identical. An interrupted prompt SHALL discard the unsaved edits and save nothing. When `.sai/settings.jsonc` cannot be parsed, the screen SHALL report it and return without saving. Reopening the screen SHALL show the stored values of the chosen harness again.

#### Scenario: Reopening and leaving keeps the file byte-identical

- **WHEN** the user saves a value, reopens the screen, chooses the same harness, and leaves without an edit
- **THEN** `.sai/settings.jsonc` stays byte-identical

#### Scenario: Interrupt discards the edits

- **WHEN** the user edits an entry and then interrupts a prompt
- **THEN** the screen reports that the unsaved edits were discarded and `.sai/settings.jsonc` stays byte-identical

### Requirement: Invalid stored value and local override warnings

When the stored `warming` value is invalid, the section SHALL show the validation warning and start from empty values; a save after an edit SHALL replace the invalid value, and leaving without an edit SHALL keep the file byte-identical. When `.sai/settings.local.jsonc` defines `warming`, the section SHALL warn that the local value replaces the value it writes, and it SHALL still write only `.sai/settings.jsonc`.

#### Scenario: Invalid stored value is replaced on save
- **WHEN** `.sai/settings.jsonc` holds an invalid `warming` value and the user enables a default and chooses `Done`
- **THEN** the section showed the validation warning, started from empty values, and the save replaces the invalid value

#### Scenario: Local override is warned about
- **WHEN** `.sai/settings.local.jsonc` defines `warming` and the user saves an edit
- **THEN** the section warns that the local value replaces the written one, writes `.sai/settings.jsonc`, and leaves `.sai/settings.local.jsonc` unchanged

### Requirement: Harness choice in the Cache warming screen

The `Cache warming` screen in `bin/warming-setup.js` SHALL ask which harness to configure before it shows any row, under the prompt title `Choose a harness:` with the options `OpenCode` and `Claude Code`, and it SHALL store the chosen harness under the ids `opencode` and `claude`. The choice SHALL precede the rows of that harness on every visit, and a row of the other harness SHALL NOT appear. `Done` SHALL save the chosen harness's block and leave the screen; `Back` SHALL save that block and return to the harness choice; `Back` or `Esc` at the harness choice SHALL return to the project behavior settings screen. Cancelling at any prompt SHALL discard the unsaved edits without saving.

#### Scenario: The screen asks for a harness first

- **WHEN** the user opens the `Cache warming` screen
- **THEN** the screen asks `Choose a harness:` with the options `OpenCode` and `Claude Code` before it shows any role default or rule row

#### Scenario: Rows of the other harness never appear

- **WHEN** the user chooses one harness while the other harness has stored rules that match no installed pair
- **THEN** the screen shows only the chosen harness's role defaults and rules, and no row of the other harness appears

#### Scenario: Back saves and returns to the harness choice

- **WHEN** the user edits an entry of the chosen harness and presses `Back`
- **THEN** the screen saves that harness's block and returns to the harness choice

#### Scenario: Back at the harness choice leaves the screen

- **WHEN** the user presses `Back` or `Esc` at the harness choice without an edit
- **THEN** the screen returns to the project behavior settings screen and `.sai/settings.jsonc` stays unchanged or absent

### Requirement: Per-harness blocks and the legacy global fallback

A harness without a block of its own SHALL read the legacy top-level `warming.defaults` and `warming.rules`, and the screen SHALL show that global value when the chosen harness has no block. The first save of that harness SHALL write its block seeded from the global value, and the other harness SHALL keep reading the global value until it is edited. A save SHALL keep the other harness's block and the legacy global keys, and SHALL never delete a legacy global key automatically.

#### Scenario: A harness block is seeded from the global value

- **WHEN** `warming` holds only the top-level `defaults` and `rules` and the user edits the `claude` block
- **THEN** the screen showed the global value, the save writes that value under `warming.claude`, and `warming.opencode` keeps reading the global value until it is edited

#### Scenario: Both blocks exist and the global keys stay

- **WHEN** `warming` holds a `claude` block and the top-level global keys and the user saves the `opencode` block
- **THEN** the save keeps the `claude` block and the top-level keys in the file
