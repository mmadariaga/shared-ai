## ADDED Requirements

### Requirement: Every Copilot prompt file MUST declare tools in category form

Each of the 14 files under `commands/copilot/*.prompt.md` SHALL carry a `tools:` YAML list whose every element is a **category** — the first path segment only (e.g. `vscode`, `read`, `edit`) — never a fully-qualified tool identifier (e.g. `vscode/askQuestions`, `edit/createFile`). VS Code expands each declared category to every sub-tool it contains, so a category grants the whole group without per-tool enumeration.

#### Scenario: Category form, not fully-qualified names

- **WHEN** any `commands/copilot/*.prompt.md` frontmatter `tools:` list is parsed
- **THEN** every element is a single-segment category string with no `/` character

#### Scenario: sai-explore probe block is replaced by category form

- **WHEN** `commands/copilot/sai-explore.prompt.md` frontmatter is read after this change
- **THEN** the prior probe-era single-element `tools:` list `[vscode/askQuestions]` is gone, replaced by the category-form list `[vscode, read, execute, search, web, todo]`

### Requirement: Every prompt MUST include the `vscode` category and MUST exclude the `agent` category

The `vscode` category SHALL appear in the `tools:` list of all 14 prompt files, because the closed-choice option-picker (`vscode/askQuestions`) is universal per `remember.md`. The `agent` category SHALL NOT appear in any of the 14 files — no subagent dispatch is permitted from prompt frontmatter.

#### Scenario: vscode present on every prompt

- **WHEN** the `tools:` list of any of the 14 prompt files is read
- **THEN** it contains `vscode`

#### Scenario: agent excluded from every prompt

- **WHEN** the `tools:` list of any of the 14 prompt files is read
- **THEN** it does not contain `agent`

### Requirement: Each prompt MUST declare exactly its pinned minimum category set

Each prompt file's `tools:` list SHALL equal the pinned set below — the minimum categories its body actually exercises. Order is as listed:

    budget            : vscode, read
    sai-explore       : vscode, read, execute, search, web, todo
    sai-1-spec        : vscode, read, search, edit, execute, web
    sai-2-design      : vscode, read, search, edit, execute, web
    sai-3-implement   : vscode, read, search, edit, execute, web
    sai-4-apply       : vscode, read, search, edit, execute, web
    sai-5-review      : vscode, read, search, edit, execute, web
    sai-6-security    : vscode, read, search, edit, execute, web
    sai-7-performance : vscode, read, search, edit, execute, web
    sai-8-accessibility : vscode, read, search, edit, execute, web, browser
    sai-archive       : vscode, read, execute
    sai-backfill      : vscode, read, search, edit, execute, web
    sai-commit        : vscode, read, execute
    sai-pr            : vscode, read, search, edit, execute, web

#### Scenario: Each prompt matches its pinned set

- **WHEN** any of the 14 prompt files' `tools:` list is compared to the pinned set for that filename
- **THEN** the declared categories equal the pinned set exactly — no category added and none omitted

### Requirement: Read-only wrappers MUST omit the `edit` category

`sai-explore`, `sai-archive`, and `sai-commit` SHALL NOT include the `edit` category. `sai-explore` keeps read-only discovery discipline; `sai-archive` and `sai-commit` do not author change artifacts, so they carry the minimum set (`vscode`, `read`, `execute`).

#### Scenario: sai-explore has no edit

- **WHEN** `commands/copilot/sai-explore.prompt.md` `tools:` list is read
- **THEN** it does not contain `edit`

#### Scenario: archive and commit carry the minimum set without edit

- **WHEN** `commands/copilot/sai-archive.prompt.md` or `commands/copilot/sai-commit.prompt.md` `tools:` list is read
- **THEN** it equals `[vscode, read, execute]` and does not contain `edit`

### Requirement: Only `sai-8-accessibility` MUST include the `browser` category

The `browser` category SHALL appear in `sai-8-accessibility.prompt.md` only, to support the optional runtime axe/Lighthouse path. No other prompt file SHALL include `browser`.

#### Scenario: accessibility has browser

- **WHEN** `commands/copilot/sai-8-accessibility.prompt.md` `tools:` list is read
- **THEN** it contains `browser`

#### Scenario: no other prompt has browser

- **WHEN** the `tools:` list of any prompt file other than `sai-8-accessibility.prompt.md` is read
- **THEN** it does not contain `browser`

### Requirement: The change MUST be additive to frontmatter and leave bodies untouched

For each of the 14 files, only the `tools:` field is introduced (or, for `sai-explore`, its value replaced). All other frontmatter fields (`description`, `argument-hint`, `agent`, `model`) SHALL be preserved verbatim and in their original order, and the prompt body text below the frontmatter SHALL be byte-identical to its pre-change state.

#### Scenario: Existing frontmatter fields preserved

- **WHEN** a modified prompt file's frontmatter is read
- **THEN** its pre-existing `description`, `argument-hint`, `agent`, and `model` fields are unchanged in value and relative order, with `tools:` added

#### Scenario: Body text unchanged

- **WHEN** the content below the closing `---` of any modified prompt file is read
- **THEN** it is identical to that file's pre-change body
