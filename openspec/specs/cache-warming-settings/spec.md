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

`project-settings.js` SHALL provide `warming --provider <provider> [--model <model>] --role <agent|subagent> [--json] [--cwd <root>]`, which prints `{warming, origin, warnings}` where `warming` is `{interval, max}` or `off` and `origin` is `model`, `provider`, `defaults`, or `none`. Resolution SHALL run separately for each role and SHALL take, in order, the first rule matching the provider, the model, and the role; then the first rule matching the provider and the role that has no `model`; then the role's `defaults` entry. When none applies, or the winning entry is `false` or `enabled: false`, the result SHALL be `off`. A missing provider or an unknown role SHALL fail with a usage error.

#### Scenario: Model rule wins over provider rule and defaults
- **WHEN** the setting has a rule for provider `anthropic`, model `haiku`, role `subagent`, a provider-only rule for `anthropic` and `subagent`, and a `subagent` default
- **THEN** `warming --provider anthropic --model haiku --role subagent` returns the model rule's `interval` and `max` with origin `model`

#### Scenario: Nothing warms without the setting
- **WHEN** neither settings file holds a `warming` value
- **THEN** the resolver returns `off` with origin `none`

#### Scenario: Disabled provider rule turns warming off
- **WHEN** the winning rule for the provider and role is `enabled: false`
- **THEN** the resolver returns `off` even when a role default exists

### Requirement: Warming setting documentation

`docs/project-settings.md` SHALL list `warming` in the catalogue table and SHALL describe, in a Cache warming section, the value shape, the resolution order, how the provider and model of a worker or helper derive from its installed agent `model` frontmatter on each harness, that timings are resolved again for every arm, that the settings screen does not edit `warming`, and the resolver command.

#### Scenario: Reader looks up the warming setting
- **WHEN** a user reads `docs/project-settings.md`
- **THEN** the catalogue table links `warming` to a Cache warming section with an example value and the resolver command
