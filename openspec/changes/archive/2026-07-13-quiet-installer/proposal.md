## Why

The shared-ai installer emits ~120 per-file `Overwriting <path>` / `Creating <path>` / `Skipping <path>` lines on every re-run, drowning the useful per-harness summary. The `installOpencode` path also still calls `copySkipIfExists` for `commands/opencode/*.md`, so Opencode wrappers are never refreshed on reinstall — a latent bug that drifts users off the supported version. Both are installer-side fixes: the per-file "X already exists" log is the wrong abstraction (the installer is a declarative repo→user-global sync, not a file-by-file installer), and the Opencode skip branch has no design justification in the current spec — project-level overrides have always lived at `.opencode/commands/` (per `openspec/specs/install-command-overwrite/spec.md` and the harness-universality invariant), so overwriting `~/.config/opencode/commands/` is safe and gives users a true refresh on re-run.

## What Changes

- Drop the per-file `Overwriting <dest>` and `Creating <dest>` lines emitted by `installClaude`, `installOpencode`, and `installCopilot` in `bin/install-flow.js`.
- Drop the per-file `Skipping <dest> (already exists)` line emitted by `copySkipIfExists` and remove the `copySkipIfExists` call from `installOpencode` (currently used for `commands/opencode/*.md`), so Opencode wrappers are always refreshed on reinstall, matching `installClaude` and `installCopilot`.
- **BREAKING** for the installer's internal API: delete the `copyWithWarn` and `copySkipIfExists` helper functions from `bin/install-flow.js` and remove them from the module's exports. The package's public surface is the `shared-ai` bin, not the helpers, and a repo-wide grep confirms no other module imports them.
- Replace every `copyWithWarn(src, dest)` call site in `installClaude` / `installOpencode` / `installCopilot` with a plain `copy(src, dest)`. The behavior of `copy` is unchanged (`fs.copyFileSync` overwrites by default and creates parent dirs).
- Update tests in `test/copy-helpers.test.js`, `test/install-claude.test.js`, and `test/install-opencode.test.js` to drop the per-file log assertions and the `copySkipIfExists` / "skips existing vendor command files" tests; invert the two "skips existing vendor command files" tests to assert the vendor command wrapper IS overwritten.
- Fix the silently-stale `installClaude skips existing vendor command files` test in `test/install-claude.test.js` (the function was changed to always overwrite but the test was not updated).
- The per-harness summary lines printed by `main()` (e.g. `Claude commands installed to: …`, `Opencode commands installed to: …`, `Copilot prompt files installed to: …`) and the shared `Reminder: run 'npx …'` line are kept — they are signal, not noise.
- The informational line printed by `copyOpencodeConfig` after a successful agent-keys merge (`Added opencode agent keys to <path>: <keys>. Adjust the placeholder model "<model>" to your preferred low-cost provider.`) is kept — it is a config-mutation notice, not a per-file copy log.
- No behavior change for project-level overrides: `.opencode/commands/`, `.claude/commands/`, and `.github/prompts/` continue to take precedence over user-globals, so an overwrite at the global level never silently overrides a project-level customization.

## Capabilities

### New Capabilities

- *(none)*

### Modified Capabilities

- `install-command-overwrite`: change the installer's file-copy semantics from "overwrite with per-file warning" to "overwrite silently" for every harness (Claude Code, Opencode, GitHub Copilot). The "overwrite" half stays; the "with warning" half is removed. The Opencode `commands/opencode/*.md` path is corrected from "skip if exists" to "overwrite", matching the other two harnesses.

## Impact

- `bin/install-flow.js`
  - `copyWithWarn` (lines 166–174) — removed.
  - `copySkipIfExists` (lines 176–182) — removed.
  - `installClaude` (lines 210–262) — every `copyWithWarn(...)` call replaced with `copy(...)`.
  - `installOpencode` (lines 320–376) — the `copySkipIfExists(...)` call for `commands/opencode/*.md` (line 324) replaced with `copy(...)`; every other `copyWithWarn(...)` call replaced with `copy(...)`.
  - `installCopilot` (lines 264–318) — every `copyWithWarn(...)` call replaced with `copy(...)`.
  - `module.exports` (lines 520–537) — `copyWithWarn` and `copySkipIfExists` removed from the export list.
  - `copyOpencodeConfig` (lines 438–461) — unchanged (the agent-merge informational line is kept).
  - `main()` (lines 471–511) — unchanged (per-harness summary lines and the shared reminder are kept).
- `test/copy-helpers.test.js`
  - Drop the four tests for `copyWithWarn` / `copySkipIfExists` (lines 32–83). The bare `copy` tests at lines 11–30 are kept and remain sufficient.
  - Drop `copyWithWarn, copySkipIfExists` from the destructured import on line 9.
- `test/install-claude.test.js`
  - Drop the `installClaude copies sai/instructions/*.md with Overwriting warn` test (lines 32–43) — it asserts on the per-file log line that is being removed.
  - Replace the `installClaude skips existing vendor command files` test (lines 57–65) with an inverse `installClaude overwrites existing vendor command files` test that pre-populates `commands/sai-1-spec.md` with sentinel content and asserts the file content after install equals the repo version, not the sentinel.
- `test/install-opencode.test.js`
  - Drop the `installOpencode copies sai/instructions/*.md with Overwriting warn` test (lines 26–35) — same reason.
  - Replace the `installOpencode skips existing vendor command files` test (lines 83–91) with an inverse `installOpencode overwrites existing vendor command files` test mirroring the Claude variant.
  - The `installOpencode overwrites stale command wrappers and logs` test (lines 93–106) loses its `m.startsWith('Overwriting')` assertion (kept only the file-content assertion, which already passes with plain `copy`).
- `test/install-summaries.test.js` — unchanged (asserts the per-harness summary lines that are being preserved).
- Project-level override files (`.opencode/commands/`, `.claude/commands/`, `.github/prompts/`) — unchanged; precedence over user-globals still holds.
- `INSTALL.claude.md`, `INSTALL.opencode.md`, `INSTALL.copilot.md` — unchanged in narrative; the documented post-install `npx … setup` reminder line is preserved.

## Proposal Research Documentation

**Local files**:

- `bin/install-flow.js` — `copy` (line 161), `copyWithWarn` (lines 166–174), `copySkipIfExists` (lines 176–182), `installClaude` (lines 210–262), `installOpencode` (lines 320–376), `copyOpencodeConfig` (lines 438–461), `main()` per-harness summary block (lines 471–511), `module.exports` (lines 520–537).
- `test/copy-helpers.test.js` — `copyWithWarn` / `copySkipIfExists` test block (lines 32–83), import list (line 9).
- `test/install-claude.test.js` — per-file log test (lines 32–43), stale `installClaude skips existing vendor command files` test (lines 57–65), `installClaude overwrites stale command wrappers and logs` test (lines 67–80).
- `test/install-opencode.test.js` — per-file log test (lines 26–35), `installOpencode skips existing vendor command files` test (lines 83–91), `installOpencode overwrites stale command wrappers and logs` test (lines 93–106).
- `test/install-summaries.test.js` — kept; asserts the per-harness summary lines that are preserved.
- `openspec/specs/install-command-overwrite/spec.md` — the existing capability whose requirements are being modified.
- `openspec/specs/installer-post-install-summaries/spec.md` — the existing capability that pins the per-harness summary lines that are being preserved (no change).

**External URLs**:

- *(none — pure in-tree refactor; no external API or documentation change.)*

## Additional Notes

- The "is anything already installed" signal users lose is partially recovered by the per-harness summary line that follows each `install*` call, plus the shared `Reminder: run 'npx … setup'` line. A user who wants per-file detail can `ls -la` the target dir or `diff` the repo against the destination.
- The `copyOpencodeConfig` "Added opencode agent keys to <path>: <keys>. Adjust the placeholder model '<model>' to your preferred low-cost provider." line is a config-mutation notice (a JSONC merge wrote bytes to disk), not a file-copy log — it stays.
- The `Reminder: run 'npx github:mmadariaga/shared-ai setup' in each project to configure the SAI workflow.` line stays as the final line of `main()`.
- The only `console.log` callers of `Overwriting` / `Creating` / `Skipping` in the repo are the three log lines inside `install-flow.js` (lines 168, 170, 178). The `INSTALL.claude.md`, `INSTALL.opencode.md`, and `INSTALL.copilot.md` docs contain the literal string `Overwriting` inside user-side `echo` / `Write-Host` examples for manual copy scripts, but those run in the user's shell, not the installer, and are deliberately unchanged. The refactor is local to `bin/install-flow.js`.
- `copyWithWarn` and `copySkipIfExists` are exported from `install-flow.js` but no other module imports them (verified by repo-wide grep on `bin/` and `test/`). The BREAKING label is a defensive marker for any out-of-tree consumer; the in-tree impact is zero.
- The latent `installClaude skips existing vendor command files` test has been failing silently because `installClaude` was changed to always overwrite but the test was not updated. Inverting it doubles as the bug fix and the regression guard.
