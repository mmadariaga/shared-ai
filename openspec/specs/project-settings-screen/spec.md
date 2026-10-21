# project-settings-screen Specification

## Purpose
Lets a user see and edit the project settings that pre-answer command questions from the post-setup menu of `node bin/install setup`, without hand-editing `.sai/settings.jsonc`.

## Requirements

### Requirement: Project settings screen contents

The `Project behavior settings` screen in `bin/project-settings-screen.js` SHALL list exactly `explore.readyToProposeLanguage`, `explore.overviewLanguage`, `explore.chatPublicLanguage`, `backlog.provider`, and `pr.provider`, in that order, each as a row `<label>: <current value>` using the catalogue label, followed by a `Done` row. A section header row `-- <section> --` SHALL precede the first key of each catalogue section (`Explore`, `Backlog`, `Pull requests`); a header row SHALL be non-selectable, so the cursor skips it and it can never be chosen. The current value SHALL be the value edited in this session. Otherwise it SHALL be the reader's normalized value, the key's absence text (`ask`, or `follow my language` for `explore.chatPublicLanguage`) when the id is unset or set to `ask`, or the stored value in JSON form followed by ` (invalid)` when the stored value is outside its allowed set. `backlog.repository`, `backlog.project`, `backlog.organization`, `pr.repository`, `pr.organization`, and `pr.project` SHALL NOT appear on the screen. The value prompt title SHALL be `<label>:`. The screen SHALL read the settings files of the project path it was given, without the git top-level or main-worktree lookup.

#### Scenario: Rows show current values
- **WHEN** the screen opens on a settings file that sets only `backlog.provider` to `gitlab`
- **THEN** the rows are `-- Explore --`, `Ready to Propose language: ask`, `Change overview language: ask`, `Chat language: follow my language`, `-- Backlog --`, `Provider: gitlab`, `-- Pull requests --`, `Provider: ask`, and `Done`, and the three header rows are non-selectable

### Requirement: Value choices per setting

Selecting a row SHALL offer that id's choices. `backlog.provider` SHALL offer `ask` followed by the union of the provider ids in `skills/universal/to-backlog/providers/registry.json` and `skills/universal/from-backlog/providers/registry.json`. `pr.provider` SHALL offer `ask` followed by the provider ids in `skills/universal/to-pr/providers/registry.json`. `explore.readyToProposeLanguage` SHALL offer `ask`, `English`, and `Other language...`. `explore.overviewLanguage` SHALL offer `ask`, `English`, `none`, and `Other language...`. `explore.chatPublicLanguage` SHALL offer `follow my language`, `English`, and `Other language...`, where `follow my language` SHALL remove the key from the file that holds it, leaving the rest of that file intact. `Other language...` SHALL ask for a free-text language name. Every chosen or typed value SHALL be validated through the reader's catalogue: a rejected free-text entry SHALL be reported and asked again, and an accepted value SHALL be recorded in the canonical form the catalogue returns. Back from a value prompt SHALL return to the rows without recording a change.

#### Scenario: Provider choices come from the registries
- **WHEN** the user selects the `backlog.provider` row and the registries list `github`, `gitlab`, and `azuredevops`
- **THEN** the choices are `ask`, `github`, `gitlab`, and `azuredevops`

#### Scenario: Code-host choices come from the to-pr registry
- **WHEN** the user selects the `pr.provider` row and the to-pr registry lists `github`, `gitlab`, and `azuredevops`
- **THEN** the choices are `ask`, `github`, `gitlab`, and `azuredevops`

#### Scenario: Rejected language is asked again
- **WHEN** the user chooses `Other language...` for `explore.readyToProposeLanguage` and types a blank entry, then `none`, then ` english `
- **THEN** the first two entries are reported as rejected and the setting is saved as `English`

#### Scenario: Free-text language keeps its spelling
- **WHEN** the user types ` Español ` for `explore.readyToProposeLanguage` and chooses `none` for `explore.overviewLanguage`
- **THEN** the saved values are `Español` and `None`

#### Scenario: Follow my language removes the chat language key
- **WHEN** the stored `explore.chatPublicLanguage` is `Español` and the user chooses `follow my language`
- **THEN** the saved file no longer holds `explore.chatPublicLanguage` and is otherwise unchanged

### Requirement: Ask is saved as a value

Choosing `ask` for an id SHALL record the string `"ask"` under that id rather than removing the key, so a comment attached to the key is kept.

#### Scenario: Ask replaces a stored provider
- **WHEN** the stored `backlog.provider` is `gitlab` with a trailing comment and the user chooses `ask`
- **THEN** the saved file differs from the previous one only in `"gitlab"` becoming `"ask"`

### Requirement: Saving on leaving the screen

Leaving the screen with `Done` or Back SHALL save every recorded change through the settings writer when at least one value differs from the stored value, and SHALL report the number of saved settings. Choosing the value that is already stored SHALL record no change. A session with no change SHALL NOT create, write, or touch any file.

#### Scenario: No change leaves the filesystem untouched
- **WHEN** the user leaves the screen without changing a value, or chooses the value already stored
- **THEN** no `.sai/` directory is created and an existing settings file keeps its content and modification time

#### Scenario: Back saves like Done
- **WHEN** the user sets `backlog.provider` to `github` and leaves the screen with Back
- **THEN** the setting is saved

### Requirement: Invalid stored values

When a stored value is outside its allowed set, the screen SHALL print the reader's warning when it opens and SHALL show that row as invalid, and the user SHALL be able to replace the value.

#### Scenario: Invalid provider is replaced
- **WHEN** the stored `backlog.provider` is `jira`, which no registry lists, and the user chooses `github`
- **THEN** the reader's warning is printed, the row shows `backlog.provider: "jira" (invalid)`, and the saved file differs only in `"jira"` becoming `"github"`

### Requirement: Saves that cannot complete

An unparseable `.sai/settings.jsonc` or `.sai/settings.local.jsonc` SHALL be reported when the screen opens, before any prompt, naming the file, and the screen SHALL return to the menu without editing. An interrupt (a null prompt answer such as Ctrl-C) SHALL discard every recorded change, report that nothing was saved, and return to the menu. A write error SHALL be reported and return to the menu. In every one of these cases both settings files SHALL stay byte-identical.

#### Scenario: Unparseable file at open
- **WHEN** the screen opens on a settings file containing `{ nope`
- **THEN** it reports `Cannot edit .sai/settings.jsonc` before any prompt and the file is unchanged

#### Scenario: Interrupt discards edits
- **WHEN** the user records a change and then interrupts a prompt
- **THEN** the screen reports `Interrupted: the edits were discarded and nothing was saved.`, the file is unchanged, and the post-setup menu is presented again

#### Scenario: Write error
- **WHEN** saving fails with a write error
- **THEN** the screen reports that the project settings were not saved, names the error, and leaves the file unchanged

#### Scenario: Unparseable local file at open
- **WHEN** the screen opens with a valid base file and a `.sai/settings.local.jsonc` that cannot be parsed
- **THEN** it reports `Cannot edit .sai/settings.local.jsonc` before any prompt and neither file changes

### Requirement: Injectable prompts and TTY gating

The screen SHALL take its single-select and free-text prompts, project path, package root, and log function as injectable parameters so tests drive it. It SHALL run only from the post-setup menu, so without a TTY it SHALL be skipped together with that menu.

#### Scenario: No TTY
- **WHEN** the post-setup menu runs without a TTY
- **THEN** it returns its non-TTY skipped outcome without prompting and without creating `.sai/`

### Requirement: Local override rows and save target

A setting that `.sai/settings.local.jsonc` holds SHALL render as an override row, even when its local value equals the base value: the base value struck through with ANSI SGR 9, then the local value, then the marker `(local)`. When styling is off, meaning standard output is not a TTY or `NO_COLOR` is set, the row SHALL read `<base> -> <local> (local)`. A base value that is absent SHALL show as the key's absence text (`ask`, or `follow my language` for `explore.chatPublicLanguage`). Leaving the screen SHALL save a changed key that the local file holds to the local file and leave the base file unchanged, and SHALL save every other changed key to the base file, which is created when missing. The screen SHALL NOT create the local file. Removing a key from the local file SHALL show the base value again. The save report SHALL name the files that were written. Without a local file, no row SHALL show an override.

#### Scenario: Override row with styling
- **WHEN** the base file sets `backlog.provider` to `github`, the local file sets it to `gitlab`, and styling is on
- **THEN** the `Provider` row under `Backlog` shows `github` struck through, then `gitlab (local)`

#### Scenario: Override row without styling
- **WHEN** the same files are shown without a TTY or with `NO_COLOR` set
- **THEN** the row reads `github -> gitlab (local)`

#### Scenario: Local-only key shows the absence text
- **WHEN** the local file sets `explore.chatPublicLanguage` and the base file does not
- **THEN** the row shows `follow my language` struck through, followed by the local value and `(local)`

#### Scenario: Overridden key saves to the local file
- **WHEN** the user changes a key that the local file holds and another key that it does not hold, then leaves the screen
- **THEN** the first key is saved to `.sai/settings.local.jsonc`, the second to `.sai/settings.jsonc`, and the local file keeps its comments

#### Scenario: Local file is never created
- **WHEN** no local file exists and the user changes a setting
- **THEN** only `.sai/settings.jsonc` is written and `.sai/settings.local.jsonc` does not exist afterwards

#### Scenario: No local file means no override rows
- **WHEN** the screen opens without `.sai/settings.local.jsonc`
- **THEN** no row shows strikethrough or the `(local)` marker
