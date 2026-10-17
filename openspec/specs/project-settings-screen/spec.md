# project-settings-screen Specification

## Purpose
Lets a user see and edit the project settings that pre-answer command questions from the post-setup menu of `node bin/install setup`, without hand-editing `.sai/settings.jsonc`.

## Requirements

### Requirement: Project settings screen contents

The `Project settings` screen in `bin/project-settings-screen.js` SHALL list exactly `explore.readyToProposeLanguage`, `explore.overviewLanguage`, `backlog.provider`, and `pr.provider`, in that order, each as a row `<id>: <current value>`, followed by a `Done` row. The current value SHALL be the value edited in this session. Otherwise it SHALL be the reader's normalized value, `ask` when the id is unset or set to `ask`, or the stored value in JSON form followed by ` (invalid)` when the stored value is outside its allowed set. `backlog.repository`, `backlog.project`, `backlog.organization`, `pr.repository`, `pr.organization`, and `pr.project` SHALL NOT appear on the screen. The screen SHALL read the settings file of the project path it was given, without the git top-level or main-worktree lookup.

#### Scenario: Rows show current values
- **WHEN** the screen opens on a settings file that sets only `backlog.provider` to `gitlab`
- **THEN** the rows are `explore.readyToProposeLanguage: ask`, `explore.overviewLanguage: ask`, `backlog.provider: gitlab`, `pr.provider: ask`, and `Done`

### Requirement: Value choices per setting

Selecting a row SHALL offer that id's choices. `backlog.provider` SHALL offer `ask` followed by the union of the provider ids in `skills/universal/to-backlog/providers/registry.json` and `skills/universal/from-backlog/providers/registry.json`. `pr.provider` SHALL offer `ask` followed by the provider ids in `skills/universal/to-pr/providers/registry.json`. `explore.readyToProposeLanguage` SHALL offer `ask`, `English`, and `Other language...`. `explore.overviewLanguage` SHALL offer `ask`, `English`, `none`, and `Other language...`. `Other language...` SHALL ask for a free-text language name. Every chosen or typed value SHALL be validated through the reader's catalogue: a rejected free-text entry SHALL be reported and asked again, and an accepted value SHALL be recorded in the canonical form the catalogue returns. Back from a value prompt SHALL return to the rows without recording a change.

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

An unparseable `.sai/settings.jsonc` SHALL be reported when the screen opens, before any prompt, and the screen SHALL return to the menu without editing. An interrupt (a null prompt answer such as Ctrl-C) SHALL discard every recorded change, report that nothing was saved, and return to the menu. A write error SHALL be reported and return to the menu. In every one of these cases the settings file SHALL stay byte-identical.

#### Scenario: Unparseable file at open
- **WHEN** the screen opens on a settings file containing `{ nope`
- **THEN** it reports `Cannot edit .sai/settings.jsonc` before any prompt and the file is unchanged

#### Scenario: Interrupt discards edits
- **WHEN** the user records a change and then interrupts a prompt
- **THEN** the screen reports `Interrupted: the edits were discarded and nothing was saved.`, the file is unchanged, and the post-setup menu is presented again

#### Scenario: Write error
- **WHEN** saving fails with a write error
- **THEN** the screen reports that the project settings were not saved, names the error, and leaves the file unchanged

### Requirement: Injectable prompts and TTY gating

The screen SHALL take its single-select and free-text prompts, project path, package root, and log function as injectable parameters so tests drive it. It SHALL run only from the post-setup menu, so without a TTY it SHALL be skipped together with that menu.

#### Scenario: No TTY
- **WHEN** the post-setup menu runs without a TTY
- **THEN** it returns its non-TTY skipped outcome without prompting and without creating `.sai/`
