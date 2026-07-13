## Why

`sai-explore` already recommends CodeGraph passively for structural research (`explore-codegraph-fallback-notice`), but neither installer offers a real install path, so the recommendation dead-ends. Wiring a soft, opt-in CodeGraph install into both installers turns that passive advice into an actionable path — without ever gating a project on it.

## What Changes

- Add a reusable `offerCodegraphInstall()` helper to `bin/install-flow.js` that, when the `codegraph` binary is absent, offers (on a TTY) to run the two global setup steps — `npm i -g @colbymchenry/codegraph` (CLI) then `codegraph install` (MCP wiring) — and otherwise prints both commands. Exported for reuse.
- When the `codegraph` binary is **present**, print a one-line, print-only MCP-wiring hint (`codegraph install`) instead of returning silently — closing the "inert CLI" gap (CLI installed but MCP never wired) without prompting the already-wired majority and without reimplementing codegraph's per-agent detection. No prompt, no execution in this branch.
- Export the two install command strings as named constants (mirroring `OPENCODE_INSTALL_CMD`) so the new tests can assert on them for parity with the opencode tests.
- Invoke the offer **once, editor-agnostic**, in the install flow — not nested inside the Opencode branch (unlike the existing `offerOpencodeInstall()`).
- Add `ensureCodegraphIndex()` to `bin/setup.js` that runs `codegraph init` with `cwd` = project path when the project has no `.codegraph/` **and** the `codegraph` binary is present, mirroring how `ensureOpenspecDir()` runs `openspec init`. When the binary is still absent (e.g. a non-TTY soft-offer only printed the commands), init is cleanly skipped rather than attempted-and-failed.
- Reuse `offerCodegraphInstall()` from `bin/setup.js` as a **soft** prerequisite so a standalone `setup` run can still bootstrap the CLI before the per-project init.
- Keep every step non-blocking: no `process.exit` on a missing CodeGraph binary or index, unlike the `openspec` hard gate (`checkOpenspecCli`).
- Add test coverage mirroring `test/install-opencode.test.js`; preserve all existing tests.

## Capabilities

### New Capabilities
- `installer-codegraph-cli-bootstrap`: the reusable `offerCodegraphInstall()` global offer in `install-flow.js` — binary probe, TTY-aware prompt, bundled two-command global install (CLI + MCP wiring), print-only fallback, exported and invoked once editor-agnostically.
- `setup-codegraph-index-bootstrap`: the `ensureCodegraphIndex()` per-project init in `setup.js` — non-interactive `codegraph init` scoped to the project path when `.codegraph/` is absent, plus the shared offer as a soft prerequisite, all non-blocking.

### Modified Capabilities
<!-- None. -->

## Impact

- **Code**: `bin/install-flow.js` (new helper + constants + export + call site), `bin/setup.js` (new `ensureCodegraphIndex()` + soft-offer wiring).
- **Tests**: new coverage mirroring `test/install-opencode.test.js`; existing tests preserved.
- **External dependency**: the `@colbymchenry/codegraph` npm package and its `codegraph` binary (optional at runtime — never required).
- **No breaking changes.** A project can still be fully set up with no CodeGraph binary and no index.

## Proposal Research Documentation

**Local files**:
- `bin/install-flow.js` — `offerOpencodeInstall()`, `probeOpencode()`, `runOpencodeInstall()`, `promptYesNoReadline()`, `OPENCODE_INSTALL_CMD`, `module.exports` shape, Opencode-branch call site.
- `bin/setup.js` — `ensureOpenspecDir()`, `checkOpenspecCli()`, `projectPath` derivation, current absence of any `install-flow.js` import.
- `test/install-opencode.test.js` — `node:test` framework, `childProcess.spawnSync` reassignment stubbing pattern.
- `openspec/specs/installer-opencode-cli-bootstrap/spec.md` — sibling soft-offer spec (probe/TTY/print requirements, DEP0190 string-literal rationale).
- `openspec/specs/explore-codegraph-fallback-notice/spec.md` — canonical CodeGraph URL and the human-facing `codegraph init -i` recommendation.

**External URLs**:
- https://github.com/colbymchenry/codegraph — CodeGraph project (canonical URL reused from `explore-codegraph-fallback-notice`).

## Additional Notes

- **Three-step model.** CodeGraph is a three-step tool: (1) `npm i -g @colbymchenry/codegraph` installs the CLI, (2) `codegraph install` wires the MCP into every agent it auto-detects, (3) `codegraph init` builds the per-project index. Steps 1+2 are bundled in `offerCodegraphInstall()` because the CLI does nothing until the MCP is wired; step 3 lives in `ensureCodegraphIndex()`. Only step 3 is the "just like openspec" analog; steps 1–2 have no openspec counterpart.
- **Why `npm i -g`, not `npx`.** The explicit global install leaves a persistent `codegraph` binary on PATH, which `setup.js` needs for `codegraph init`; the `npx @colbymchenry/codegraph` one-shot would leave nothing for step 3.
- **Non-interactive init.** `setup.js` runs plain `codegraph init` (mirroring `ensureOpenspecDir`'s `openspec init`), NOT the interactive `codegraph init -i` form that `explore-codegraph-fallback-notice` recommends to humans.
- **Broader MCP wiring accepted.** `codegraph install` auto-detects and wires every agent it finds — broader than the SAI editor checklist. Narrowing it is out of scope; that command is auto-detect by design.
- **Existing pattern to mirror.** `probeOpencode()` uses `childProcess.spawnSync('opencode --version', { shell: true, stdio: 'ignore' })` and installs via `spawnSync('npm i -g opencode-ai@latest', { shell: true, stdio: 'inherit' })` — single string literal + `shell: true`, chosen to silence Node DEP0190 while preserving Windows `.cmd` shim resolution. The codegraph probe/installs SHOULD follow the same string-literal form. `ensureOpenspecDir()` runs `spawnSync('openspec', ['init'], { cwd: projectPath, stdio: 'inherit', shell: true })`; `codegraph init` mirrors the `cwd`-scoped form.
- **CLI-present wiring gap, and why a hint (not a prompt).** The `codegraph --version` probe detects the CLI but not whether `codegraph install` has wired the MCP into the user's agents (the separable step-2 state the proposal calls the "inert CLI" problem). Probing wiring state was rejected: it would mean re-inspecting every agent's config across OS variants — logic that lives inside `codegraph install` itself and rots as codegraph adds agents. Since `codegraph install` is auto-detect and idempotent, re-running when already wired is a harmless no-op, so the CLI-present branch prints a one-line hint rather than prompting (which would nag the already-wired majority every run). The interactive prompt stays only in the CLI-absent branch where action is known to be required.
- **Exported command constants (for `/sai-2-design`).** The two command strings are exported as named constants for test parity with `OPENCODE_INSTALL_CMD`; the exact constant names are left to design.
- **Accepted limitation — `.codegraph/` is a coarse "index exists" signal.** `ensureCodegraphIndex()` treats any `.codegraph/` directory as complete and skips, so a partial or aborted index dir would be misread as done. This mirrors `ensureOpenspecDir()`'s `fs.existsSync` simplicity and is accepted; codegraph's `init` is heavier than openspec's, so the failure mode is somewhat more likely — noted, not addressed here.
- **Open design detail (for `/sai-2-design`).** Whether `setup.js` imports `offerCodegraphInstall` from `install-flow.js` directly or the helper is relocated to a shared module is left to the design phase; `setup.js` currently imports nothing from `install-flow.js`.
