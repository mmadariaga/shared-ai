# project-settings-screen Specification

## Purpose
Lets a user see and edit the project settings that pre-answer command questions from the post-setup menu of `node bin/install setup`, without hand-editing `.sai/settings.jsonc`.

## Requirements

### Requirement: Value choices per setting

Selecting a row SHALL offer that id's choices. `backlog.provider` SHALL offer `ask` followed by the union of the provider ids in `skills/universal/to-backlog/providers/registry.json` and `skills/universal/from-backlog/providers/registry.json`. `pr.provider` SHALL offer `ask` followed by the provider ids in `skills/universal/to-pr/providers/registry.json`. `explore.readyToProposeLanguage` SHALL offer `ask`, `English`, and `Other language...`. `explore.overviewLanguage` SHALL offer `ask`, `English`, `none`, and `Other language...`. `explore.chatPublicLanguage` SHALL offer `follow my language`, `English`, and `Other language...`, where `follow my language` SHALL remove the key from the file that holds it, leaving the rest of that file intact. `pr.language` SHALL offer exactly `English` and `Other language...`, where `English` SHALL remove the key from the file that holds it, leaving the rest of that file intact, because an absent key reads as `English`. `experimental.changeTelemetry` SHALL offer `On` and `Off`. `Other language...` SHALL ask for a free-text language name. Every chosen or typed value SHALL be validated through the reader's catalogue: a rejected free-text entry SHALL be reported and asked again, an empty free-text entry SHALL save nothing, and an accepted value SHALL be saved in the canonical form the catalogue returns. Back from a value prompt SHALL return to the submenu without saving a change. The provider registries SHALL be read when a picker needs them, so drawing a row never fails on them.

#### Scenario: Provider choices come from the registries
- **WHEN** the user selects the `Backlog provider` row and the registries list `github`, `gitlab`, and `azuredevops`
- **THEN** the choices are `ask`, `github`, `gitlab`, and `azuredevops`

#### Scenario: Code-host choices come from the to-pr registry
- **WHEN** the user selects the `Pull requests provider` row and the to-pr registry lists `github`, `gitlab`, and `azuredevops`
- **THEN** the choices are `ask`, `github`, `gitlab`, and `azuredevops`

#### Scenario: Rejected language is asked again
- **WHEN** the user chooses `Other language...` for `explore.readyToProposeLanguage` and types `none`, then ` english `
- **THEN** the first entry is reported as rejected and the setting is saved as `English`

#### Scenario: Free-text language keeps its spelling
- **WHEN** the user types ` Español ` for `explore.readyToProposeLanguage` and chooses `none` for `explore.overviewLanguage`
- **THEN** the saved values are `Español` and `None`

#### Scenario: Follow my language removes the chat language key
- **WHEN** the stored `explore.chatPublicLanguage` is `Español` and the user chooses `follow my language`
- **THEN** the saved file no longer holds `explore.chatPublicLanguage` and is otherwise unchanged

#### Scenario: PR/MR language offers English and a typed language
- **WHEN** the user selects the `PR/MR language` row, chooses `Other language...`, and types ` español `, and later selects the row again and chooses `English`
- **THEN** the choices are `English` and `Other language...`, the first edit saves `pr.language` as `español`, and the second removes `pr.language` from the file

### Requirement: Ask is saved as a value

Choosing `ask` for an id SHALL record the string `"ask"` under that id rather than removing the key, so a comment attached to the key is kept.

#### Scenario: Ask replaces a stored provider
- **WHEN** the stored `backlog.provider` is `gitlab` with a trailing comment and the user chooses `ask`
- **THEN** the saved file differs from the previous one only in `"gitlab"` becoming `"ask"`

### Requirement: Invalid stored values

When a stored value is outside its allowed set, a submenu SHALL print the reader's warnings for its own keys when it opens and SHALL show that row as invalid, and the user SHALL be able to replace the value.

#### Scenario: Invalid provider is replaced
- **WHEN** the stored `backlog.provider` is `jira`, which no registry lists, and the user opens `Backlog and PR settings` and chooses `github`
- **THEN** the reader's warning is printed, the row shows `Backlog provider: "jira" (invalid)`, and the saved file differs only in `"jira"` becoming `"github"`

### Requirement: Injectable prompts and TTY gating

The settings editor (`createSettingsEditor`) SHALL take its single-select and free-text prompts, project path, package root, and log function as injectable parameters so tests drive it. It SHALL run only from the post-setup menu, so without a TTY it SHALL be skipped together with that menu.

#### Scenario: No TTY
- **WHEN** the post-setup menu runs without a TTY
- **THEN** it returns its non-TTY skipped outcome without prompting and without creating `.sai/`

### Requirement: Local override rows and save target

A setting that `.sai/settings.local.jsonc` holds SHALL render as an override row, even when its local value equals the base value: the base value struck through with ANSI SGR 9, then the local value, then the marker `(local)`. When styling is off, meaning standard output is not a TTY or `NO_COLOR` is set, the row SHALL read `<base> -> <local> (local)`. A base value that is absent SHALL show as the key's absence text (`ask`, or `follow my language` for `explore.chatPublicLanguage`). Choosing a value SHALL save a key that the local file holds to the local file and leave the base file unchanged, and SHALL save every other key to the base file, which is created when missing. The editor SHALL NOT create the local file. Removing a key from the local file SHALL show the base value again. Without a local file, no row SHALL show an override.

#### Scenario: Override row with styling
- **WHEN** the base file sets `backlog.provider` to `github`, the local file sets it to `gitlab`, and styling is on
- **THEN** the `Backlog provider` row shows `github` struck through, then `gitlab (local)`

#### Scenario: Override row without styling
- **WHEN** the same files are shown without a TTY or with `NO_COLOR` set
- **THEN** the row reads `github -> gitlab (local)`

#### Scenario: Local-only key shows the absence text
- **WHEN** the local file sets `explore.chatPublicLanguage` and the base file does not
- **THEN** the row shows `follow my language` struck through, followed by the local value and `(local)`

#### Scenario: Overridden key saves to the local file
- **WHEN** the user chooses a value for a key that the local file holds and a value for another key that it does not hold
- **THEN** the first key is saved to `.sai/settings.local.jsonc`, the second to `.sai/settings.jsonc`, and the local file keeps its comments

#### Scenario: Local file is never created
- **WHEN** no local file exists and the user chooses a value
- **THEN** only `.sai/settings.jsonc` is written and `.sai/settings.local.jsonc` does not exist afterwards

#### Scenario: No local file means no override rows
- **WHEN** a submenu opens without `.sai/settings.local.jsonc`
- **THEN** no row shows strikethrough or the `(local)` marker

### Requirement: Change telemetry boolean editing

The `Telemetry` row of the post-setup main menu SHALL edit `experimental.changeTelemetry` as a boolean. Its row SHALL read `Telemetry: on` when the effective value is `true`, and `Telemetry: off` when the key is absent or `false`. Selecting the row SHALL open a picker titled `Telemetry:` that offers exactly the choices `On` and `Off`, and SHALL NOT offer `ask`. Choosing `On` SHALL save `true` at once. Choosing `Off` SHALL remove the key from `.sai/settings.jsonc` when the key is saved to the base file, and SHALL save an explicit `false` when the key is saved to `.sai/settings.local.jsonc`, so that a `true` in the base file cannot apply. After the choice the user SHALL return to the main menu. A stored value that is not a boolean SHALL follow the invalid-value handling, and any choice SHALL replace it.

#### Scenario: Telemetry row shows on or off
- **WHEN** the main menu is drawn on a settings file where `experimental.changeTelemetry` is `true`, `false`, or absent
- **THEN** the row reads `Telemetry: on` for `true` and `Telemetry: off` for `false` or an absent key

#### Scenario: Telemetry offers only On and Off
- **WHEN** the user selects the `Telemetry` row
- **THEN** the prompt title is `Telemetry:` and the choices are exactly `On` and `Off`

#### Scenario: On saves true and Off removes the base key
- **WHEN** the user chooses `On`, then selects the row again and chooses `Off`
- **THEN** the first choice writes `true` to `.sai/settings.jsonc`, and the second removes `experimental.changeTelemetry` from that file and keeps its other keys

#### Scenario: Off on an absent key changes nothing
- **WHEN** `experimental.changeTelemetry` is absent and the user chooses `Off`
- **THEN** no file is written and the row still reads `Telemetry: off`

#### Scenario: Off saves an explicit false in the local file
- **WHEN** both settings files set `experimental.changeTelemetry` to `true` and the user chooses `Off`
- **THEN** `.sai/settings.local.jsonc` holds `false`, `.sai/settings.jsonc` is unchanged, and the row reads `Telemetry: on -> off (local)` without styling

#### Scenario: Non-boolean telemetry value is replaced
- **WHEN** the stored `experimental.changeTelemetry` is `"yes"`
- **THEN** the reader's warning is printed, the row shows `Telemetry: "yes" (invalid)`, choosing `On` saves `true`, and choosing `Off` removes the key

### Requirement: Section submenu contents

`bin/project-settings-screen.js` SHALL provide the `Language settings` and `Backlog and PR settings` section submenus of the post-setup menu, under the prompt titles `Language settings:` and `Backlog and PR settings:`. The `Language settings` submenu SHALL list exactly `explore.readyToProposeLanguage`, `explore.overviewLanguage`, `explore.chatPublicLanguage`, and `pr.language`, in that order; the `Backlog and PR settings` submenu SHALL list exactly `backlog.provider`, `pr.provider`, and `publication.autoApprove`, in that order. Each row SHALL read `<label>: <current value>`, where the label is the catalogue label, except that `backlog.provider` reads `Backlog provider` and `pr.provider` reads `Pull requests provider`. A submenu SHALL show no section header row and no `Done` row. The current value SHALL be read from the settings files each time the submenu is drawn: the reader's normalized value, the key's absence text (`ask`, `follow my language` for `explore.chatPublicLanguage`, `English` for `pr.language`, or `off` for `publication.autoApprove`) when the id is unset or set to `ask`, or the stored value in JSON form followed by ` (invalid)` when the stored value is outside its allowed set. `backlog.repository`, `backlog.project`, `backlog.organization`, `pr.repository`, `pr.organization`, `pr.project`, and `pr.publishAfterRun` SHALL NOT appear in any submenu. The value prompt title SHALL be `<row label>:`. The submenus SHALL read the settings files of the project path they were given, without the git top-level or main-worktree lookup.

#### Scenario: Submenu rows show current values

- **WHEN** a settings file sets only `backlog.provider` to `gitlab` and the user opens `Backlog and PR settings`, then `Language settings`
- **THEN** the first submenu rows are `Backlog provider: gitlab`, `Pull requests provider: ask`, and `Auto-approve publication: off`, and the second are `Ready to Propose language: ask`, `Change overview language: ask`, `Chat language: follow my language`, and `PR/MR language: English`, with no header row and no `Done` row

### Requirement: Immediate saving of each value choice

Choosing a value in a value picker SHALL save it at once through the settings writer, so no edit waits in memory and leaving a submenu saves or discards nothing. After a save the user SHALL stay in the same submenu, with the cursor on the edited row, and the row SHALL show the new value. Choosing the value that is already stored SHALL write no file. Leaving a value picker with Back or Esc, or leaving the `Other language...` free text empty, SHALL save nothing and return to the submenu with the previous value. A session with no saved value SHALL NOT create, write, or touch any file.

#### Scenario: A chosen value is saved at once

- **WHEN** the user opens `Backlog and PR settings`, selects `Backlog provider`, and chooses `github`
- **THEN** `.sai/settings.jsonc` holds `backlog.provider: "github"` before the submenu is drawn again, and the submenu shows `Backlog provider: github`

#### Scenario: Esc in a picker saves nothing

- **WHEN** the user opens a value picker and leaves it with Esc
- **THEN** no file is written and the submenu shows the previous value

#### Scenario: Empty language name saves nothing

- **WHEN** the user chooses `Other language...` and leaves the language name empty
- **THEN** no file is written and the submenu shows the previous value

#### Scenario: Choosing the stored value writes nothing

- **WHEN** the user chooses the value already stored, or leaves the submenu without choosing a value
- **THEN** no `.sai/` directory is created and an existing settings file keeps its content and modification time

### Requirement: Edits that cannot be saved

An unparseable `.sai/settings.jsonc` or `.sai/settings.local.jsonc` SHALL be reported when a submenu opens or the `Telemetry` row is selected, before any value prompt, naming the file, and the user SHALL return to the main menu without editing. A write error SHALL be reported, naming the error, the value SHALL stay as it was, and the user SHALL stay in the submenu. An interrupt (a null prompt answer such as Ctrl+C) SHALL close the menu; values chosen before it SHALL stay saved, because no edit is pending. In the unparseable and write-error cases both settings files SHALL stay byte-identical.

#### Scenario: Unparseable base file

- **WHEN** a submenu opens on a settings file containing `{ nope`
- **THEN** it reports `Cannot edit .sai/settings.jsonc` before any value prompt, the file is unchanged, and the main menu is presented again

#### Scenario: Unparseable local file

- **WHEN** a submenu opens with a valid base file and a `.sai/settings.local.jsonc` that cannot be parsed
- **THEN** it reports `Cannot edit .sai/settings.local.jsonc` before any value prompt and neither file changes

#### Scenario: Write error keeps the user in the submenu

- **WHEN** saving a chosen value fails with a write error
- **THEN** the submenu reports that the project settings were not saved, names the error, leaves the file unchanged, and presents the same submenu again with the previous value

### Requirement: Auto-approve publication boolean editing

The `Auto-approve publication` row of the `Backlog and PR settings` submenu SHALL edit `publication.autoApprove` as a boolean. Its row SHALL read `Auto-approve publication: on` when the effective value is `true`, and `Auto-approve publication: off` when the key is absent or `false`. Selecting the row SHALL open a picker titled `Auto-approve publication:` that offers exactly the choices `On` and `Off`. Choosing `On` SHALL save `true` at once and keep the user in the submenu. Choosing `Off` SHALL remove the key from `.sai/settings.jsonc` when the key is saved to the base file, keeping the file's other keys, and SHALL save an explicit `false` when the key is saved to `.sai/settings.local.jsonc`. The settings writer SHALL refuse to save a value that is not a boolean, with a problem that says `publication.autoApprove` must be true or false. A stored non-boolean value SHALL show its JSON form followed by ` (invalid)`, and opening the submenu SHALL print the reader's warning.

#### Scenario: Auto-approve row shows on or off

- **WHEN** the submenu is drawn on a settings file where `publication.autoApprove` is `true`, `false`, or absent
- **THEN** the row reads `Auto-approve publication: on` for `true` and `Auto-approve publication: off` for `false` or an absent key

#### Scenario: On saves true and Off removes the base key

- **WHEN** the user chooses `On` for the row, and then chooses `Off`
- **THEN** the first choice writes `true` to `.sai/settings.jsonc` and the row reads `Auto-approve publication: on`, and the second removes `autoApprove` from that file and keeps its other keys

#### Scenario: Non-boolean value is refused and shown as invalid

- **WHEN** the writer is asked to save `"yes"` for `publication.autoApprove`, and a settings file holds `"yes"` for it
- **THEN** the save is refused with a problem matching `publication.autoApprove must be true or false`, the row reads `Auto-approve publication: "yes" (invalid)`, and opening the submenu prints a warning matching `Setting publication.autoApprove in .sai/settings.jsonc must be true or false; it reads as false`
