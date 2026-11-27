# project-settings Specification

## Purpose
TBD - created by archiving change project-settings-backlog. Update Purpose after archive.

## Requirements

### Requirement: Read-only project settings reader

`sai/tools/project-settings.js` SHALL be a CommonJS module and CLI that uses only Node built-ins and reads `.sai/settings.jsonc` from the project root that the settings root location resolves, together with the optional `.sai/settings.local.jsonc` that overrides it key by key; these two files SHALL be its only settings sources. It SHALL be the single source of the setting id catalogue, its validation, its canonical forms, and its presentation fields, and it SHALL NOT write any file. The catalogue SHALL contain exactly `warming`, `experimental.changeTelemetry`, `backlog.provider`, `backlog.repository`, `backlog.project`, `backlog.organization`, `pr.provider`, `pr.repository`, `pr.organization`, `pr.project`, `explore.readyToProposeLanguage`, `explore.overviewLanguage`, and `explore.chatPublicLanguage`, where a setting id is the dotted key path inside the file's top-level object, except `warming`, whose whole object value is one setting. A catalogue entry MAY declare a normalization that maps a valid value to the value the reader returns. The reader SHALL NOT read `.to-backlog.json`. A `readPr` function SHALL return the `pr.*` values as a to-pr `config` object, separate from the `backlog.*` values that `readBacklog` returns.

#### Scenario: Missing settings file
- **WHEN** neither `.sai/settings.jsonc` nor `.sai/settings.local.jsonc` exists in the project root
- **THEN** the reader returns no values, `source: absent`, and no warnings, so every catalogue question stays a normal question.

#### Scenario: Legacy file is not a source
- **WHEN** the project root contains `.to-backlog.json` with a valid `provider` and no `.sai/settings.jsonc`
- **THEN** the reader returns no values, `source: absent`, and no warnings.

#### Scenario: Nested key resolves to a dotted id
- **WHEN** the file contains `{"backlog": {"provider": "gitlab"}}` and `gitlab` is a supplied provider id
- **THEN** the reader returns `backlog.provider` with the value `gitlab` and `source: setting`.

#### Scenario: Nested explore key resolves to a dotted id
- **WHEN** the file contains `{"explore": {"overviewLanguage": "Español"}}`
- **THEN** the reader returns `explore.overviewLanguage` with the value `Español` and `source: setting`.

#### Scenario: Code-host keys are read separately from backlog keys
- **WHEN** the file sets `backlog.provider` to `github` and `pr.provider`, `pr.repository`, `pr.organization`, and `pr.project` to `gitlab`, `g/r`, `o`, and `p`
- **THEN** `readPr` returns the four `pr.*` values and `readBacklog` still returns `github` as the provider.

#### Scenario: Warming object is one setting
- **WHEN** the file contains a valid `warming` object with `defaults` and `rules`
- **THEN** the reader returns it as the single `warming` value rather than as dotted ids

#### Scenario: Change telemetry key resolves to a dotted id
- **WHEN** the file contains `{"experimental": {"changeTelemetry": true}}`
- **THEN** the reader returns `experimental.changeTelemetry` with the value `true` and `source: setting`

### Requirement: JSONC parsing

The reader SHALL parse the settings file as JSON after removing line comments, block comments, and trailing commas before a closing brace or bracket, and SHALL leave string contents, including comment markers inside strings, unchanged. When the file cannot be read or parsed, the reader SHALL return one warning naming the file and the error and SHALL return no values. A top-level value that is not an object SHALL produce one warning and no values.

#### Scenario: Comment markers inside strings
- **WHEN** a value such as `"https://gitlab.example/group/repo"` contains `//` and the file also has line comments, block comments, and trailing commas
- **THEN** the reader returns the string unchanged and ignores the comments and trailing commas.

#### Scenario: Unparseable file
- **WHEN** `.sai/settings.jsonc` contains invalid JSONC
- **THEN** the reader returns exactly one warning naming `.sai/settings.jsonc` and the parse error, and every setting stays a normal question.

### Requirement: Per-key validation

The reader SHALL skip a key whose value is a string that equals `ask` case-insensitively after trimming. It SHALL ignore an id that is not in the catalogue with a warning. It SHALL drop a catalogue value that is not a non-empty string with a warning naming the id, except `warming`, whose value SHALL be an object validated by its own rules and dropped with a warning when invalid, and `experimental.changeTelemetry` and `publication.autoApprove`, whose values SHALL be booleans and dropped with a warning that they must be true or false otherwise. It SHALL drop a `backlog.provider` value that is not among the backlog provider ids supplied by the caller with a warning listing the allowed ids, and SHALL drop a `pr.provider` value that is not among the to-pr provider ids supplied by the caller with a warning listing the allowed ids. It SHALL apply each id's own value rules, and SHALL return a valid value through the id's normalization when the catalogue declares one. An invalid or unknown key SHALL NOT affect the other valid keys. The catalogue SHALL hold no copy of either provider list.

#### Scenario: Unknown id and invalid value
- **WHEN** the file contains a valid `backlog.repository`, an unknown `backlog.type`, and a `backlog.provider` that is not a supplied provider id
- **THEN** the reader returns only `backlog.repository` and one warning for each of the other two keys.

#### Scenario: Invalid code-host provider
- **WHEN** the file sets `pr.provider` to `jira` and `pr.repository` to `g/r`, and the supplied to-pr provider ids are `github` and `gitlab`
- **THEN** `readPr` returns only `pr.repository` and a warning that `pr.provider` must be one of `github, gitlab`.

#### Scenario: Ask keeps the normal question
- **WHEN** `backlog.provider` is `"ask"`
- **THEN** the reader returns no value for `backlog.provider` and no warning for it.

#### Scenario: Ask matches case-insensitively
- **WHEN** `explore.readyToProposeLanguage` is `"ASK"`, `explore.overviewLanguage` is `" Ask "`, and `backlog.provider` is `"Ask"`
- **THEN** the reader returns no value and no warning for each of the three ids, with `source: absent`.

#### Scenario: Invalid warming value does not affect other keys
- **WHEN** the file holds an invalid `warming` object and a valid `backlog.repository`
- **THEN** the reader drops `warming` with a warning and still returns `backlog.repository`

#### Scenario: Non-boolean change telemetry value is dropped
- **WHEN** the file sets `experimental.changeTelemetry` to `"yes"`
- **THEN** the reader returns no value for `experimental.changeTelemetry` and a warning that it must be true or false

### Requirement: Single-setting CLI

The CLI `get <id> [--json] [--cwd <root>] [--providers <id,id>] [--pr-providers <id,id>]` SHALL print one JSON object `{value, source, warnings}`, plus `notices` when the reader used the main worktree's settings file, where `value` is the validated and normalized setting or `null` and `source` is `setting` or `absent`. `--providers` SHALL supply the ids that validate `backlog.provider` and `--pr-providers` the ids that validate `pr.provider`. An id outside the catalogue or an unknown argument SHALL print an error object and exit with code 2.

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

The `to-backlog` resolve operation and the `from-next-backlog-item` selection SHALL return the reader's warnings in a `warnings` array on every result, including failed or pending results. The `from-backlog` resolve and read operations SHALL return the reader's warnings in a `warnings` array on their non-error outputs only; their `status: error` output carries no settings warnings. These tools SHALL return one notice `Project setting backlog.<field>: <value>` in a `notices` array for each configured field the result took from the settings, preceded by the reader's main-worktree notice when the reader used the main worktree's file. A field supplied explicitly, or a provider selected by an explicit repository address, SHALL produce no `Project setting` notice. The `to-backlog`, `from-next-backlog-item`, and `from-backlog` skills SHALL print the tool's `warnings` and `notices` verbatim, one line each.

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

The catalogue SHALL include `explore.readyToProposeLanguage`, `explore.overviewLanguage`, and `explore.chatPublicLanguage`. All three SHALL accept any non-empty string as a language name, SHALL trim it, and SHALL NOT check it against a list of languages. The values `English` and `none` SHALL match case-insensitively and SHALL be returned as `English` and `None`. In `explore.overviewLanguage`, `none` SHALL resolve to `None`. In `explore.readyToProposeLanguage` and `explore.chatPublicLanguage`, `none` SHALL be an invalid value that is dropped with a warning naming the id. An empty or non-string value SHALL be dropped with a warning for any of the three ids.

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

#### Scenario: Chat language accepts any language but none
- **WHEN** `explore.chatPublicLanguage` is `" Euskara "`, and in another file `"none"`
- **THEN** the reader returns `Euskara` for the first, and `value: null` with a warning that the setting must name a language for the second

### Requirement: Settings root location

Every settings reader (`to-backlog.js`, `from-backlog.js`, `from-next-backlog-item.js`, `to-pr.js`, and the `get` CLI) SHALL locate `.sai/settings.jsonc` through one shared function. Inside a git repository it SHALL use the git top-level directory of the working directory. When that directory has no settings file and belongs to a linked worktree, it SHALL use the main worktree, derived from `git rev-parse --git-common-dir`, when the main worktree has a settings file, and SHALL return a notice naming the main worktree. A worktree's own settings file SHALL win over the main worktree's file. Outside a git repository it SHALL read the working directory only. A caller MAY pass `locate: false` to read the given directory without this lookup; the project settings screen SHALL do so.

#### Scenario: Subdirectory finds the top-level settings
- **WHEN** a reader runs from a subdirectory of a git repository whose top-level directory holds `.sai/settings.jsonc`
- **THEN** the reader returns the values of that file.

#### Scenario: Linked worktree inherits the main worktree's settings
- **WHEN** a reader runs in a linked worktree without `.sai/settings.jsonc` and the main worktree has one
- **THEN** the reader returns the main worktree's values and a notice that names the main worktree.

#### Scenario: Worktree's own file wins
- **WHEN** both a linked worktree and its main worktree have `.sai/settings.jsonc`
- **THEN** the reader returns the linked worktree's values and no notice.

#### Scenario: Outside git only the working directory is read
- **WHEN** a reader runs outside a git repository in a directory without `.sai/settings.jsonc` whose parent has one
- **THEN** the reader returns no values.

### Requirement: Local settings override file

The reader SHALL read an optional `.sai/settings.local.jsonc` from the same `.sai/` directory that supplies `.sai/settings.jsonc` under the settings root location, and from `.sai/` at the resolved project root when no base file exists. It SHALL parse the local file with the same JSONC parsing and validate it with the same catalogue, and SHALL merge it over the base file key by key: a known id that the local file holds SHALL replace the base value, even when the local value equals the base value, is `ask`, or is invalid, and every other key SHALL keep the base value. `readSettings` SHALL return the merged `values`, an `origins` map giving `base` or `local` for every merged key, and the separate `baseValues` and `localValues`, and the `get` CLI SHALL return the merged value. An unknown id or an invalid value in the local file SHALL produce a warning naming `.sai/settings.local.jsonc`. A local file that cannot be read or parsed SHALL contribute no value and SHALL produce one warning naming `.sai/settings.local.jsonc` that says the local overrides are ignored and the base values apply. Without a local file the result SHALL equal the base file alone.

#### Scenario: Local key overrides the base key
- **WHEN** the base file sets `backlog.provider` to `github` and `explore.overviewLanguage` to `English`, and the local file sets `backlog.provider` to `gitlab`
- **THEN** the reader returns `backlog.provider` as `gitlab` with origin `local` and `explore.overviewLanguage` as `English` with origin `base`

#### Scenario: Equal local value is still an override
- **WHEN** the local file sets a key to the same value as the base file
- **THEN** the reader reports that key with origin `local`

#### Scenario: Local ask or invalid value replaces the base value
- **WHEN** the base file sets a key to a valid value and the local file sets the same key to `ask` or to an invalid value
- **THEN** the reader returns no value for that key, so its question stays normal

#### Scenario: Unparseable local file leaves the base file in force
- **WHEN** `.sai/settings.local.jsonc` contains invalid JSONC and the base file is valid
- **THEN** the reader returns the base values and one warning naming `.sai/settings.local.jsonc` that says the local overrides are ignored and the base values apply

#### Scenario: Unknown id in the local file
- **WHEN** the local file contains an id that is not in the catalogue
- **THEN** the id is ignored with a warning naming `.sai/settings.local.jsonc`

#### Scenario: Local file without a base file
- **WHEN** the project root has `.sai/settings.local.jsonc` and no `.sai/settings.jsonc`
- **THEN** the reader returns the local values with origin `local`

#### Scenario: Linked worktree reads the local file beside the base file it uses
- **WHEN** a reader runs in a linked worktree without its own settings file and the main worktree holds both the base file and the local file
- **THEN** the reader merges the main worktree's local file over the main worktree's base file

#### Scenario: No local file
- **WHEN** `.sai/settings.local.jsonc` does not exist
- **THEN** the reader returns the base file's values with every origin `base` and no additional warning

### Requirement: Catalogue presentation fields

Every catalogue key that the post-setup menu shows as a value row SHALL declare a `label`: `explore.readyToProposeLanguage` as `Ready to Propose language`, `explore.overviewLanguage` as `Change overview language`, `explore.chatPublicLanguage` as `Chat language`, `backlog.provider` and `pr.provider` as `Provider`, `pr.language` as `PR/MR language`, `publication.autoApprove` as `Auto-approve publication`, and `experimental.changeTelemetry` as `Telemetry`. The grouping of these rows into submenus is fixed by `bin/project-settings-screen.js`, so no catalogue entry SHALL declare a `section`. A catalogue entry MAY declare an `absent` text that is shown for the key when it has no value; `explore.chatPublicLanguage` SHALL declare `follow my language`, `pr.language` SHALL declare `English`, and `experimental.changeTelemetry` and `publication.autoApprove` SHALL declare `off`. The `warming` entry, which the menu does not show as a value row, SHALL declare the label `Cache warming` and the absent text `off` for the cache warming section of the setup flow. Every other key the menu does not show SHALL declare no label.

#### Scenario: Screen keys carry labels and no sections
- **WHEN** the catalogue is read
- **THEN** each of the eight menu keys has the label above and no `section`, `experimental.changeTelemetry` has the label `Telemetry`, `explore.chatPublicLanguage` has the absent text `follow my language`, `pr.language` has the label `PR/MR language` and the absent text `English`, `publication.autoApprove` has the label `Auto-approve publication` and the absent text `off`, and `experimental.changeTelemetry` has the absent text `off`

#### Scenario: Warming carries presentation fields for its section
- **WHEN** the catalogue is read
- **THEN** `warming` has the label `Cache warming`, the absent text `off`, and no `section`

### Requirement: Plan publication answer setting

The catalogue SHALL hold `pr.publishAfterRun`, the answer to the start-of-run publication question of `/sai-plan` and `/sai-build`, the round-3 publication question that `/sai-explore` asks once per crystallized set, and the recommendation of the standalone `/sai-plan` build hint. The reader SHALL accept `yes` or `no` compared case-insensitively after trimming and SHALL return the value in lower case; `draft` SHALL NOT be a value of this key. `ask` SHALL keep the normal question like any other key, and an absent key SHALL mean `ask`. Any other value SHALL be dropped with a warning that it must be yes, no, or ask. A `yes` or a `no` SHALL count from either settings file, the local file winning key by key. For the build hint, `no` SHALL give `--publish no`, and `yes`, `ask`, an absent key, and an invalid value SHALL give the bare `--publish` as a recommendation; the `/sai-explore` Plan route SHALL always hand `--build-publish` over and SHALL NOT read this key for the hint. The key SHALL NOT be a `/to-pr` destination field, so `readPr` SHALL NOT return it, and the project settings screen SHALL NOT list it.

#### Scenario: Yes is normalized

- **WHEN** `get pr.publishAfterRun --json --cwd <root>` runs in a project whose `.sai/settings.local.jsonc` sets `pr.publishAfterRun` to `" YES "`
- **THEN** the CLI prints `value: yes` with `source: setting` and no warnings

#### Scenario: Invalid value warns

- **WHEN** the settings file sets `pr.publishAfterRun` to `"later"`
- **THEN** the reader returns no value for it and a warning that it must be yes, no, or ask

#### Scenario: Not a destination field

- **WHEN** the settings file sets `pr.publishAfterRun` and `pr.repository`
- **THEN** `readPr` returns `pr.repository` and does not return `pr.publishAfterRun`

#### Scenario: Base-file yes is the answer

- **WHEN** `get pr.publishAfterRun --json --cwd <root>` runs in a project whose `.sai/settings.jsonc` sets `pr.publishAfterRun` to `yes` and no local file holds the key
- **THEN** the CLI prints `value: yes` with `source: setting` and no warnings

#### Scenario: The build hint recommendation follows the setting

- **WHEN** a standalone `/sai-plan` completes with no `--build-publish` and `pr.publishAfterRun` reads `no`
- **THEN** the closing build hint names `--publish no`, and a `yes`, `ask`, absent, or invalid value names the bare `--publish`

### Requirement: PR/MR language setting

The catalogue SHALL hold `pr.language`, the language of the PR/MR title subject and of the description that SAI drafts. The reader SHALL accept any non-empty string as a language name, SHALL trim it, SHALL NOT check it against a list of languages, and SHALL return `English` in canonical form when the value equals `English` case-insensitively. `none` compared case-insensitively, an empty string, and a non-string value SHALL be invalid and dropped with a warning naming `pr.language` that says the draft falls back to English. An absent key SHALL mean English. The key SHALL NOT be a `/to-pr` destination field, so `readPr` SHALL NOT return it. A catalogue entry MAY declare a `fallback` text that words what an invalid value leads to in its warning; an entry without one SHALL keep the warning ending `its question stays normal`.

#### Scenario: Language name is normalized
- **WHEN** the settings file sets `pr.language` to `" eNGLISH "` or to `" Español "`
- **THEN** `get pr.language` returns `English` or `Español` respectively, with `source: setting` and no warnings

#### Scenario: None is invalid
- **WHEN** the settings file sets `pr.language` to `"none"`
- **THEN** the reader returns no value and the warning `Setting pr.language in .sai/settings.jsonc must name a language, not none; the draft falls back to English.`

#### Scenario: Other keys keep their warning ending
- **WHEN** the settings file sets `explore.chatPublicLanguage` to `"none"`
- **THEN** its warning still ends with `its question stays normal.`

#### Scenario: Not a destination field of readPr
- **WHEN** the settings file sets `pr.language` and `pr.provider`
- **THEN** `readPr` returns `pr.provider` and does not return `pr.language`

### Requirement: Publication auto-approval setting

The catalogue SHALL hold `publication.autoApprove`, a boolean shared by `/to-pr` and `/to-backlog`. An absent key SHALL read as `false`. A value that is not a boolean, `ask` included, SHALL give no value, and a non-boolean value other than `ask` SHALL be dropped with a warning naming `publication.autoApprove` that says it must be true or false and that it reads as false and every publication approval is asked. A `true` SHALL count from either settings file, the local file winning key by key. `sai/tools/project-settings.js` SHALL export `autoApprove(options)`, which SHALL return `true` only when the merged value of `publication.autoApprove` is the boolean `true`, and `false` otherwise.

#### Scenario: Absent key reads as false

- **WHEN** no settings file sets `publication.autoApprove`
- **THEN** `get('publication.autoApprove')` returns `{ value: null, source: 'absent', warnings: [] }` and `autoApprove` returns `false`

#### Scenario: True grants and a local false overrides it

- **WHEN** `.sai/settings.local.jsonc` sets `publication.autoApprove` to `true`, then sets it to `false` while `.sai/settings.jsonc` sets it to `true`, and then only `.sai/settings.jsonc` sets it to `true`
- **THEN** `autoApprove` returns `true` for the first state, `false` for the second, and `true` for the third, and no read carries a consent warning

#### Scenario: Non-boolean value reads as false with a warning

- **WHEN** the settings file sets `publication.autoApprove` to `"yes"`, `1`, `"true"`, or `null`
- **THEN** the reader returns no value, its warnings match `Setting publication.autoApprove in .sai/settings.jsonc must be true or false; it reads as false`, and `autoApprove` returns `false`

### Requirement: Publication consent comes from either settings file

A granting value of a publication consent key (`publication.autoApprove: true` or `pr.publishAfterRun: yes`) SHALL count from `.sai/settings.jsonc` and from `.sai/settings.local.jsonc` alike: `readSettings` SHALL merge both keys like every other key, so that a key the local file holds wins over the same key in the base file in both directions. A local `false` or `no` SHALL turn a base grant off, and a local `true` or `yes` SHALL grant over a base `false` or `no`. `sai/tools/project-settings.js` SHALL NOT export `CONSENT_IDS`, `grants`, or `readAutoApprove`, `readSettings` SHALL return no `consentWarnings` map, and no read of either key SHALL carry a warning that a value grants consent only from the local file.

#### Scenario: Base-file grant is the merged value
- **WHEN** `.sai/settings.jsonc` sets `pr.publishAfterRun` to `yes` and `publication.autoApprove` to `true`, and no local file holds either key
- **THEN** `get('pr.publishAfterRun')` returns `yes` and `get('publication.autoApprove')` returns `true`, both with origin `base` and no warnings

#### Scenario: Local value overrides a base grant
- **WHEN** `.sai/settings.jsonc` sets `publication.autoApprove` to `true` and `.sai/settings.local.jsonc` sets it to `false`
- **THEN** the merged value of `publication.autoApprove` is `false` with origin `local`, and `autoApprove` returns `false`

#### Scenario: Local grant overrides a base restricting value
- **WHEN** `.sai/settings.jsonc` sets `pr.publishAfterRun` to `no` and `.sai/settings.local.jsonc` sets it to `yes`
- **THEN** `get('pr.publishAfterRun')` returns `yes`

#### Scenario: No consent warning on any read
- **WHEN** both settings files set `publication.autoApprove` to `true` and `get` reads `publication.autoApprove`, `pr.publishAfterRun`, and `pr.language`
- **THEN** none of the results carries a warning naming consent, and the module exports neither `CONSENT_IDS` nor `readAutoApprove`
