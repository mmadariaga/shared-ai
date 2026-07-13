# Proposal: installer-cleanup

## Why

Two small polish items in `bin/install-flow.js` that surface as real signal: the Node.js DEP0190 deprecation warning fires on every run because two `spawnSync` calls in the opencode-bootstrap path use `shell: true` with array args (a documented security vector, not just a deprecation noise), and the end-of-run summary lines are printed for GitHub Copilot but skipped for Claude Code and Opencode, leaving those branches feeling half-finished. Both are surgical, no behavioral change to file copy semantics.

## What Changes

- In `bin/install-flow.js`, silence the Node.js DEP0190 deprecation warning for the two `childProcess.spawnSync` calls in the opencode-bootstrap path: the `opencode --version` probe (`probeOpencode`) and the `npm i -g opencode-ai@latest` installer call (`runOpencodeInstall`). Convert each call from the array-args form (`spawnSync('opencode', ['--version'], { shell: true })`) to the single-string form (`spawnSync('opencode --version', { shell: true })`). DEP0190 is specifically triggered by `shell: true` combined with array args; a hardcoded string literal with no metacharacters bypasses the warning while preserving `cmd.exe` `.cmd`/`.bat` resolution on Windows.
- In `bin/install-flow.js`, add three post-install summary lines to the Claude Code branch in `main()` after `installClaude()` returns: `Claude commands installed to: <base>/commands`, `Claude SAI commands/instructions installed to: <base>/sai`, `Claude skills installed to: <base>/skills`.
- In `bin/install-flow.js`, add three post-install summary lines to the Opencode branch in `main()` after `installOpencode()` and `copyOpencodeConfig()` return: `Opencode commands installed to: <base>/commands`, `Opencode SAI commands/instructions installed to: <base>/sai`, `Opencode skills installed to: <base>/skills`.
- Summaries are printed in `main()` (same placement as the existing Copilot block) — never inside the install functions — so the install functions stay pure I/O and stay reusable for the `--help` / dry-run paths.
- The shared post-install reminder line `Reminder: run 'npx github:mmadariaga/shared-ai setup' in each project to configure the SAI workflow.` is preserved unchanged across all three harnesses.
- The non-TTY branch of `offerOpencodeInstall` is preserved: when stdin is not a TTY, the manual install command is still printed directly, and the post-install summaries (if the Opencode branch ran) still go to stdout afterwards.

Non-goals: no changes to file copy rules, overwrite/skip semantics, the interactive checklist, the opencode config merge logic, the existing `opencode.json(c)` agent-key merge behavior, the bootstrap non-blocking contract (file-copy still runs regardless of detection/install outcome), the `--help` flag, or the post-install reminder line.

## Capabilities

### New Capabilities
- `installer-post-install-summaries`: end-of-run summary lines that name the populated base directories for each harness — three lines for Claude Code (commands, SAI, skills), three lines for Opencode (commands, SAI, skills), four lines for GitHub Copilot (prompts, SAI, skills, agents) — printed in `main()` after the install functions return and before the post-install reminder. The slight asymmetry (3 vs 4) is intentional: summaries are emitted only for directories the harness actually populates.

### Modified Capabilities
- `installer-opencode-cli-bootstrap`: the `Opencode binary detection` and `npm install invocation mechanism` requirements change from the array-args `spawnSync` form (`spawnSync('opencode', ['--version'], { shell: true })`) to the single-string form (`spawnSync('opencode --version', { shell: true })`). DEP0190 is specific to `shell: true` + array args; the string form silences the warning while preserving `cmd.exe` `.cmd`/`.bat` resolution on Windows. No helper, no engine bump, no pre-check.

## Impact

- **Modified files**: `bin/install-flow.js` only.
  - `bin/install-flow.js`:
    - `probeOpencode()`: convert `spawnSync('opencode', ['--version'], { shell: true, stdio: 'ignore' })` to `spawnSync('opencode --version', { shell: true, stdio: 'ignore' })`.
    - `runOpencodeInstall()`: convert `spawnSync('npm', ['i', '-g', 'opencode-ai@latest'], { shell: true, stdio: 'inherit' })` to `spawnSync('npm i -g opencode-ai@latest', { shell: true, stdio: 'inherit' })`.
    - `main()` Claude branch: add three `console.log` summary lines after `installClaude()`.
    - `main()` Opencode branch: add three `console.log` summary lines after `installOpencode()` and `copyOpencodeConfig()`.
- **No changes** to `package.json` (engines.node stays at `>=18`), `bin/install.js`, `bin/setup.js`, `commands/`, `sai/`, `skills/`, `configs/`, or any documentation file.
- **No new dependencies**.
- **Behavior preservation**: identical files copied to identical destinations, identical overwrite/skip rules, identical opencode config merge logic, identical non-TTY print path, identical post-install reminder, identical `--help` output. The only observable changes are: no DEP0190 warning on every run, and three new summary lines at end of run for Claude/Opencode users.
- **Cost impact**: zero. The string-form conversion is a one-line change per call site; the new summary lines are three `console.log` calls per affected branch.
- **Platform impact**: none. The string form with `shell: true` continues to rely on `cmd.exe` for `.cmd`/`.bat` resolution on Windows, so no Node version floor change is required.

## Proposal Research Documentation

**Local files**:
- `bin/install.js` (entry point — dispatches to `install-flow`; confirms the change is scoped to `install-flow.js` only)
- `bin/install-flow.js` (the file being modified — `probeOpencode`, `runOpencodeInstall`, `main` Claude/Opencode/Copilot branches)
- `test/install-opencode.test.js` (existing `node:test` coverage — asserts `probeOpencode` exit-code semantics and the `offerOpencodeInstall` TTY/no-TTY/install-failure paths; function signatures are preserved by this change so tests should still pass)
- `test/install-claude.test.js` (existing `node:test` coverage — asserts `installClaude` file-copy behavior; signatures preserved)
- `test/copy-helpers.test.js` (existing `node:test` coverage for the file-copy helpers used by the install functions; unaffected by this change)
- `openspec/changes/installer-cleanup/specs/installer-opencode-cli-bootstrap/spec.md` (capability being modified — rewrites the `Opencode binary detection` and `npm install invocation mechanism` requirements to use the single-string `spawnSync` form)
- `openspec/changes/installer-cleanup/specs/installer-post-install-summaries/spec.md` (new capability — pins the three Claude lines, the three Opencode lines, the asymmetry rationale, the multi-harness if-block order, and the unchanged Copilot four-line block)
- `openspec/changes/installer-cleanup/specs/install-script/spec.md` (installer file map — confirms `installClaude()` and `installOpencode()` copy to the same `~/.claude/...` and `~/.config/opencode/...` paths the new summary lines reference)
- `openspec/changes/installer-cleanup/specs/install-command-overwrite/spec.md` (related — `copyWithWarn` / `copySkipIfExists` semantics unchanged by this change)
- `openspec/changes/installer-cleanup/specs/install-distribution/spec.md` (related — `installClaude()` / `installOpencode()` function contracts unaffected)
- `openspec/changes/installer-cleanup/specs/opencode-config-message/spec.md` (related — `copyOpencodeConfig` parse-fallback message wording unchanged; the Opencode summary lines are printed AFTER `copyOpencodeConfig()` returns, so the parse-fallback message and the summary lines compose cleanly)
- `openspec/changes/installer-cleanup/specs/spec-quality/spec.md` (Completion-phase decision-summary contract — the spec-quality `Decision summary` block printed before the mandatory stop; this proposal must satisfy the hard 15-line cap, scope + requirements blocks, and source-grounding rules)
- `GLOSSARY.md` (no new terms introduced; the change touches installer internals, not the pipeline's domain language)

**External URLs**: (none)

## Additional Notes

- `bin/setup.js:47` still uses `shell: true` for `spawnSync('openspec', ['init'], …)`. That call is out of scope here; if the same DEP0190 cleanup is wanted for it, a follow-up change can apply the same string-form conversion. Keeping this change tight avoids expanding scope.
- The Copilot summary block uses `console.log` with template literals that interpolate the `COPILOT_*_BASE` constants (full paths). The new Claude and Opencode lines should follow the same style — `path.join(CLAUDE_BASE, 'commands')` etc. — so the output format stays consistent across harnesses.
- Source-grounding check (per the spec-quality source-grounding rule): the `Opencode binary detection` MODIFIED requirement changes the `spawnSync` call shape from array-args to string; the literal strings `opencode --version` and `npm i -g opencode-ai@latest` are preserved quotes of the existing `OPENCODE_INSTALL_CMD` constant at `bin/install-flow.js:50` and the existing probe command. The `Reminder: run 'npx github:mmadariaga/shared-ai setup' …` literal pinned in the new asymmetry requirement matches the `console.log` at `bin/install-flow.js:502-504` verbatim. No preserved literals diverge from current source.
- Spec-proposal self-consistency check (per the spec-quality proposal-to-spec gate): the proposal's "What Changes" describes the same single-string `spawnSync` form the MODIFIED requirements pin; the proposal's "summaries are printed in `main()`" matches the new `installer-post-install-summaries` requirements; the proposal's "asymmetry is intentional" matches the new asymmetry requirement (which now also pins the multi-harness if-block order). No contradictions.
- Test plan: the installer has existing `node:test` coverage in `test/install-opencode.test.js` (asserting `probeOpencode` exit-code semantics and the `offerOpencodeInstall` TTY/no-TTY/install-failure paths) and `test/install-claude.test.js` (asserting `installClaude` file-copy behavior). My change preserves the `probeOpencode` / `runOpencodeInstall` / `offerOpencodeInstall` / `installClaude` / `installOpencode` / `copyOpencodeConfig` signatures, so those tests should continue to pass with the new string-form `spawnSync` calls. The test assertion at L385 currently asserts `shell: true`; it should be updated to also assert the string-form call shape. The new `main()` post-install summary lines (Claude 3, Opencode 3, Copilot 4, plus the multi-harness if-block order) are not covered by the existing tests and would benefit from a new test file (`test/install-summaries.test.js` or similar) that injects a stubbed `console.log` capture and asserts the exact output per branch — this is a follow-up test work, not a blocker for the spec phase, but `sai-3-implement` should plan for it.
