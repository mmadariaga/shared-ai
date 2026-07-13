## ADDED Requirements

### Requirement: opencode change-consuming wrappers emit a Change-name argument line
Every opencode wrapper for a change-consuming `sai-*` command (`sai-2-design`, `sai-3-implement`, `sai-4-apply`, `sai-5-review`, `sai-6-security`, `sai-7-performance`, `sai-8-accessibility`, `sai-archive`, `sai-pr`) SHALL emit exactly one line at the end of the wrapper body, formatted as `**Change-name argument:** $ARGUMENTS` (two literal asterisks, the literal text `Change-name argument:`, a single space, and the literal token `$ARGUMENTS` substituted by opencode at invocation time). The line SHALL be the last line of the wrapper body, SHALL appear after the existing `Fetch @sai/commands/sai-X.md and follow those instructions exactly.` line, and SHALL NOT be modified in any other way (no extra surrounding whitespace, no Markdown link, no code fence). The line exists to bridge the opencode-specific gap where `$ARGUMENTS` is substituted only into the wrapper template, not into the body file that the model reads separately.

#### Scenario: sai-archive wrapper emits the line
- **WHEN** `~/.config/opencode/commands/sai-archive.md` is read
- **THEN** the final line of the wrapper body is exactly `**Change-name argument:** $ARGUMENTS`

#### Scenario: all nine change-consuming wrappers emit the line
- **WHEN** the nine opencode change-consuming wrapper files are listed (`commands/opencode/sai-2-design.md`, `sai-3-implement.md`, `sai-4-apply.md`, `sai-5-review.md`, `sai-6-security.md`, `sai-7-performance.md`, `sai-8-accessibility.md`, `sai-archive.md`, `sai-pr.md`)
- **THEN** each one ends with exactly the line `**Change-name argument:** $ARGUMENTS` and no other trailing content

#### Scenario: change-picker resolves the value from the emitted line
- **WHEN** a user runs `/sai-archive installer-offer-opencode-cli` in opencode
- **THEN** opencode substitutes `$ARGUMENTS` in the wrapper to `installer-offer-opencode-cli`, the body file (fetched separately) sees the same value via the emitted `**Change-name argument:** installer-offer-opencode-cli` line, and the change-picker instruction resolves `installer-offer-opencode-cli` as the change name without showing the picker

### Requirement: non-change-consuming opencode wrappers do not emit the line
Opencode wrappers for `sai-*` commands that do NOT consume a change name (`sai-1-spec` creates a change, `sai-backfill` has its own name-resolution flow, `sai-commit` operates on git state, `sai-explore` is non-change-scoped, `budget` is a mode toggle) SHALL NOT emit the `**Change-name argument:** $ARGUMENTS` line. The line is meaningful only for change-consuming commands; emitting it elsewhere would be noise that no instruction currently consumes.

#### Scenario: sai-1-spec wrapper does not emit the line
- **WHEN** `~/.config/opencode/commands/sai-1-spec.md` is read
- **THEN** the wrapper body does not contain a `**Change-name argument:**` line

#### Scenario: sai-backfill wrapper does not emit the line
- **WHEN** `~/.config/opencode/commands/sai-backfill.md` is read
- **THEN** the wrapper body does not contain a `**Change-name argument:**` line

#### Scenario: sai-explore body does not actually consume a change name
- **WHEN** the `sai/commands/sai-explore.md` body file (fetched by the `sai-explore` wrapper) is read
- **THEN** it does not include `Fetch @sai/instructions/change-picker.md` and does not validate `$ARGUMENTS` as an OpenSpec change name — even though the `commands/opencode/sai-explore.md` description frontmatter says "Optionally pass a change name to explore an existing change", the actual behavior is that `sai-explore` does not consume a change name. The description text is a known inconsistency deferred to a follow-up change.

### Requirement: convention is opencode-specific and is not mirrored to Claude Code or Copilot
The `**Change-name argument:** $ARGUMENTS` line is an opencode-specific adapter for the opencode-specific gap where `$ARGUMENTS` is substituted only into the wrapper template. Claude Code and GitHub Copilot substitute `$ARGUMENTS` directly into the body file, so the change-picker's existing `$ARGUMENTS` check works in those harnesses and the wrapper-echo line is unnecessary there. The `commands/claude/` and `commands/copilot/` wrappers for the same nine change-consuming `sai-*` commands SHALL NOT emit the line. This is a "harness-specific adapter" per the `harness-universality` spec: the change fills a gap in exactly one harness's wrapper set, and the fix has no meaning (would be actively wrong noise) in the other harnesses. No harness-agnostic content is touched; the line is a harness-specific adapter confined to `commands/opencode/`.

#### Scenario: Claude Code wrappers do not emit the line
- **WHEN** any of the nine `commands/claude/sai-{2-design,3-implement,4-apply,5-review,6-security,7-performance,8-accessibility,archive,pr}.md` wrappers is read
- **THEN** the wrapper body does not contain a `**Change-name argument:**` line

#### Scenario: Copilot wrappers do not emit the line
- **WHEN** any of the nine `commands/copilot/sai-{2-design,3-implement,4-apply,5-review,6-security,7-performance,8-accessibility,archive,pr}.prompt.md` wrappers is read
- **THEN** the wrapper body does not contain a `**Change-name argument:**` line

### Requirement: future change-consuming opencode wrappers must emit the line
Any new opencode wrapper for a change-consuming `sai-*` command introduced in the future SHALL emit the `**Change-name argument:** $ARGUMENTS` line at the end of the wrapper body, per the formatting rule above. The line is a string contract between the wrapper and the change-picker instruction; omitting it from a future change-consuming opencode wrapper would silently regress the change-name pass-through.

#### Scenario: new change-consuming opencode wrapper follows the convention
- **WHEN** a new change-consuming `sai-*` command (e.g. `sai-9-something`) is added and its `commands/opencode/sai-9-something.md` wrapper is written
- **THEN** the wrapper body ends with exactly `**Change-name argument:** $ARGUMENTS` so the change-picker resolves the name without showing the picker

## MODIFIED Requirements

(none)

## REMOVED Requirements

(none)
