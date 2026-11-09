# doctor-fetch-resolution Specification

## Purpose

Defines how `doctor` resolves each wrapper's `Fetch @` references with the resolution order of its harness.

## Requirements

### Requirement: Fetch @ reference resolution per wrapper

For each installed wrapper in a detected harness, the doctor SHALL parse every `Fetch @<path>` reference it contains and verify that each reference resolves to a real file on disk. A reference that resolves to an existing file SHALL pass; a reference that resolves to no existing file (a dangling reference) SHALL be flagged with the wrapper it appears in and the unresolved target.

#### Scenario: resolvable reference passes
- **WHEN** an installed wrapper contains a `Fetch @` reference whose target exists at a resolvable location
- **THEN** the doctor marks that reference resolved and the check passes for it

#### Scenario: dangling reference is flagged
- **WHEN** an installed wrapper contains a `Fetch @` reference whose target does not exist at any resolvable location
- **THEN** the doctor flags the dangling reference, naming the wrapper and the unresolved target, and the harness section fails

### Requirement: harness-specific resolution order

The doctor SHALL resolve each `Fetch @` reference using the resolution order of the harness that owns the wrapper, not a single universal rule. For Claude Code it SHALL check the project-local `.claude/<subpath>` first, then `<subpath>` under the user-global root the shared resolver returns (`CLAUDE_CONFIG_DIR`, else `~/.claude`) as the fallback. For opencode it SHALL check the project-local `.opencode/<subpath>` first, then `<subpath>` under the user-global root the shared resolver returns (the directory `opencode debug paths` reports, else `XDG_CONFIG_HOME/opencode`, else `~/.config/opencode`) as the fallback. A reference SHALL be considered resolved when it exists at any position in that harness's order.

#### Scenario: user-global fallback resolves a Claude reference
- **WHEN** a Claude wrapper's `Fetch @` target is absent project-locally but present at the user-global fallback (`~/.claude` when `CLAUDE_CONFIG_DIR` is unset)
- **THEN** the doctor resolves the reference via the fallback and does not flag it as dangling

#### Scenario: opencode uses its own resolution order
- **WHEN** an opencode wrapper's `Fetch @` target is resolved
- **THEN** the doctor applies the `.opencode/<subpath>`-then-resolved-opencode-root order rather than the Claude order

#### Scenario: skill-tool reference is not treated as a dangling file
- **WHEN** a `Fetch @skills/<name>/SKILL.md` reference maps to a harness skill-tool invocation rather than a plain file read
- **THEN** the doctor validates it against the skill target its harness resolution defines rather than reporting it as a dangling file reference

#### Scenario: CLAUDE_CONFIG_DIR fallback
- **WHEN** `CLAUDE_CONFIG_DIR` is set and a Claude wrapper's `Fetch @` target is present only under that directory
- **THEN** the doctor resolves the reference there and does not consult `~/.claude`
