## Why

Shared-ai spreads across a constellation of magic paths (user-global dirs for Claude Code, opencode, and Copilot; project-local overrides; per-harness `Fetch @` resolution rules), and the installer is silent on partial success — a single misplaced file leaves every `sai-*` wrapper failing with the same opaque "file not found". A `doctor` gives the user one command that diffs their actual install against the layout the repo defines, names the missing pieces, and recommends the fix.

## What Changes

- Add `bin/doctor.js` — a dependency-free, read-only diagnostic that inventories the install across all three harnesses plus the project's OpenSpec state and prints a per-harness + `[Project health]` report with an aggregate exit code.
- Invocation is `npx github:mmadariaga/shared-ai doctor` only (no slash command); the `doctor` subcommand is routed by the `bin/install.js` dispatcher to `bin/doctor.js`, mirroring the existing `uninstall` route.
- The installer writes a `.version` marker (package.json `version`) into each harness user-global dir it populates, so the doctor can report clean version skew.
- Checks: harness file inventory (present / missing / unexpected), `Fetch @` target resolution per installed wrapper, project health (absorbs the existing `prereqs.md` checks), OpenSpec skill staleness (`generatedBy` vs CLI version), and version skew (`.version` marker vs latest `package.json` on `main`, with a file-diff fallback).
- `--json` flag for machine-readable output; exit `0` when all green, `1` when any check is red (CI-usable).
- Add a docs entry describing the `doctor` invocation.

## Capabilities

### New Capabilities
- `doctor-cli`: the `doctor` subcommand entry point — dispatcher routing to `bin/doctor.js`, built-ins-only/no-deps constraint, read-only guarantee, per-harness + `[Project health]` sectioned output, `--json` flag, and aggregate `0`/`1` exit code.
- `doctor-harness-inventory`: auto-detect which harnesses are installed (user-global dir present) and report each harness's expected files as present, missing, or unexpected.
- `doctor-fetch-resolution`: for every installed wrapper, verify each `Fetch @` reference resolves to a real file under the harness's own resolution order (project-local override then user-global fallback), flagging dangling references.
- `doctor-project-health`: verify `openspec/` exists, `openspec/config.yaml` declares `schema: sai-workflow`, and the `openspec` binary is on PATH — absorbing the three `prereqs.md` checks into a `[Project health]` section.
- `doctor-skill-staleness`: for each project-local OpenSpec skill, compare its `generatedBy` frontmatter against the installed OpenSpec CLI version and flag stale skills needing `openspec init` re-run.
- `doctor-version-skew`: read the `.version` marker when present and compare against the latest `package.json` fetched from `raw.githubusercontent.com/.../main`; fall back to a file-diff against the fresh repo when the marker is absent or untrusted.
- `installer-version-marker`: the installer writes the package.json `version` to a `.version` file in each harness user-global dir it populates.

### Modified Capabilities
<!-- None. The doctor is read-only and additive; the installer change is captured as the new `installer-version-marker` capability rather than modifying an existing install requirement. -->

## Impact

- **New file**: `bin/doctor.js` (Node built-ins only: `fs`, `path`, `os`, `https`/`readline` as needed).
- **`bin/install.js`**: one dispatcher branch routing `doctor` → `bin/doctor.js` and naming `doctor` in the usage/unknown-subcommand strings (currently `bin/install.js:18–29`, listing `[install|setup|uninstall]`).
- **`bin/install-flow.js`**: each of `installClaude` / `installOpencode` / `installCopilot` writes the `.version` marker into its harness base dir (constants at `bin/install-flow.js:22–43`).
- **Docs**: a new entry describing the `doctor` invocation.
- **Dependencies**: none added — `package.json` `bin`/`files` already ship `bin/`.
- **No edits** to `sai/commands/`, `sai/instructions/`, `commands/{claude,opencode,copilot}/`, or any wrapper; no new skill or instruction file.

## Proposal Research Documentation

**Local files**: `bin/install.js` (dispatcher routing, lines 18–29); `bin/install-flow.js` (harness base-dir constants lines 22–43, install functions, wrapper source dirs); `package.json` (version `1.0.0`, `bin`, `files`); `skills/copilot/fetch/SKILL.md` (Copilot `Fetch @` resolution order, lines 15–23); `skills/fetch/SKILL.md` (Claude `Fetch @` resolution); `sai/instructions/prereqs.md` (the three project-health checks); `openspec/specs/shared-ai-uninstall/spec.md` (subcommand-routing precedent); `openspec/specs/npx-installer/spec.md` (installer structure, no-deps rule); `.claude/skills/openspec-explore/SKILL.md` (`generatedBy: "1.3.1"` frontmatter example).

**External URLs**: `https://raw.githubusercontent.com/mmadariaga/shared-ai/main/package.json` (latest-version source for the version-skew check).

## Additional Notes

- **Dispatcher edit is required and extends the brief's stated file scope.** `npx github:mmadariaga/shared-ai doctor` resolves to the package `bin` (`bin/install.js`), which routes subcommands; making `doctor` reachable requires a one-branch edit to `bin/install.js` (mirroring `uninstall` at lines 24–25/27). The original brief named only `bin/install-flow.js`; the `bin/install.js` route is a necessary addition, not a contradiction.
- **Harness base dirs** (from `bin/install-flow.js`): Claude `~/.claude` (:22); opencode `~/.config/opencode` (:23); Copilot prompts+`sai` under `%APPDATA%\Code\User` (Win) / `~/Library/Application Support/Code/User` (macOS) / `~/.config/Code/User` (Linux) (:25–43), plus Copilot skills/agents at `~/.copilot/{skills,agents}` (:47–48).
- **Fetch @ resolution is harness-specific**: Claude resolves `.claude/<subpath>` (project) then `~/.claude/<subpath>` (global); Copilot resolves `.github/sai/<subpath>` (project) then the SAI folder (`skills/copilot/fetch/SKILL.md:15–23`). The doctor's resolution check must apply each harness's own order, not one universal rule.
- **Copilot wrappers use the `.prompt.md` extension**; Claude/opencode use `.md`. Copilot appears twice in VS Code (user-global + project-local prompts) — the doctor reports a project-local override when present without assuming it is wrong.
- **Version marker**: package.json `version` is currently `1.0.0`. When the `.version` marker is absent (corrupt/pre-marker install), the doctor reports a file diff against the fresh repo instead of a numeric skew — strictly more actionable, but no at-a-glance version number.
- **Skill staleness grounding**: installed OpenSpec skills carry `generatedBy: "1.3.1"` while the local `openspec` CLI reports `1.4.1`, so the staleness check has a live positive case today.
- **Version comparison uses raw `package.json` on `main`**, not the GitHub tags API — there are no git tags yet and tags would add auth + rate-limit handling. Upgrade path stays open once tags exist.
