# opencode-permission-template Specification

## Purpose
Define the `external_directory` allowlist of the shipped opencode configuration template (`configs/opencode.jsonc`) so that it covers the full fetch namespace — every path a `Fetch @` directive can resolve to under the user-global opencode root — using forward-slash separators and no platform-specific entries.

## Requirements

### Requirement: The shipped opencode config template covers the full fetch namespace

The `external_directory` block of `configs/opencode.jsonc` SHALL grant an allow rule for exactly the three fetch-namespace subtrees of the user-global opencode root: `~/.config/opencode/sai/**`, `~/.config/opencode/commands/**`, and `~/.config/opencode/skills/**`. It SHALL NOT contain a rule that grants the whole config root (e.g. `~/.config/opencode/**`) or any broader wildcard, and it SHALL NOT add an entry for the `@skills/<name>/SKILL.md` skill-tool mapping, which resolves through the `skill` tool and touches no filesystem path. The allowlist content — the three entries' presence and the absence of backslash separators — SHALL be asserted by the OpenCode installer integration tests in `test/install-opencode.test.js` as part of this change, so the guard is enforced at merge rather than deferred.

#### Scenario: fresh install copies the full namespace allowlist
- **WHEN** the installer copies `configs/opencode.jsonc` to a fresh opencode config destination
- **THEN** the copied configuration allows `~/.config/opencode/sai/**`, `~/.config/opencode/commands/**`, and `~/.config/opencode/skills/**`
- **AND** the first `Fetch @commands/...` directive after install resolves without an external-directory permission prompt

#### Scenario: the shipped allowlist is asserted by the installer tests
- **WHEN** the OpenCode installer test suite runs
- **THEN** it asserts that the fresh-install configuration's `permission.external_directory` allows all three fetch-namespace entries
- **AND** it asserts that no pattern in the shipped template's `external_directory` block contains a backslash separator
- **AND** these assertions are part of this change, not deferred to a follow-up slice

#### Scenario: the whole config root is never granted
- **WHEN** the shipped template's `external_directory` block is inspected
- **THEN** no entry matches the entire config root or every external directory
- **AND** the three entries cover exactly the fetch namespace and nothing wider

#### Scenario: the skill-tool mapping adds no permission entry
- **WHEN** the shipped template's `external_directory` block is inspected
- **THEN** it contains no entry added for `@skills/<name>/SKILL.md` resolution, because that mapping uses the `skill` tool and needs no filesystem permission

### Requirement: Allowlist patterns use forward-slash separators and ship no platform-specific paths

Every pattern in the shipped template's `external_directory` block SHALL use forward-slash (`/`) separators; no pattern SHALL use backslash (`\`) separators. The template SHALL NOT contain platform-specific paths: in particular, the Windows-only `~/AppData/Local/Temp/opencode/*` entry SHALL NOT be added to the shipped template.

#### Scenario: patterns contain no backslash separators
- **WHEN** the shipped template's `external_directory` block is read
- **THEN** every pattern uses `/` separators
- **AND** no pattern contains a `\` character

#### Scenario: no Windows-only path is shipped
- **WHEN** the shipped template's `external_directory` block is read
- **THEN** it contains no `~/AppData/Local/Temp/...` or other platform-specific path entry

### Requirement: The existing-config merge path divergence is a recorded known limitation

This change SHALL NOT modify the installer's existing-config merge path: merging into a pre-existing `opencode.json` or `opencode.jsonc` SHALL continue to append only the `~/.config/opencode/sai/**` allow rule per `opencode-config-install`. The resulting divergence — the fresh-install template carries the three fetch-namespace entries, while a merged existing config gains only the `sai/**` entry — is a known limitation of this change: the prompt-free property holds for fresh installs (template copy) and not for existing-config merges, and no requirement in this change shall be read as extending it to the merge path. Alignment of the merge path with the full fetch namespace is a dependent follow-up slice, ordered after this change.

#### Scenario: the merge path stays narrow
- **WHEN** the installer merges into an existing config that lacks the SAI external-directory rule
- **THEN** only the `~/.config/opencode/sai/**` allow rule is appended
- **AND** no `commands/**` or `skills/**` rule is added by the merge
- **AND** the merge behavior remains governed by `opencode-config-install`

#### Scenario: the divergence is recorded, not silent
- **WHEN** the change's artifacts are read
- **THEN** the fresh-install allowlist and the merge-path allowlist are documented as intentionally divergent
- **AND** the merge-path alignment is named as a dependent follow-up slice ordered after this change
