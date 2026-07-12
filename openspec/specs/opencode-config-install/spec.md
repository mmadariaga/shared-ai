## ADDED Requirements

### Requirement: Merge agent block into existing opencode config

When an `opencode.json` or `opencode.jsonc` already exists in the target opencode config directory, `copyOpencodeConfig` SHALL merge the `agent.explore`, `agent.executor`, and `agent.budget` keys into that existing file in place, instead of printing a copy-paste message. The existing file — not a newly created one — SHALL be the merge target, and both filenames SHALL be supported. When both files exist, the merge SHALL target exactly one of them deterministically, choosing `opencode.json` over `opencode.jsonc`, and SHALL leave the other file untouched.

#### Scenario: opencode.json exists — missing agent keys are inserted

- **WHEN** `copyOpencodeConfig` runs and only `opencode.json` exists with no `agent` section
- **THEN** the file is updated in place to contain `agent.explore`, `agent.executor`, and `agent.budget`
- **AND** each inserted agent is `{ "mode": "subagent", "model": "opencode-go/deepseek-v4-flash" }`
- **AND** no new `opencode.jsonc` file is created

#### Scenario: opencode.jsonc exists — missing agent keys are inserted

- **WHEN** `copyOpencodeConfig` runs and only `opencode.jsonc` exists with no `agent` section
- **THEN** the `opencode.jsonc` file is updated in place to contain the three agent keys with the placeholder model

#### Scenario: both config files exist — only opencode.json is merged

- **WHEN** `copyOpencodeConfig` runs and both `opencode.json` and `opencode.jsonc` exist, each with no `agent` section
- **THEN** the missing agent keys are merged into `opencode.json`
- **AND** `opencode.jsonc` is left byte-for-byte unchanged

### Requirement: Merge is surgical and preserves comments and formatting

The merge SHALL be performed with `jsonc-parser` (`parse` + `modify` + `applyEdits`) so that comments, trailing commas, indentation, and unrelated content in the existing file are preserved. No section of the config other than the inserted `agent` keys SHALL be modified.

#### Scenario: comments and unrelated keys survive the merge

- **WHEN** the existing config contains comments and unrelated top-level keys (e.g. a `theme` key) alongside no `agent` section
- **THEN** after the merge those comments and the unrelated keys are still present and unchanged
- **AND** only the missing `agent` keys have been added

#### Scenario: existing non-target agent children survive the merge

- **WHEN** the existing config already defines an `agent` section containing a non-target child (e.g. `agent.custom`) but none of `agent.explore`/`agent.executor`/`agent.budget`
- **THEN** `agent.custom` is preserved unchanged
- **AND** `agent.explore`, `agent.executor`, and `agent.budget` are inserted alongside it

### Requirement: Add-if-missing per agent key

The merge SHALL insert only the agent keys that are absent. If `agent.explore`, `agent.executor`, or `agent.budget` already exists, that key SHALL be left exactly as the user defined it. Presence of one agent key SHALL NOT suppress insertion of the others. Running the merge on a config that already contains all three keys SHALL leave the file unchanged (idempotent).

#### Scenario: existing agent key is not overwritten

- **WHEN** the existing config defines `agent.explore` with a custom model and omits `agent.executor` and `agent.budget`
- **THEN** `agent.explore` retains the user's custom model unchanged
- **AND** `agent.executor` and `agent.budget` are inserted with the placeholder model

#### Scenario: fully configured config is left unchanged

- **WHEN** the existing config already defines all of `agent.explore`, `agent.executor`, and `agent.budget`
- **THEN** the file content is left byte-for-byte unchanged
- **AND** no keys are added or overwritten

### Requirement: Report which keys were added

After a successful merge, `copyOpencodeConfig` SHALL print a single line naming exactly which agent keys were added, so the user can adjust the placeholder model. This output SHALL be non-interactive and require no TTY.

#### Scenario: added keys are named in the output

- **WHEN** the merge inserts `agent.executor` and `agent.budget` but skips an already-present `agent.explore`
- **THEN** the printed line names `executor` and `budget` as added
- **AND** it does not name `explore` as added

#### Scenario: nothing added produces no add-notice

- **WHEN** the merge inserts no keys because all three already exist
- **THEN** no line claiming keys were added is printed

### Requirement: Parse-failure fallback never corrupts the config

If the existing config file cannot be parsed as JSONC, OR it parses but its root is not a JSON object (e.g. an empty file, an array, or a scalar) so there is no object to insert an `agent` key into, `copyOpencodeConfig` SHALL leave the file byte-for-byte intact and fall back to the printed verification message (see the `opencode-config-message` capability). It SHALL NOT write partial or corrupted content.

#### Scenario: unparseable config is left intact and message is printed

- **WHEN** the existing `opencode.jsonc` contains content that does not parse as JSONC
- **THEN** the file content is left byte-for-byte unchanged
- **AND** the printed verification message is emitted as the fallback

#### Scenario: non-object root falls back without corrupting the file

- **WHEN** the existing config parses but its root is not a JSON object (an empty file, an array, or a scalar)
- **THEN** the file content is left byte-for-byte unchanged
- **AND** the printed verification message is emitted as the fallback
