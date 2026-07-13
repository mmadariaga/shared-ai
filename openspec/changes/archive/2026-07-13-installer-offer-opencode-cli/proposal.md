## Why

The installer copies SAI's files into `~/.config/opencode/` but silently assumes the `opencode` CLI already exists, so a fresh machine ends up half-wired with no signal. This change closes the bootstrapping gap for the primary target while preserving user control and CI-safety.

## What Changes

- When the user selects the Opencode target, the installer probes whether the `opencode` binary is on PATH before considering itself done.
- When the binary is present, the installer says and does nothing new — the existing file-copy runs unchanged.
- When the binary is absent **and** a TTY is present, the installer prompts `Install opencode now? [y/n]`; on confirmation it runs the documented install command, on decline it prints that command.
- When the binary is absent **and** no TTY is present (CI / piped), the installer prints the install command and never prompts or executes anything.
- The file-copy runs regardless of the install probe/offer outcome; a failed, declined, or skipped install never aborts the installer.
- Introduces the first use of `child_process` inside `bin/install-flow.js` (Node built-in — no new npm dependency).

## Capabilities

### New Capabilities
- `installer-opencode-cli-bootstrap`: detect the `opencode` binary during the Opencode install branch; when absent, interactively offer to install it (TTY) or print the install command (no-TTY / declined). Independent of and non-blocking for the file-copy.

### Modified Capabilities
<!-- none -->

## Impact

- **Code**: `bin/install-flow.js` — the Opencode branch in `main()` (currently `installOpencode()` + `copyOpencodeConfig()`) gains a binary-detection + offer step. New `child_process.spawnSync` usage; `readline` is already required.
- **Tests**: `test/install-opencode.test.js` — new cases covering binary-present (no prompt), missing+TTY+yes (runs command), missing+TTY+no (prints command), missing+no-TTY (prints command, no prompt).
- **Dependencies**: none added — `child_process` is a Node built-in.
- **Docs/ADR**: warrants a new ADR (next number after ADR 0031) recording that the installer may now execute an external installer, gated behind an interactive `y/n` + TTY guard.
- **Non-goals**: codegraph (stays the explore-mode notice) and any per-project setup step (codegraph init, MCP registration) — those belong to `setup`, not the global installer.

## Proposal Research Documentation

**Local files**:
- `bin/install-flow.js` — `installOpencode(destBase)`, `copyOpencodeConfig(destBase)`, `main()` Opencode branch, existing `readline` import and `process.stdin.isTTY` guard in `promptChecklist`.
- `bin/setup.js` — existing `spawnSync`/`execSync` usage and `readline.createInterface` line-prompt pattern to mirror.
- `test/install-opencode.test.js` — `node:test` + `node:assert/strict` style, temp-dir + `console.log` monkey-patch patterns to mirror.
- `docs/adr/0031-permit-declared-npm-dependencies-in-installer.md` — format/precedent for the new ADR.
- `package.json` — dependencies and `engines.node >= 18`.

**External URLs**:
- https://github.com/sst/opencode — official README, install methods.
- https://opencode.ai/docs/ — official docs.
- https://registry.npmjs.org/opencode-ai — confirmed published npm package name (`opencode-ai`, dist-tag `latest`).

## Additional Notes

- **Verified install command**: the official npm package is `opencode-ai` (NOT `opencode`); the documented global-install command is `npm i -g opencode-ai@latest`. The binary that lands on PATH is `opencode`. The npm route is chosen for portability (npm is guaranteed under `npx`); `curl … | bash` is not Windows-portable.
- **Detection signal**: probe via `opencode --version`, resolved through the platform PATH. It MUST use Windows-safe resolution (`where`/`which` and/or `spawnSync(..., { shell: true })`, mirroring `bin/setup.js:27,47` for `openspec`); a bare `spawnSync('opencode', ['--version'])` without `shell: true` throws `ENOENT` on Windows for global npm `.cmd` shims and would misclassify an installed binary as absent — this project is currently developed on Windows, so that path is not acceptable. Treat "not found" (or a non-zero exit) as "absent". A config-dir existence check was rejected — it proves "ran once", not "binary installed".
- **Confirm mechanism**: reuse `readline` (line-interface pattern from `bin/setup.js`), not the raw-keypress checklist widget.
- **`--version` note**: `opencode --version` follows CLI convention but is not verbatim-documented in the official docs; the probe treats any non-zero / not-found result as absent, so the exit-code dimension is robust either way. (The PATH-resolution dimension is handled by the Windows-safe requirement above, not by the exit code.)

### Design-phase notes (for `/sai-2-design` — deferred, not resolved here)

- **Test seam for "runs the command"**: `bin/install-flow.js` calls built-ins directly with no injection point, and existing tests (`test/install-opencode.test.js`) only monkey-patch `console.log`. To assert "npm was invoked" without actually running a global install, the design needs a seam — stub/inject the `child_process` spawn (and the probe). The `missing+TTY+yes` test case depends on this.
- **Execution mechanism**: how the install command is run — through a shell (`npm` on Windows is `npm.cmd`, same PATH-resolution concern as the probe) and with `stdio: 'inherit'` so the user sees npm's progress — is a design decision.
- **Ordering**: the offer is functionally independent of the file-copy (either order is correct), but running the offer *before* the copy is better UX. Worth pinning one line in design.
- **Raw-mode → readline handoff (risk)**: `promptChecklist` leaves stdin via `setRawMode(false)` + `pause()`; the new `readline` line-prompt must re-resume stdin. A known-finicky interaction — flag as a design risk to verify, not a spec requirement.
