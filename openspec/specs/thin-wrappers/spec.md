# Spec: thin-wrappers

## Requirements

### Requirement: wrapper-shape

`commands/claude/sai-*.md` and `commands/opencode/sai-*.md` wrappers MUST be thin: each wrapper SHALL retain its existing frontmatter unchanged and SHALL replace the body with the fetch lines documented below. The wrapper body MUST NOT contain isolation mode, prereq checks, or any other sai behavior — those live in the `sai/commands/<cmd>.md` body file that the wrapper fetches. The `sai-commands` skill (`skills/universal/sai-commands/SKILL.md`) and the `fetch` skill (`skills/fetch/SKILL.md`) are fetched only when explicitly required by the body contract, never inlined into the wrapper.

#### Scenario: Claude Code wrapper body shape

- **WHEN** any `commands/claude/sai-*.md` wrapper is read
- **THEN** its body contains only the `## Sai <Phase>` header line (where `<Phase>` is `Spec - 1`, `Design - 2`, `Implement - 3`, `Apply - 4`, `Review - 5`, `Security - 6`, `Performance - 7`, `Accessibility - 8`, `Archive`, `Backfill`, `Commit`, `Explore`, or `PR`) followed by the lines `Fetch @skills/fetch/SKILL.md` and `Fetch @sai/commands/<cmd>.md and follow those instructions exactly.` — and no other content
- **THEN** the body never contains `User input: $ARGUMENTS` (that token is consumed by the `sai/commands/<cmd>.md` body file)
- **THEN** the body never contains any `## Load instructions`, `## Run`, `## Completion`, `## Prerequisite checks`, or `## Load behaviors` section

#### Scenario: OpenCode wrapper body shape

- **WHEN** any `commands/opencode/sai-*.md` wrapper is read
- **THEN** its body contains only the `## Sai <Phase>` header line (same phase list as the Claude Code scenario) followed by the lines `Fetch @~/.config/opencode/skills/fetch/SKILL.md before you continue.` and `Fetch @sai/commands/<cmd>.md and follow those instructions exactly.` — and no other content
- **THEN** the body never contains `User input: $ARGUMENTS` (that token is consumed by the `sai/commands/<cmd>.md` body file)
- **THEN** the body never contains any `## Load instructions`, `## Run`, `## Completion`, `## Prerequisite checks`, or `## Load behaviors` section

#### Scenario: numbered and unnumbered phases

- **WHEN** the set of `commands/{claude,opencode}/sai-*.md` files is read
- **THEN** the eight numbered phases (`sai-1-spec` through `sai-8-accessibility`) use the `## Sai <Phase> - <n>` header (e.g. `## Sai Spec - 1`, `## Sai Design - 2`)
- **THEN** the five unnumbered commands (`sai-archive`, `sai-backfill`, `sai-commit`, `sai-explore`, `sai-pr`) use the `## Sai <Phase>` header without a `- <n>` suffix (e.g. `## Sai Archive`, `## Sai PR`)

#### Scenario: frontmatter preservation

- **WHEN** a wrapper is generated or regenerated from a `sai/commands/<cmd>.md` body
- **THEN** the frontmatter of the existing wrapper file is copied verbatim — fields such as `argument-hint`, `model`, `effort`, `agent`, and `description` are not added, removed, or reordered by the rewrite

#### Scenario: fetch-skill is allowed in wrappers

- **WHEN** a wrapper is read
- **THEN** it MAY contain `Fetch @skills/fetch/SKILL.md` (Claude Code) or `Fetch @~/.config/opencode/skills/fetch/SKILL.md before you continue.` (OpenCode) — this is the only skill fetch the wrapper is permitted to make; all other skill fetches live in the `sai/commands/<cmd>.md` body file

#### Scenario: User input token lives in body file, not wrapper

- **WHEN** a wrapper is read
- **THEN** it does NOT contain the string `User input: $ARGUMENTS` — that string is the responsibility of the `sai/commands/<cmd>.md` body file, which the wrapper fetches

### Requirement: wrapper-file-list

The full set of sai-* wrapper files in `commands/claude/` and `commands/opencode/` SHALL be 13 files each: `sai-1-spec.md`, `sai-2-design.md`, `sai-3-implement.md`, `sai-4-apply.md`, `sai-5-review.md`, `sai-6-security.md`, `sai-7-performance.md`, `sai-8-accessibility.md`, `sai-archive.md`, `sai-backfill.md`, `sai-commit.md`, `sai-explore.md`, `sai-pr.md`. The list explicitly includes `sai-backfill.md` (it was previously omitted from this spec's file list). The count applies to `sai-*.md` files only; other files in the directory (such as `commands/claude/budget.md`) are out of scope for this requirement.

#### Scenario: sai-* wrapper count in Claude Code directory

- **WHEN** `commands/claude/sai-*.md` is listed
- **THEN** exactly the 13 files named above are present (no extra `sai-*.md` files, no missing `sai-*.md` entries)

#### Scenario: sai-* wrapper count in OpenCode directory

- **WHEN** `commands/opencode/sai-*.md` is listed
- **THEN** exactly the 13 files named above are present (no extra `sai-*.md` files, no missing `sai-*.md` entries)

### Requirement: wrapper-template

The wrapper template SHALL be the same for all 13 wrappers in each harness; only the `<cmd>` token in the `Fetch @sai/commands/<cmd>.md` line changes per file. No wrapper SHALL use an old path like `@commands/sai/<cmd>.md` (the legacy `commands/sai/` source layout is forbidden by `source-layout`).

#### Scenario: example wrapper after rewrite

- **WHEN** `commands/claude/sai-archive.md` is read in its canonical form
- **THEN** it contains the project's standard frontmatter (description, argument-hint, model) unchanged, followed by a body that reads:

    ## Sai Archive

    Fetch @skills/fetch/SKILL.md
    Fetch @sai/commands/sai-archive.md and follow those instructions exactly.

- **THEN** it does NOT contain `User input: $ARGUMENTS`
- **THEN** it does NOT contain `Fetch @commands/sai/sai-archive.md` (forbidden legacy path)
- **THEN** the description no longer mentions `caveman` (reconciliation prerequisite enforced separately by `reconcile-specs-with-codebase`)
- **THEN** the description has no mojibake replacement character (reconciliation prerequisite enforced separately by `reconcile-specs-with-codebase`)

### Requirement: active-spec-uses-requirement-format

The active spec at `openspec/specs/thin-wrappers/spec.md` MUST use the `### Requirement:` / `#### Scenario:` structure. Free-form sections (`## What`, `## Wrapper Template`, `## Frontmatter Preservation Rules`, `## File List`, `## Acceptance Criteria`, `## Example`) SHALL NOT remain in the active spec after this change is applied — the spec's normative content lives entirely in `### Requirement:` blocks (the three above plus any future additions). This requirement exists because the current active spec is free-form prose, so a pure ADDED delta would leave the obsolete "User input: $ARGUMENTS" template coexisting with the requirements that forbid it.

#### Scenario: free-form sections removed from active spec

- **WHEN** `openspec/specs/thin-wrappers/spec.md` is read after this change is applied
- **THEN** the file does NOT contain a top-level `## What`, `## Wrapper Template`, `## Frontmatter Preservation Rules`, `## File List`, `## Acceptance Criteria`, or `## Example` heading
- **THEN** the file's normative content is expressed only as `### Requirement:` blocks (matching `wrapper-shape`, `wrapper-file-list`, `wrapper-template`, and `active-spec-uses-requirement-format` from this change)
