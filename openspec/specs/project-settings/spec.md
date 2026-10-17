# project-settings Specification

## Purpose
TBD - created by archiving change project-settings-backlog. Update Purpose after archive.

## Requirements

### Requirement: Read-only project settings reader

`sai/tools/project-settings.js` SHALL be a CommonJS module and CLI that uses only Node built-ins and reads `.sai/settings.jsonc` from the project root that the settings root location resolves, its only settings source. It SHALL be the single source of the setting id catalogue, its validation, and its canonical forms, and it SHALL NOT write any file. The catalogue SHALL contain exactly `backlog.provider`, `backlog.repository`, `backlog.project`, `backlog.organization`, `pr.provider`, `pr.repository`, `pr.organization`, `pr.project`, `explore.readyToProposeLanguage`, and `explore.overviewLanguage`, where a setting id is the dotted key path inside the file's top-level object. A catalogue entry MAY declare a normalization that maps a valid value to the value the reader returns. The reader SHALL NOT read `.to-backlog.json`. A `readPr` function SHALL return the `pr.*` values as a to-pr `config` object, separate from the `backlog.*` values that `readBacklog` returns.

#### Scenario: Missing settings file
- **WHEN** `.sai/settings.jsonc` does not exist in the project root
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

### Requirement: JSONC parsing

The reader SHALL parse the settings file as JSON after removing line comments, block comments, and trailing commas before a closing brace or bracket, and SHALL leave string contents, including comment markers inside strings, unchanged. When the file cannot be read or parsed, the reader SHALL return one warning naming the file and the error and SHALL return no values. A top-level value that is not an object SHALL produce one warning and no values.

#### Scenario: Comment markers inside strings
- **WHEN** a value such as `"https://gitlab.example/group/repo"` contains `//` and the file also has line comments, block comments, and trailing commas
- **THEN** the reader returns the string unchanged and ignores the comments and trailing commas.

#### Scenario: Unparseable file
- **WHEN** `.sai/settings.jsonc` contains invalid JSONC
- **THEN** the reader returns exactly one warning naming `.sai/settings.jsonc` and the parse error, and every setting stays a normal question.

### Requirement: Per-key validation

The reader SHALL skip a key whose value is a string that equals `ask` case-insensitively after trimming. It SHALL ignore an id that is not in the catalogue with a warning. It SHALL drop a catalogue value that is not a non-empty string with a warning naming the id, SHALL drop a `backlog.provider` value that is not among the backlog provider ids supplied by the caller with a warning listing the allowed ids, and SHALL drop a `pr.provider` value that is not among the to-pr provider ids supplied by the caller with a warning listing the allowed ids. It SHALL apply each id's own value rules, and SHALL return a valid value through the id's normalization when the catalogue declares one. An invalid or unknown key SHALL NOT affect the other valid keys. The catalogue SHALL hold no copy of either provider list.

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
