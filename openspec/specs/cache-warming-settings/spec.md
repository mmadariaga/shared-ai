# cache-warming-settings Specification

## Purpose
TBD - created by archiving change subagent-cache-warming-core. Update Purpose after archive.

## Requirements

### Requirement: Warming project setting

The project settings catalogue in `sai/tools/project-settings.js` SHALL accept one `warming` id whose value is an object with only the keys `defaults` and `rules`. `defaults` SHALL hold at most one entry per role (`agent`, `subagent`), each either `false` or an object with `interval` and `max`. Each `rules` entry SHALL carry a nonempty `provider`, an optional nonempty `model`, a `role`, and either `interval` and `max` or `enabled: false` with no `interval` or `max`, and no other key. `interval` and `max` SHALL be positive numbers of minutes, with `max` at least `interval`. Model ids SHALL be values, never keys. An invalid `warming` value SHALL be dropped with a warning, and the value in `.sai/settings.local.jsonc` SHALL replace the whole committed `warming` value, as for any key.

#### Scenario: Valid warming value is accepted
- **WHEN** `.sai/settings.jsonc` holds `warming` with `defaults.agent` `{ "interval": 4, "max": 30 }`, `defaults.subagent` `false`, and a rule `{ "provider": "opencode-go", "role": "subagent", "enabled": false }`
- **THEN** the reader accepts the value without a warning

#### Scenario: Max below interval is rejected
- **WHEN** a `warming` entry carries a `max` smaller than its `interval`
- **THEN** the reader drops the `warming` value with a warning that names the entry, and nothing warms

#### Scenario: Unknown rule key is rejected
- **WHEN** a `warming` rule carries a key other than `provider`, `model`, `role`, `interval`, `max`, or `enabled`
- **THEN** the reader drops the `warming` value with a warning that names the unknown key

### Requirement: Effective warming resolver

`project-settings.js` SHALL provide `warming --provider <provider> [--model <model>] --role <agent|subagent> [--json] [--cwd <root>]`, which prints `{warming, origin, warnings}` where `warming` is `{interval, max}` or `off` and `origin` is `model`, `family`, `provider`, `defaults`, or `none`. Resolution SHALL run separately for each role and SHALL take, in order, the first rule matching the provider, the model, and the role; then, for provider `anthropic` only, the first rule matching the provider and the role whose `model` equals the model family of the requested model; then the first rule matching the provider and the role that has no `model`; then the role's `defaults` entry. The model family SHALL be derived by pattern from a model id of the form `claude-<family>-...` or `claude-<family>`, where `<family>` is lowercase letters, with no import from `bin/`; an id of another shape, an absent model, or a provider other than `anthropic` SHALL have no family and SHALL skip the family step. When none applies, or the winning entry is `false` or `enabled: false`, the result SHALL be `off`. A missing provider or an unknown role SHALL fail with a usage error.

#### Scenario: Model rule wins over provider rule and defaults
- **WHEN** the setting has a rule for provider `anthropic`, model `haiku`, role `subagent`, a provider-only rule for `anthropic` and `subagent`, and a `subagent` default
- **THEN** `warming --provider anthropic --model haiku --role subagent` returns the model rule's `interval` and `max` with origin `model`

#### Scenario: Nothing warms without the setting
- **WHEN** neither settings file holds a `warming` value
- **THEN** the resolver returns `off` with origin `none`

#### Scenario: Disabled provider rule turns warming off
- **WHEN** the winning rule for the provider and role is `enabled: false`
- **THEN** the resolver returns `off` even when a role default exists

#### Scenario: Family rule applies to a full Claude runtime id
- **WHEN** the setting has an `anthropic` rule for model `opus` and an `anthropic` provider-only rule for the same role, and no rule names `claude-opus-5-6`
- **THEN** `warming --provider anthropic --model claude-opus-5-6` for that role returns the `opus` rule's timings with origin `family`

#### Scenario: Exact model rule wins over the family rule
- **WHEN** the setting has `anthropic` rules for both `claude-opus-5-5` and `opus` in the same role
- **THEN** the resolver for model `claude-opus-5-5` returns the `claude-opus-5-5` rule with origin `model`

#### Scenario: Id without a family skips the family step
- **WHEN** the requested model is `claude-3-5-sonnet-20241022`, `Claude-opus-5`, `gpt-5`, or absent, or the provider is not `anthropic`
- **THEN** no `opus` rule applies through the family step and resolution continues with the provider rule

### Requirement: Warming setting documentation

`docs/project-settings.md` SHALL list `warming` in the catalogue table and SHALL describe, in a Cache warming section, the value shape, the resolution order including the model-family step for provider `anthropic`, the `family` origin, how the provider and model of a worker or helper derive from its installed agent `model` frontmatter on each harness, that timings are resolved again for every arm, that the project behavior settings screen does not edit `warming` while the `Cache warming` section of the setup flow does, how that section lists role defaults, guided rules, and unmatched rules, and the resolver command.

#### Scenario: Reader looks up the warming setting
- **WHEN** a user reads `docs/project-settings.md`
- **THEN** the catalogue table links `warming` to a Cache warming section with an example value and the resolver command

#### Scenario: Reader learns how to edit warming in setup
- **WHEN** a user reads the Cache warming section of `docs/project-settings.md`
- **THEN** it names the `Cache warming` post-setup menu action, the role defaults and guided rules it edits, and that it writes only the `warming` key of `.sai/settings.jsonc`
