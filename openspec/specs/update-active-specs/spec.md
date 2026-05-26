## ADDED Requirements

### Requirement: explore-crystal-full-output spec is deleted
`openspec/specs/explore-crystal-full-output/spec.md` SHALL be deleted. The entire spec is dedicated to caveman suspension during crystallization output — it becomes vestigial once caveman is removed.

#### Scenario: spec file checked
- **WHEN** `openspec/specs/explore-crystal-full-output/spec.md` is checked
- **THEN** the file does not exist

### Requirement: command-wrappers spec has no caveman references
`openspec/specs/command-wrappers/spec.md` SHALL be updated to remove all caveman references.

Specific changes:
- Line 5: Remove "caveman mode" from the list of behaviors prepended by sai-* commands. The sentence currently reads "...prepend shared-AI behaviors (caveman mode, isolation mode, model routing, relevant instructions)..." — remove "caveman mode, " from that list.
- Line 9 (Scenario: sai-1-spec executes with full enrichment): Remove `~/.claude/sai/instructions/caveman.md` from the THEN clause. The remaining loads are glossary-format.md and spec.propose.md.
- Line 13 (Scenario: sai-2-design executes with enrichment): Remove `~/.claude/sai/instructions/caveman.md` from the THEN clause. The remaining load is glossary-format.md.

#### Scenario: command-wrappers spec read
- **WHEN** `openspec/specs/command-wrappers/spec.md` is read
- **THEN** no line contains "caveman"

### Requirement: design-instruction spec has no caveman references
`openspec/specs/design-instruction/spec.md` SHALL be updated to remove caveman from the list of behavior fetches on line 14.

Specific change: Line 14 THEN clause currently reads "...behavior fetches (explorer, caveman, glossary-format), the design.md fetch line, and remember.md fetch". Remove "caveman, " from the behavior fetches list.

#### Scenario: design-instruction spec read
- **WHEN** `openspec/specs/design-instruction/spec.md` is read
- **THEN** no line contains "caveman"

### Requirement: extract-bodies spec examples contain no caveman fetch line
`openspec/specs/extract-bodies/spec.md` SHALL be updated so that the example code blocks (both "before" at line 46 and "extracted" at line 60) do not include `Fetch @skills/caveman/SKILL.md`.

Both example blocks show the body of `sai-archive.md`. The caveman fetch line must be removed from both the "Current body" example and the "Extracted body" example to match the post-remove-caveman state.

#### Scenario: extract-bodies spec read
- **WHEN** `openspec/specs/extract-bodies/spec.md` is read
- **THEN** no line contains "Fetch @skills/caveman/SKILL.md"

### Requirement: install-command-overwrite spec has no caveman skill copy
`openspec/specs/install-command-overwrite/spec.md` SHALL be updated to remove `caveman/SKILL.md` from the universal skill copy list and ordering requirements.

Specific changes:
- Line 17: Remove `caveman/SKILL.md` from the skills list. New list: `budget/SKILL.md`, `sai-commands/SKILL.md`, `token-efficient-languages/SKILL.md`.
- Remove the ordering constraint that `budget/SKILL.md` and `sai-commands/SKILL.md` appear before `caveman/SKILL.md` (lines 17, 21, 25) — this ordering constraint is no longer meaningful. The remaining three skills may copy in any order consistent with existing behavior.

#### Scenario: install-command-overwrite spec read
- **WHEN** `openspec/specs/install-command-overwrite/spec.md` is read
- **THEN** no line contains "caveman"

### Requirement: install-scripts-update spec has no caveman anchor references
`openspec/specs/install-scripts-update/spec.md` SHALL be updated to remove all references to caveman as a placement anchor for new install steps.

Specific changes (lines 5, 12, 21, 27, 36, 42, 56): Replace all instances of "following the same pattern as the caveman skill copy step" and "placed immediately after the caveman copy step" with a different anchor reference (e.g., the budget-explorer copy step, or describe absolute position) so the install instructions remain unambiguous.

#### Scenario: install-scripts-update spec read
- **WHEN** `openspec/specs/install-scripts-update/spec.md` is read
- **THEN** no line contains "caveman"

### Requirement: npx-installer spec has no caveman skill entries
`openspec/specs/npx-installer/spec.md` SHALL be updated to remove the caveman skill from:
- The install manifest (line 141 and 161: mapping `skills/universal/caveman/SKILL.md` → `skills/caveman/SKILL.md`)
- The skip-if-exists requirement (line 99) and its scenario (lines 107–108)

#### Scenario: npx-installer spec read
- **WHEN** `openspec/specs/npx-installer/spec.md` is read
- **THEN** no line contains "caveman"

### Requirement: sai-command-registry spec lists no caveman quality layer
`openspec/specs/sai-command-registry/spec.md` SHALL be updated to remove "caveman communication mode" from the quality layers documented by the skill.

Specific change: Line 31 currently reads "...quality layers that sai-* commands provide: prerequisite checks, caveman communication mode, cost discipline via budget skills, phase-specific instructions, and OpenSpec skill chaining." Remove "caveman communication mode, " from this list.

#### Scenario: sai-command-registry spec read
- **WHEN** `openspec/specs/sai-command-registry/spec.md` is read
- **THEN** no line contains "caveman"

### Requirement: sai-design-command spec has no caveman loading requirement
`openspec/specs/sai-design-command/spec.md` SHALL have the "sai-2-design loads caveman and glossary behaviors" requirement removed entirely (lines 32–37).

The remaining requirements about command existence, design/tasks generation, and model selection are unaffected.

#### Scenario: sai-design-command spec read
- **WHEN** `openspec/specs/sai-design-command/spec.md` is read
- **THEN** no line contains "caveman"

### Requirement: sai-instructions-namespace spec expected file list excludes caveman.md
`openspec/specs/sai-instructions-namespace/spec.md` SHALL be updated so that the expected files list in the scenario on line 16 does not include `caveman.md`.

Specific change: Remove `caveman.md` from the comma-separated list in the THEN clause: "the following files are present: `caveman.md`, `commit.md`, ...".

#### Scenario: sai-instructions-namespace spec read
- **WHEN** `openspec/specs/sai-instructions-namespace/spec.md` is read
- **THEN** no line contains "caveman.md"

### Requirement: sai-skills-fetch-update spec ordering constraints reference no caveman
`openspec/specs/sai-skills-fetch-update/spec.md` SHALL be updated so that the ordering scenarios do not mention caveman.md as a landmark.

Specific changes:
- Line 11 (sai-1-spec scenario THEN): Currently "explorer.claude.md is loaded before caveman.md, glossary-format.md, and spec.propose.md". Update to "explorer.claude.md is loaded before glossary-format.md and spec.propose.md".
- Line 22 (sai-2-design scenario THEN): Currently "explorer.claude.md is loaded before caveman.md and glossary-format.md". Update to "explorer.claude.md is loaded before glossary-format.md".
- Line 29 (sai-3-implement scenario THEN): Currently "explorer.claude.md is loaded before caveman.md and glossary-format.md". Update to "explorer.claude.md is loaded before glossary-format.md".

#### Scenario: sai-skills-fetch-update spec read
- **WHEN** `openspec/specs/sai-skills-fetch-update/spec.md` is read
- **THEN** no line contains "caveman"

### Requirement: thin-wrappers spec examples and descriptions contain no caveman
`openspec/specs/thin-wrappers/spec.md` SHALL be updated to remove caveman from the "before" example and the `description:` field.

Specific changes:
- Line 58 (`description:` field in "before" example): Remove "adds caveman mode" from the sai-archive description. The description currently reads "Archive a completed change — wraps opsx:archive skill, adds caveman mode. Moves openspec/changes/{name}/ into the archive folder once tasks are done." The updated description should read "Archive a completed change — wraps opsx:archive skill. Moves openspec/changes/{name}/ into the archive folder once tasks are done."
- Line 67 (inside the "before" example body): Remove the `Fetch @skills/caveman/SKILL.md` line.
- Line 78 (second description occurrence, same sai-archive before state): Same as line 58.

#### Scenario: thin-wrappers spec read
- **WHEN** `openspec/specs/thin-wrappers/spec.md` is read
- **THEN** no line contains "caveman"

### Requirement: token-efficient-languages-commands spec uses a different reference example
`openspec/specs/token-efficient-languages-commands/spec.md` SHALL be updated so that the reference example on line 9 does not cite the caveman skill command files.

Specific change: Line 9 currently reads "The file structure SHALL follow the same pattern as other single-skill command files (e.g., the caveman skill command files in the sai suite)." Replace the example with a different one — e.g., "the budget skill command files" or simply "other single-skill command files already present in the repo."

#### Scenario: token-efficient-languages-commands spec read
- **WHEN** `openspec/specs/token-efficient-languages-commands/spec.md` is read
- **THEN** no line contains "caveman"
