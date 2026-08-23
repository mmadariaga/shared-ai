# Spec: thin-wrappers

## Requirements

### Requirement: wrapper-shape

`commands/claude/sai-*.md` and `commands/opencode/sai-*.md` wrappers MUST be thin. The normative wrapper body shape — the three directives, the two-key invocation envelope placement, frontmatter preservation, forbidden sections, and the `sai-explore` load-set exception — is owned by `command-wrapper-body`; this requirement SHALL NOT restate those rules. Within that envelope, a trimmed, non-empty `arguments_value` is authoritative. No wrapper-echo forwarding data is permitted.

#### Scenario: fetch-skill is allowed in wrappers

- **WHEN** a wrapper is read
- **THEN** it MAY contain `Fetch @skills/fetch/SKILL.md` (Claude Code) or `Fetch @~/.config/opencode/skills/fetch/SKILL.md before you continue.` (OpenCode) — this is the only skill fetch the wrapper is permitted to make; all other skill fetches live in the `sai/commands/{name}/` cards or the command's `command-bootstrap.md`

#### Scenario: body shape verified at the owned contract

- **WHEN** the wrapper body shape is verified
- **THEN** the normative checks (directive set, two-key envelope placement, frontmatter preservation, forbidden sections) resolve to `command-wrapper-body`'s requirements, and no shape rule is duplicated anywhere in this capability

### Requirement: Wrapper file inventory

The per-harness wrapper file list SHALL contain exactly seventeen `sai-*.md` command files, including `sai-merge.md` in both `commands/claude/` and `commands/opencode/`, each forwarding its InvocationEnvelope through the harness boot adapter to the merge command bootstrap.

#### Scenario: sai-merge wrapper present on both harnesses

- **WHEN** the wrapper inventory is enumerated for Claude Code or opencode
- **THEN** `sai-merge.md` is present with the expected fetch chain and envelope keys

### Requirement: wrapper-template

The wrapper template SHALL be the same for all 16 wrappers in each harness, with exactly these permitted per-file variances: the `{name}` token in the launcher-call line, the envelope's `command_name` value, and `sai-explore`'s additional harness-specific loads. `arguments_value` is the sole argument substitution and no wrapper-echo field is a permitted variance. Every wrapper SHALL remain label-free and SHALL not use a legacy command path.

#### Scenario: sai-build follows the shared template

- **WHEN** `commands/claude/sai-build.md` is read in its canonical form
- **THEN** it uses the same three-directive skeleton with command bootstrap `@sai/commands/build/command-bootstrap.md` and `command_name: build`
- **AND** it does not embed phase logic inline

#### Scenario: example wrapper after rewrite

- **WHEN** `commands/claude/sai-archive.md` is read in its canonical form
- **THEN** it contains the project's standard frontmatter (description, argument-hint, model) unchanged, followed by a body that reads:

    Fetch @skills/fetch/SKILL.md
    Fetch @sai/adapters/claude/boot.md and follow it.
    Fetch @sai/commands/archive/command-bootstrap.md and follow those instructions exactly, forwarding the InvocationEnvelope block below.

    InvocationEnvelope:
      command_name: archive
      arguments_value: $ARGUMENTS

- **THEN** it does NOT contain a `## Sai Archive` heading (the rewrite drops the legacy section heading)
- **THEN** it does NOT contain `User input: $ARGUMENTS`
- **THEN** it does NOT contain `Fetch @commands/sai/sai-archive.md` (forbidden legacy path)
- **THEN** it does NOT contain a flat `Fetch @sai/commands/sai-archive.md` body path
- **THEN** the body has no trailing label after the envelope block

#### Scenario: opencode example mirrors the shape

- **WHEN** `commands/opencode/sai-status.md` is read in its canonical form
- **THEN** it contains the fetch-skill line, the opencode boot-adapter load, the command bootstrap call to `@sai/commands/status/command-bootstrap.md`, and the standalone `InvocationEnvelope:` block with exactly `command_name` and `arguments_value` — and no other content

### Requirement: active-spec-uses-requirement-format

The active spec at `openspec/specs/thin-wrappers/spec.md` MUST use the `### Requirement:` / `#### Scenario:` structure. Free-form sections (`## What`, `## Wrapper Template`, `## Frontmatter Preservation Rules`, `## File List`, `## Acceptance Criteria`, `## Example`) SHALL NOT remain in the active spec after this change is applied — the spec's normative content lives entirely in `### Requirement:` blocks (the three above plus any future additions). This requirement exists because the current active spec is free-form prose, so a pure ADDED delta would leave the obsolete "User input: $ARGUMENTS" template coexisting with the requirements that forbid it.

#### Scenario: free-form sections removed from active spec

- **WHEN** `openspec/specs/thin-wrappers/spec.md` is read after this change is applied
- **THEN** the file does NOT contain a top-level `## What`, `## Wrapper Template`, `## Frontmatter Preservation Rules`, `## File List`, `## Acceptance Criteria`, or `## Example` heading
- **THEN** the file's normative content is expressed only as `### Requirement:` blocks (matching `wrapper-shape`, `wrapper-file-list`, `wrapper-template`, and `active-spec-uses-requirement-format` from this change)
