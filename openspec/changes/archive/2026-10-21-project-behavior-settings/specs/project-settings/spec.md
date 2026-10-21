## ADDED Requirements

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

Every catalogue key that the project behavior settings screen shows SHALL declare a `label` and a `section`: `explore.readyToProposeLanguage` as `Ready to Propose language`, `explore.overviewLanguage` as `Change overview language`, and `explore.chatPublicLanguage` as `Chat language`, all in section `Explore`; `backlog.provider` as `Provider` in section `Backlog`; and `pr.provider` as `Provider` in section `Pull requests`. A catalogue entry MAY declare an `absent` text that the screen shows for the key when it has no value; `explore.chatPublicLanguage` SHALL declare `follow my language`. Keys the screen does not show SHALL declare no label or section.

#### Scenario: Screen keys carry labels and sections
- **WHEN** the catalogue is read
- **THEN** each of the five screen keys has the label and section above, and `explore.chatPublicLanguage` has the absent text `follow my language`

## MODIFIED Requirements

### Requirement: Read-only project settings reader

`sai/tools/project-settings.js` SHALL be a CommonJS module and CLI that uses only Node built-ins and reads `.sai/settings.jsonc` from the project root that the settings root location resolves, together with the optional `.sai/settings.local.jsonc` that overrides it key by key; these two files SHALL be its only settings sources. It SHALL be the single source of the setting id catalogue, its validation, its canonical forms, and its presentation fields, and it SHALL NOT write any file. The catalogue SHALL contain exactly `backlog.provider`, `backlog.repository`, `backlog.project`, `backlog.organization`, `pr.provider`, `pr.repository`, `pr.organization`, `pr.project`, `explore.readyToProposeLanguage`, `explore.overviewLanguage`, and `explore.chatPublicLanguage`, where a setting id is the dotted key path inside the file's top-level object. A catalogue entry MAY declare a normalization that maps a valid value to the value the reader returns. The reader SHALL NOT read `.to-backlog.json`. A `readPr` function SHALL return the `pr.*` values as a to-pr `config` object, separate from the `backlog.*` values that `readBacklog` returns.

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
