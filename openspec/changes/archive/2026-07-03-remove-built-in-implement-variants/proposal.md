## Why

Shipping two hard-coded opencode model-tier wrappers (`sai-3-implement-low`, `sai-3-implement-high`) bakes a cost/quality model preference into the shared install that every project inherits, even though the canonical `sai-3-implement` wrapper already has a sensible default and each project knows its own trade-off. Project-local commands already override globals by filename, so the correct surface for variants is the user's own per-project folder — not the shared install.

## What Changes

- Delete the two shipped opencode variant wrappers `commands/opencode/sai-3-implement-low.md` and `commands/opencode/sai-3-implement-high.md`, and remove every reference to them across docs and specs.
- Retire the `model-variant-wrappers` capability entirely — its premise (upstream ships model-tier duplicates) goes away.
- Keep the "one canonical wrapper per command per harness" rule, but clarify that project-local files in a harness's per-project folder are the supported way to ship custom variants — they do not violate the rule, which governs only the shared install.
- Introduce a harness-agnostic per-project override section in `README.md` listing each harness's project-local folder (opencode → `.opencode/commands/`, Claude Code → `.claude/commands/`, GitHub Copilot in VS Code → `.github/prompts/`) and covering both override patterns: (a) swapping an existing wrapper's model and (b) creating custom variant commands by copying and renaming the canonical file.
- Drop the two variant rows from the model reference table and the command registry, and remove variant mentions from `AGENTS.md`.
- **BREAKING** (docs/install surface only): `commands/opencode/` ships 2 fewer files. Users who already created local copies of the variant wrappers keep working — this removes the upstream variants, it does not ban having them.

## Capabilities

### New Capabilities
- `per-project-command-overrides`: harness-agnostic documentation of the project-local command folders and the two override patterns (model swap, custom variant) that let a project override or extend the shared wrapper set.

### Modified Capabilities
- `model-variant-wrappers`: the sole requirement (opencode-only `-low`/`-high` variants of `sai-3-implement`) is removed; the capability is retired.
- `command-wrappers`: the "single canonical wrapper per command per harness" requirement gains a scenario clarifying that project-local variant files are supported and do not violate the rule.
- `model-routing`: the "Command registry lists all active wrappers" scenario naming `sai-3-implement-low`/`-high` is replaced by a scenario pointing at per-project override as the supported variant mechanism.
- `sai-command-registry`: the registry no longer lists the two `sai-3-implement-low`/`-high` rows; the "all commands present" requirement asserts they are absent.

## Impact

- **Deleted files**: `commands/opencode/sai-3-implement-low.md`, `commands/opencode/sai-3-implement-high.md`.
- **Edited docs**: `README.md` (table rows + footnote removed; per-project override section expanded), `AGENTS.md` (prereq list, artifact table, mirror-discipline exception), `skills/universal/sai-commands/SKILL.md` (two registry rows removed).
- **Edited specs**: `model-variant-wrappers`, `command-wrappers`, `model-routing`, `sai-command-registry`, plus new `per-project-command-overrides`.
- **No runtime/product code changes** beyond docs/wrappers. `INSTALL.opencode.md`, `INSTALL.claude.md`, `INSTALL.copilot.md` keep their per-harness examples unchanged (each already points to / carries its own concrete example).
- **Out of scope / unchanged**: `commands/opencode/sai-3-implement.md` default model (`opencode-go/kimi-k2.6`); the historical archive proposal `openspec/changes/archive/2026-06-17-updated-models/proposal.md`.

## Proposal Research Documentation

**Local files**: `openspec/specs/model-variant-wrappers/spec.md`, `openspec/specs/command-wrappers/spec.md`, `openspec/specs/model-routing/spec.md`, `openspec/specs/sai-command-registry/spec.md`, `openspec/specs/install-documentation/spec.md`, `README.md` (lines 297-333), `AGENTS.md` (lines 78-84, 161, 195), `skills/universal/sai-commands/SKILL.md` (lines 25-27), `commands/opencode/sai-3-implement-low.md`, `commands/opencode/sai-3-implement-high.md`, `INSTALL.copilot.md` (lines 155-162).

**External URLs**: none.

## Additional Notes

- The existing `install-documentation` capability is scoped to `INSTALL.*.md` skill-copy steps and is unrelated to the README per-project override text; the override documentation is therefore a new `per-project-command-overrides` capability rather than a modification of `install-documentation`.
- The `sai-command-registry` requirement "all numbered and unnumbered commands present" already lists only canonical command names (the `-low`/`-high` rows were an addition in the SKILL.md file beyond that list); the delta makes the absence of variant rows explicit.
- README table row `implement (3)` and its `opencode-go/kimi-k2.6` value stay; only the two `implement-low (3) ¹` / `implement-high (3) ¹` rows and footnote `¹` are removed.
