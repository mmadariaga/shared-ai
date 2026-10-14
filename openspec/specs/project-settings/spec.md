# project-settings Specification

## Purpose
TBD - created by archiving change project-settings-backlog. Update Purpose after archive.

## Requirements

### Requirement: Read-only project settings reader

`sai/tools/project-settings.js` SHALL be a CommonJS module and CLI that uses only Node built-ins and reads `.sai/settings.jsonc` from the supplied project root. It SHALL be the single source of the setting id catalogue and its validation, and it SHALL NOT write any file. The catalogue SHALL contain exactly `backlog.provider`, `backlog.repository`, `backlog.project`, `backlog.organization`, `explore.readyToProposeLanguage`, and `explore.overviewLanguage`, where a setting id is the dotted key path inside the file's top-level object. A catalogue entry MAY declare a normalization that maps a valid value to the value the reader returns.

#### Scenario: Missing settings file
- **WHEN** neither `.sai/settings.jsonc` nor `.to-backlog.json` exists in the project root
- **THEN** the reader returns no values, `source: absent`, and no warnings, so every catalogue question stays a normal question.

#### Scenario: Nested key resolves to a dotted id
- **WHEN** the file contains `{"backlog": {"provider": "gitlab"}}` and `gitlab` is a supplied provider id
- **THEN** the reader returns `backlog.provider` with the value `gitlab` and `source: setting`.

#### Scenario: Nested explore key resolves to a dotted id
- **WHEN** the file contains `{"explore": {"overviewLanguage": "Español"}}`
- **THEN** the reader returns `explore.overviewLanguage` with the value `Español` and `source: setting`.

### Requirement: JSONC parsing

The reader SHALL parse the settings file as JSON after removing line comments, block comments, and trailing commas before a closing brace or bracket, and SHALL leave string contents, including comment markers inside strings, unchanged. When the file cannot be read or parsed, the reader SHALL return one warning naming the file and the error and SHALL return no values. A top-level value that is not an object SHALL produce one warning and no values.

#### Scenario: Comment markers inside strings
- **WHEN** a value such as `"https://gitlab.example/group/repo"` contains `//` and the file also has line comments, block comments, and trailing commas
- **THEN** the reader returns the string unchanged and ignores the comments and trailing commas.

#### Scenario: Unparseable file
- **WHEN** `.sai/settings.jsonc` contains invalid JSONC
- **THEN** the reader returns exactly one warning naming `.sai/settings.jsonc` and the parse error, and every setting stays a normal question.

### Requirement: Per-key validation

The reader SHALL skip a key whose value is a string that equals `ask` case-insensitively after trimming. It SHALL ignore an id that is not in the catalogue with a warning. It SHALL drop a catalogue value that is not a non-empty string with a warning naming the id, and SHALL drop a `backlog.provider` value that is not among the provider ids supplied by the caller with a warning listing the allowed ids. It SHALL apply each id's own value rules, and SHALL return a valid value through the id's normalization when the catalogue declares one. An invalid or unknown key SHALL NOT affect the other valid keys. The catalogue SHALL hold no copy of the provider list.

#### Scenario: Unknown id and invalid value
- **WHEN** the file contains a valid `backlog.repository`, an unknown `backlog.type`, and a `backlog.provider` that is not a supplied provider id
- **THEN** the reader returns only `backlog.repository` and one warning for each of the other two keys.

#### Scenario: Ask keeps the normal question
- **WHEN** `backlog.provider` is `"ask"`
- **THEN** the reader returns no value for `backlog.provider` and no warning for it.

#### Scenario: Ask matches case-insensitively
- **WHEN** `explore.readyToProposeLanguage` is `"ASK"`, `explore.overviewLanguage` is `" Ask "`, and `backlog.provider` is `"Ask"`
- **THEN** the reader returns no value and no warning for each of the three ids, with `source: absent`.

### Requirement: Legacy `.to-backlog.json` transition

When `.sai/settings.jsonc` is absent and `.to-backlog.json` exists, the reader SHALL read the legacy object's fields as `backlog.*` ids under the same validation, SHALL return a deprecation warning, and SHALL report `source: legacy` when at least one value is valid. A legacy `type` key SHALL produce an unknown-setting warning rather than an error. When `.sai/settings.jsonc` exists, readable or not, the reader SHALL ignore `.to-backlog.json` and SHALL return a warning that it is ignored.

#### Scenario: Only the legacy file exists
- **WHEN** only `.to-backlog.json` exists with a valid `provider` and a `type` key
- **THEN** the reader returns `backlog.provider` with `source: legacy`, a deprecation warning, and an unknown-setting warning for `backlog.type`.

#### Scenario: Unreadable settings file wins over the legacy file
- **WHEN** `.sai/settings.jsonc` exists but cannot be parsed and `.to-backlog.json` is valid
- **THEN** the reader returns no values, a warning that `.to-backlog.json` is ignored, and the parse warning.

### Requirement: Single-setting CLI

The CLI `get <id> [--json] [--cwd <root>] [--providers <id,id>]` SHALL print one JSON object `{value, source, warnings}`, where `value` is the validated and normalized setting or `null` and `source` is `setting`, `legacy`, or `absent`. An id outside the catalogue or an unknown argument SHALL print an error object and exit with code 2.

#### Scenario: Reading a configured provider
- **WHEN** `get backlog.provider --json --cwd <root>` runs in a project whose settings file sets `backlog.provider`
- **THEN** the CLI prints the value with `source: setting` and the warnings collected while reading.

#### Scenario: Absent setting
- **WHEN** `get backlog.project` runs in a project whose settings file has no `backlog.project`
- **THEN** the CLI prints `value: null` and `source: absent`.

#### Scenario: Reading the explore language ids
- **WHEN** `get explore.readyToProposeLanguage --json --cwd <root>` and `get explore.overviewLanguage --json --cwd <root>` run in a project that sets them to `english` and `none`
- **THEN** the CLI prints `English` and `None` with `source: setting` and no warnings.

#### Scenario: Unknown explore id
- **WHEN** `get explore.itemThree --json --cwd <root>` runs
- **THEN** the CLI exits with code 2.

### Requirement: Settings warnings and notices in backlog tool output

The `to-backlog` resolve operation and the `from-next-backlog-item` selection SHALL return the reader's warnings in a `warnings` array on every result, including failed or pending results. The `from-backlog` resolve and read operations SHALL return the reader's warnings in a `warnings` array on their non-error outputs only; their `status: error` output carries no settings warnings. These tools SHALL return one notice `Project setting backlog.<field>: <value>` in a `notices` array for each configured field the result took from the settings. A field supplied explicitly, or a provider selected by an explicit repository address, SHALL produce no notice. The `to-backlog`, `from-next-backlog-item`, and `from-backlog` skills SHALL print the tool's `warnings` and `notices` verbatim, one line each.

#### Scenario: Setting fills an unresolved destination field
- **WHEN** `to-backlog` resolves a destination whose provider came only from `backlog.provider`
- **THEN** the output contains the notice `Project setting backlog.provider: <value>`.

#### Scenario: Explicit address outranks the setting
- **WHEN** an explicit repository address selects the provider that `backlog.provider` also names
- **THEN** the output contains no notice for `backlog.provider`.

#### Scenario: Warnings survive a failed resolution
- **WHEN** the settings file is invalid and the `to-backlog` resolution or the `from-next-backlog-item` selection then fails
- **THEN** the failed result still carries the settings warnings.

### Requirement: Explore language setting values

The catalogue SHALL include `explore.readyToProposeLanguage` and `explore.overviewLanguage`. Both SHALL accept any non-empty string as a language name, SHALL trim it, and SHALL NOT check it against a list of languages. The values `English` and `none` SHALL match case-insensitively and SHALL be returned as `English` and `None`. In `explore.overviewLanguage`, `none` SHALL resolve to `None`. In `explore.readyToProposeLanguage`, `none` SHALL be an invalid value that is dropped with a warning naming the id. An empty or non-string value SHALL be dropped with a warning for either id.

#### Scenario: Language names and keywords normalize
- **WHEN** the settings file sets `explore.readyToProposeLanguage` to `" Español "` and `explore.overviewLanguage` to `"NONE"`
- **THEN** the reader returns `Español` and `None` with `source: setting` and no warnings

#### Scenario: English matches case-insensitively
- **WHEN** both explore ids are set to a case variant of `english`
- **THEN** the reader returns `English` for both ids

#### Scenario: none is invalid for the Ready to Propose language
- **WHEN** `explore.readyToProposeLanguage` is `"none"`
- **THEN** the reader returns `value: null` and a warning that the setting must name a language

#### Scenario: Empty overview language is invalid
- **WHEN** `explore.overviewLanguage` is `""`
- **THEN** the reader returns `value: null` and a warning that the value must be a nonempty string
