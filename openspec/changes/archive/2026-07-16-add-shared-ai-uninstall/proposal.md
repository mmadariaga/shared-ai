## Why

The `npx shared-ai` installer writes user-global files to many OS-aware destinations across three editors (Claude Code, opencode, GitHub Copilot), but offers no way to preview or reverse those writes; users must hunt down each destination by hand with no guarantee of completeness. A symmetric uninstall makes cleanup scriptable, and a `--dry-run` flag makes the operation auditable before commitment.

## What Changes

- Add an `uninstall` subcommand to the `npx shared-ai` CLI, routed by `bin/install.js`.
- `npx shared-ai uninstall` reverses the user-global install across all three targets, printing a pre-execution plan and asking for confirmation by default before deleting only files known to have been written by the installer.
- `npx shared-ai uninstall --dry-run` prints the operation plan (path, action, exists-on-disk, hash-matches-canonical) without touching the filesystem and exits 0.
- `npx shared-ai uninstall --yes` skips the confirmation prompt for CI / scripted use.
- The deletion set is derived by symmetric enumeration from the same source→destination logic that drives the install copy, not from a persisted install manifest.
- A per-file sha256 hash check keeps any file whose on-disk content diverges from the canonical repo version (a project-local override), printing a warning instead of deleting it.
- Re-running uninstall is idempotent: non-existent paths are silently skipped, now-empty installer-created directories are pruned up to (but not including) the editor base, and a summary reports deleted / kept-as-override / not-found counts.
- The `uninstall` subcommand recognizes only `--dry-run` and `--yes`; it takes no positional arguments and rejects unexpected positional args or unknown flags with an explicit error. The installer's `--help` usage line and unknown-subcommand message name `uninstall`.

## Capabilities

### New Capabilities
- `shared-ai-uninstall`: the `uninstall` subcommand, its flags (`--dry-run`, `--yes`), symmetric deletion-set enumeration, hash-guarded deletion, confirmation gate, idempotency, and out-of-scope boundaries.

### Modified Capabilities
<!-- None. bin/install.js gains a route to the new module but no existing install requirement changes. -->

## Impact

- **Modified**: `bin/install.js` — adds an `uninstall` route in the subcommand dispatcher (alongside `install` and `setup`).
- **New**: `bin/uninstall-flow.js` — the uninstall module (deletion-set enumeration, hash check, plan printer, confirmation, execution, summary).
- **New**: `test/uninstall-*.test.js` — unit tests for enumeration, dry-run, hash-guard, idempotency, and flag handling.
- **Modified docs**: `README.md`, `INSTALL.claude.md`, `INSTALL.opencode.md`, `INSTALL.copilot.md` — document the uninstall subcommand and its flags.
- **No changes** to any `commands/{claude,opencode,copilot}/` wrapper, any `sai/commands/*.md` body, or the OpenSpec schema. The deletion set mirrors the destinations produced by `installClaude`, `installOpencode`, and `installCopilot` in `bin/install-flow.js`, excluding the merged config files (`opencode.json` / `opencode.jsonc`).
- **Not touched at runtime**: opencode config merges, per-project `setup` artifacts, and externally-installed global CLIs (`openspec`, `opencode-ai`, `@colbymchenry/codegraph`).

## Proposal Research Documentation

**Local files**: `bin/install.js` (subcommand dispatcher), `bin/install-flow.js` (`installClaude` / `installOpencode` / `installCopilot` destination enumeration, `copyOpencodeConfig` merge behavior, base-path resolution), `openspec/specs/npx-installer/spec.md`, `openspec/specs/install-script/spec.md`

**External URLs**: <!-- none consulted -->

## Additional Notes

- **Deletion-set source of truth.** The install writes files via three functions in `bin/install-flow.js`: `installClaude(destBase)`, `installOpencode(destBase)`, `installCopilot(promptsBase, skillsBase, agentsBase, saiBase)`. Each maps repo source files (`commands/<editor>/*.md`, `sai/commands/*.md`, `sai/instructions/**/*.md`, and a fixed list of `skills/**/SKILL.md`) to a computed destination path. The uninstall deletion set is exactly the set of destination paths these functions would produce, computed against the same OS-aware base paths (`CLAUDE_BASE`, `OPENCODE_BASE`, `COPILOT_PROMPTS_BASE`, `COPILOT_SKILLS_BASE`, `COPILOT_AGENTS_BASE`, `COPILOT_SAI_BASE`).
- **Config merges are excluded by design.** `copyOpencodeConfig` merges three agent keys (`explore`, `executor`, `budget`) into an existing `opencode.json`/`opencode.jsonc`, or copies `configs/opencode.jsonc` when neither exists. Reversing a merge risks destroying user edits; the three zombie keys with placeholder model `opencode-go/deepseek-v4-flash` are documented in the install summary and are acceptable cruft. Uninstall never touches these files.
- **Hash check is moment-in-time.** The sha256 comparison is against the current repo's canonical source at uninstall time, not an install-time snapshot. This protects a user who manually edited an installed file (project-local override) from silent deletion; a divergent file is kept and a warning printed.
- **Version-skew orphans (documented edge case, not code-handled).** The deletion set is computed against the currently-resolved package version's enumeration. If a user installed an older version, then `npx` resolves a newer version whose `sai/instructions/**` (or skills) set differs, files that existed under the old version but are absent from the new enumeration become orphans the uninstall will not see. The hash guard catches content divergence, not missing-from-set divergence. Mitigation is documentation only: the plan output advises a user who has upgraded to run `npx shared-ai install` first to normalize on-disk files, then uninstall. Detecting orphans by comparing on-disk file counts against the deletion set is explicitly out of scope for this change.
- **Argument contract.** `uninstall` accepts only `--dry-run` and `--yes` and no positional arguments; unexpected positional args or unknown flags produce an explicit error and non-zero exit (chosen over silent-ignore so a mistyped path surfaces rather than being swallowed). The user-global target set is fixed and not path-parameterized.
- **Empty-directory pruning.** After deleting files, the flow prunes now-empty directories the installer created, walking upward and stopping at the editor base (never removing the base itself). A directory still holding a kept override or unrelated content is left in place.
- **Rejected — install manifest.** A persisted `~/.config/shared-ai/install-manifest.json` was rejected. Its strongest benefit (exact merge reversal) evaporates once merges are left in place, and its remaining benefit (exact file list) is derivable from the install code. It would add state needing versioning, migration, and atomic writes for marginal gain.
- **Rejected — reverse merges, per-project uninstall, `--target <editor>` partial uninstall.** All rejected for this change as separate concerns; each can be added later as a follow-up without entangling the user-global uninstall.
- **Out of scope.** Reversing `npx shared-ai setup` (per-project `openspec/config.yaml`, `openspec/schemas/sai-workflow/`); uninstalling external global CLIs; remote/networked uninstall on a different machine; re-install detection after uninstall.
- **Mirror discipline.** This change is harness-agnostic: the new code lives entirely in `bin/` (already harness-agnostic) and the docs cover all three harnesses, so the harness-universality rule is satisfied without touching any per-editor wrapper or schema.
