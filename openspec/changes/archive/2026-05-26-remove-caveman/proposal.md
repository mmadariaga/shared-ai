## Why

In sai-* commands, thinking tokens dominate total cost — public output tokens are negligible — so caveman's token savings do not materialize where they would matter. The legibility cost of compressed prose outweighs the savings, and loading the skill file on every invocation adds unnecessary input context cost.

## What Changes

- Remove two lines from each of the 13 `sai/commands/sai-*.md` files: the `Fetch @skills/caveman/SKILL.md` line and the `Caveman lite mode active by default` line.
- Remove the caveman intensity bullet from `sai/instructions/remember.md`.
- Remove the caveman suspension block from `sai/instructions/explore.md` (line 21).
- **BREAKING**: Delete `skills/universal/caveman/SKILL.md` — the skill will no longer be distributed or installed.
- Update 13 active specs under `openspec/specs/` that encode caveman as required behavior (see Capabilities).
- Remove caveman copy steps from `INSTALL.claude.md`, `INSTALL.opencode.md`, `bin/install-flow.js`, and affected test files.
- The `--full-caveman` flag supported by existing commands disappears with no backward-compatible shim.

## Capabilities

### New Capabilities

- `remove-caveman-from-commands`: Strip the two caveman lines (Fetch + lite-mode default) from all 13 `sai/commands/sai-*.md` files.
- `remove-caveman-from-instructions`: Remove caveman intensity bullet from `sai/instructions/remember.md` and caveman suspension block from `sai/instructions/explore.md`.
- `delete-caveman-skill`: Delete `skills/universal/caveman/SKILL.md` from the repository.
- `update-active-specs`: Update the 13 active specs that specify caveman as required behavior — removing or replacing every caveman requirement.
- `update-install-artifacts`: Remove caveman copy steps from `INSTALL.claude.md`, `INSTALL.opencode.md`, `bin/install-flow.js`, and test files `test/install-claude.test.js` and `test/install-opencode.test.js`.

### Modified Capabilities

<!-- None — token-efficient-languages is independent and untouched. -->

## Impact

- **sai/commands/**: 13 files, 2 lines removed each (26 lines total).
- **sai/instructions/**: `remember.md` (1 line removed), `explore.md` (1 block removed, ~1 line).
- **skills/universal/caveman/SKILL.md**: deleted.
- **openspec/specs/**: 13 active spec files updated — `command-wrappers`, `design-instruction`, `explore-crystal-full-output`, `extract-bodies`, `install-command-overwrite`, `install-scripts-update`, `npx-installer`, `sai-command-registry`, `sai-design-command`, `sai-instructions-namespace`, `sai-skills-fetch-update`, `thin-wrappers`, `token-efficient-languages-commands`.
- **Install artifacts**: `INSTALL.claude.md` (lines 50–52 bash, 84–86 PowerShell), `INSTALL.opencode.md` (lines 53–55 bash, 110–112 PowerShell), `bin/install-flow.js` (lines 140–141, 190–191), `test/install-claude.test.js` (lines 48, 67, 77, 84), `test/install-opencode.test.js` (lines 35, 86, 96).
- **No API changes.** No external dependencies. No infrastructure impact.

## Proposal Research Documentation

**Local files**:
- `sai/commands/sai-1-spec.md` through `sai-pr.md` (all 13 command files) — confirmed caveman lines at lines 11–15 of each
- `sai/instructions/remember.md` line 2 — caveman intensity bullet
- `sai/instructions/explore.md` line 21 — caveman suspension block
- `skills/universal/caveman/SKILL.md` — confirmed exists
- `openspec/specs/command-wrappers/spec.md` lines 5, 9, 13
- `openspec/specs/design-instruction/spec.md` line 14
- `openspec/specs/explore-crystal-full-output/spec.md` lines 3–56 (entire spec)
- `openspec/specs/extract-bodies/spec.md` lines 46, 60
- `openspec/specs/install-command-overwrite/spec.md` lines 17, 21, 25
- `openspec/specs/install-scripts-update/spec.md` lines 5, 12, 21, 27, 36, 42, 56
- `openspec/specs/npx-installer/spec.md` lines 99, 107–108, 141, 161
- `openspec/specs/sai-command-registry/spec.md` line 31
- `openspec/specs/sai-design-command/spec.md` lines 32–37
- `openspec/specs/sai-instructions-namespace/spec.md` line 16
- `openspec/specs/sai-skills-fetch-update/spec.md` lines 11, 22, 29
- `openspec/specs/thin-wrappers/spec.md` lines 58, 67, 78
- `openspec/specs/token-efficient-languages-commands/spec.md` line 9
- `INSTALL.claude.md` lines 50–52, 84–86
- `INSTALL.opencode.md` lines 53–55, 110–112
- `bin/install-flow.js` lines 140–141, 190–191
- `test/install-claude.test.js` lines 48, 67, 77, 84
- `test/install-opencode.test.js` lines 35, 86, 96

**External URLs**: None consulted.

## Additional Notes

- `explore-crystal-full-output` spec is entirely dedicated to the caveman suspension behavior. The entire spec becomes vestigial — it should be gutted to empty or deleted outright during `update-active-specs`.
- `sai-instructions-namespace` spec line 16 lists `caveman.md` as an expected file under `sai/instructions/`. The implementer should check if `sai/instructions/caveman.md` exists (it was not found during audit of instructions files) and remove it from the namespace spec's expected file list regardless.
- `command-wrappers` and `sai-skills-fetch-update` specs reference loading `~/.claude/sai/instructions/caveman.md` (an instruction-layer file distinct from the universal skill). If this file exists, it should be deleted; if not, references should simply be removed.
- `token-efficient-languages` skill and its commands are **out of scope** — they handle think-in-English and artifact language policy, which remain in force. The `token-efficient-languages-commands` spec references caveman only as a structural pattern example (line 9); that reference should be updated to use a different example.
- All archived proposals under `openspec/changes/archive/` are historical record — do not modify them.
