> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

The project settings screen of the post-setup menu showed raw dotted setting ids instead of readable names. `/sai-explore` could only follow the language the user happened to write in, with no way to fix the chat language per project. The settings reader read a single shared, committed file, so a user had no personal override layer for their own preferences.

## What Changes

- The post-setup menu entry and the screen are renamed from `Project settings` to `Project behavior settings` (`bin/model-customization.js`, `bin/project-settings-screen.js`, `README.md`, `AGENTS.md`, `docs/models.md`, `docs/project-settings.md`).
- The setting catalogue in `sai/tools/project-settings.js` gains presentation fields: `label` and `section` for every key the screen shows, and an optional `absent` text for a key whose unset value is not `ask`. Labels are `Ready to Propose language`, `Change overview language`, `Chat language`, and `Provider` for both `backlog.provider` and `pr.provider`; sections are `Explore`, `Backlog`, and `Pull requests`.
- The catalogue gains `explore.chatPublicLanguage`: a free language name, normalized like the other language keys, where `none` is invalid; its absence text is `follow my language`.
- The reader reads an optional hand-created `.sai/settings.local.jsonc` beside the base file `.sai/settings.jsonc` and merges it key by key: a key the local file holds replaces the base value, even when its own value is `ask` or invalid. The result exposes each key's origin (`base` or `local`) and the separate base and local values. An unparseable local file warns that the local overrides are ignored and the base values apply.
- The screen lists five settings by label under non-selectable section header rows. A key the local file holds renders as an override: the base value struck through, then the local value and a `(local)` marker; without a TTY or with `NO_COLOR` the row reads `base -> local (local)`. The value picker title uses the label. For `Chat language`, `follow my language` removes the key from the file that holds it.
- The writer in `bin/project-settings-writer.js` picks the target file per key: the local file when it already holds the key, otherwise the base file, which is created when missing. It never creates the local file, prepares every edit before the first write, refuses the whole save when either file cannot be parsed, and removes a key whose value is `undefined`.
- The shared navigator in `bin/install-flow.js` accepts `groupHeaders`, options that render their visible text as rows the cursor skips and that never join a selection; `promptSelect` takes an optional trailing `navigatorOptions` with `groupHeaders` and `displayOptions`, and the post-setup menu forwards it to the screen's prompts.
- The `/sai-explore` load (`sai/commands/explore/body.md`) reads `explore.chatPublicLanguage` after `sai-state spawn` and its resets and, when it has a value, adopts it as the user's instruction to talk in that language for the invocation.
- `docs/project-settings.md` documents the new key, the local file (merge, precedence, location, save target, and that the user must ignore it in their own `.gitignore`), and the renamed screen.
- Tests cover the merge, origins, invalid and unparseable local files, labels and sections, override rendering, save targets, group header navigation, and the explore load step.

## Capabilities

### New Capabilities

- `explore-chat-language`: `/sai-explore` adopts `explore.chatPublicLanguage` as the user's chat-language instruction after its load.

### Modified Capabilities

- `project-settings`: catalogue presentation fields, the `explore.chatPublicLanguage` key, and the key-level merge of `.sai/settings.local.jsonc` with per-key origin.
- `project-settings-screen`: renamed screen, labelled rows under section headers, override rendering, the chat language choices, and reporting of an unparseable local file.
- `project-settings-writer`: per-key target file between the base and local files, and key removal.
- `model-customization-menu`: the menu action is renamed to `Project behavior settings`.
- `shared-readline-navigator`: non-selectable group header rows and index-aligned display text for `promptSelect`.

## Impact

- Modified: `sai/tools/project-settings.js`, `bin/project-settings-screen.js`, `bin/project-settings-writer.js`, `bin/install-flow.js`, `bin/model-customization.js`, `sai/commands/explore/body.md`, `docs/project-settings.md`, `docs/models.md`, `README.md`, `AGENTS.md`, `test/project-settings.test.js`, `test/project-settings-screen.test.js`, `test/install-flow-navigator.test.js`.
- New files: none. The installer never creates `.sai/settings.local.jsonc` and never edits any `.gitignore`.
- Unchanged: `sai/policies/public-chat.md` and the `token-efficient-languages` contract. Without a local file and without `explore.chatPublicLanguage`, readers, the screen, and `/sai-explore` behave as before.
- Known limitations: users manage their own `.gitignore` for the local file; strikethrough depends on terminal styling, so override rows also carry the textual `(local)` marker.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill
