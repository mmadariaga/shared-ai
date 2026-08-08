# opencode-config-install Specification

## Purpose

Define how the installer merges the SAI external-directory permission into existing opencode configuration files without touching agent keys.

## Requirements

### Requirement: Merge SAI external-directory permission into existing opencode config

When an `opencode.json` or `opencode.jsonc` already exists in the target opencode config directory, `copyOpencodeConfig` SHALL merge only the SAI external-directory permission into that existing file in place, applying the `classifySaiPermission` contract (append the `~/.config/opencode/sai/**` allow rule when absent, preserve an explicit user `allow`/`ask`/`deny` with its preservation message, never override a restriction, never broaden the permission to all external directories). The merge SHALL NOT insert, modify, or remove any `agent` key. The existing file — not a newly created one — SHALL be the merge target, and both filenames SHALL be supported. When both files exist, the merge SHALL target exactly one of them deterministically, choosing `opencode.json` over `opencode.jsonc`, and SHALL leave the other file untouched. The merge SHALL return an object whose `redundantKeys` field is a subset of `['explore', 'executor', 'budget']` listing those keys present in the parsed root's `agent` map; this field is consumed by the migration notice (see `opencode-agent-migration-notice`).

#### Scenario: opencode.json exists — the permission is merged and no agent key is added

- **WHEN** `copyOpencodeConfig` runs and only `opencode.json` exists with no SAI external-directory rule and no `agent` section
- **THEN** the file is updated in place to contain the `~/.config/opencode/sai/**` allow rule
- **AND** it contains no `agent.explore`, `agent.executor`, or `agent.budget` key
- **AND** no new `opencode.jsonc` file is created

#### Scenario: opencode.jsonc exists — the permission is merged in place

- **WHEN** `copyOpencodeConfig` runs and only `opencode.jsonc` exists with no SAI external-directory rule
- **THEN** the `opencode.jsonc` file is updated in place to contain the SAI allow rule
- **AND** no `agent` key is added

#### Scenario: both config files exist — only opencode.json is merged

- **WHEN** `copyOpencodeConfig` runs and both `opencode.json` and `opencode.jsonc` exist
- **THEN** the SAI permission merge is applied to `opencode.json`
- **AND** `opencode.jsonc` is left byte-for-byte unchanged

### Requirement: Merge is surgical and preserves comments and formatting

The merge SHALL be performed with `jsonc-parser` (`parse` + `modify` + `applyEdits`) so that comments, trailing commas, indentation, and unrelated content in the existing file are preserved. No section of the config other than the SAI external-directory permission SHALL be modified. An existing `agent` key — including `agent.explore`, `agent.executor`, or `agent.budget` — SHALL be left exactly as the user defined it; the merge SHALL NOT compare it with a repository default, normalize it, or report it as an incompatible collision. When `root.agent` exists but is not a plain object (string, array, or scalar), the permission merge SHALL proceed (the surgical `modify` touches only the `permission` path, so the malformed `agent` subtree is left byte-identical) and the redundant-key collection SHALL treat the agent map as empty — no `Object.entries` over a string or array (which would emit bogus index keys), no crash on a scalar.

#### Scenario: comments and unrelated keys survive the merge

- **WHEN** the existing config contains comments and unrelated top-level keys (e.g. a `theme` key) alongside no SAI external-directory rule
- **THEN** after the merge those comments and the unrelated keys are still present and unchanged
- **AND** only the SAI allow rule has been added

#### Scenario: existing agent children are preserved untouched

- **WHEN** the existing config already defines an `agent` section containing `agent.explore` with a user-tuned model
- **THEN** `agent.explore` is preserved unchanged
- **AND** the merge adds no other `agent` child

### Requirement: Parse-failure fallback never corrupts the config

If the existing config file cannot be parsed as JSONC, OR it parses but its root is not a JSON object (e.g. an empty file, an array, or a scalar) so there is no object to merge a permission into, `copyOpencodeConfig` SHALL leave the file byte-for-byte intact and fall back to the printed verification message (see the `opencode-config-message` capability). It SHALL NOT write partial or corrupted content, and SHALL NOT print the retired "Added opencode agent keys to …" line.

#### Scenario: unparseable config is left intact and message is printed

- **WHEN** the existing `opencode.jsonc` contains content that does not parse as JSONC
- **THEN** the file content is left byte-for-byte unchanged
- **AND** the printed verification message is emitted as the fallback

#### Scenario: non-object root falls back without corrupting the file

- **WHEN** the existing config parses but its root is not a JSON object (an empty file, an array, or a scalar)
- **THEN** the file content is left byte-for-byte unchanged
- **AND** the printed verification message is emitted as the fallback

### Requirement: Config-merge ADR records match the narrowed merge

`docs/adr/0029-jsonc-parser-surgical-merge-for-opencode-agent-block.md` SHALL be recorded as historical, because its subject — the surgical merge of the opencode agent block — is retired. `docs/adr/0030-opencode-json-over-jsonc-merge-precedence.md` SHALL be recorded as superseded in respect of agents while its precedence decision continues to govern the SAI permission merge.

#### Scenario: ADR 0029 is historical

- **WHEN** ADR 0029 is read after this change is applied
- **THEN** its status is recorded as historical with the reason that the agent-block merge is retired

#### Scenario: ADR 0030 keeps its precedence for the permission merge

- **WHEN** ADR 0030 is read after this change is applied
- **THEN** it is recorded as superseded in respect of agents
- **AND** it still records that when both `opencode.json` and `opencode.jsonc` exist, the merge targets `opencode.json`
