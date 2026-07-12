## Why

In the common case where the user already has an `opencode.json`/`opencode.jsonc`, the installer automates nothing — it only prints a snippet and asks the user to copy-paste the `agent` block by hand. This change performs a real, surgical merge that inserts the missing `agent.{explore,executor,budget}` keys without touching the rest of the user's config.

## What Changes

- Replace the "config already exists" branch of `copyOpencodeConfig` (currently print-only) with an idempotent, add-if-missing merge of the `agent.{explore,executor,budget}` block into the existing `opencode.json` or `opencode.jsonc`, using `jsonc-parser` (`parse` + `modify` + `applyEdits`) so comments and formatting are preserved.
- Insert only the agent keys that are absent; never overwrite an `agent.explore`/`agent.executor`/`agent.budget` the user already defined; never touch any other section of the config.
- Each inserted agent uses the placeholder model `opencode-go/deepseek-v4-flash` (`mode: subagent`); after merging, print one line naming exactly which keys were added so the user can adjust the model. Non-interactive — works in CI / no-TTY.
- If the existing file does not parse as JSONC, leave it byte-for-byte intact and fall back to the current console message (never corrupt the user's config).
- Add `jsonc-parser` as the package's first runtime dependency.
- Extend `test/install-opencode.test.js`; the "no existing config" branch behavior stays identical.

## Capabilities

### New Capabilities
- `opencode-config-install`: idempotent add-if-missing merge of the `agent` block into an existing opencode config, preserving comments/formatting, with a parse-failure fallback to the printed message.

### Modified Capabilities
- `opencode-config-message`: the printed verification message now fires only as the fallback when the existing config fails to parse as JSONC — not merely because a config file exists.
- `npx-installer`: the `installer-shebang-and-no-deps` requirement is relaxed to permit npm packages declared in `package.json` `dependencies` (installed by `npx github:`) alongside Node built-ins; `jsonc-parser` is the first such dependency. The interactive checklist and file-copy paths still use only built-ins.

## Impact

- **Code**: `bin/install-flow.js` — `copyOpencodeConfig` (the "config exists" branch). The "no config" branch is unchanged.
- **Tests**: `test/install-opencode.test.js` — extend to cover merge / idempotency / parse-failure fallback.
- **Dependencies**: adds `jsonc-parser` (first runtime dependency of a currently dependency-free package) to `package.json`. This requires modifying the `npx-installer` capability's `installer-shebang-and-no-deps` requirement to permit declared dependencies (see Capabilities).
- **Config files touched at install time**: `opencode.json` and `opencode.jsonc` in the user's opencode config dir.

## Proposal Research Documentation

**Local files**:
- `bin/install-flow.js` — `copyOpencodeConfig` (lines 315-344), `installOpencode`, and the `main()` call sites (line 371-374).
- `test/install-opencode.test.js` — existing coverage for `copyOpencodeConfig` (the two "config exists" tests and the "no config" test).
- `openspec/specs/opencode-config-message/spec.md` — current print-message requirement being re-scoped.
- `configs/opencode.jsonc` — the source config copied when no config exists (the shape of the `agent` block to merge).

**External URLs**: <!-- none consulted -->

## Additional Notes

- The `agent` block to insert mirrors what `copyOpencodeConfig` currently prints: each of `explore`, `executor`, `budget` is an object `{ "mode": "subagent", "model": "opencode-go/deepseek-v4-flash" }`. The placeholder model string `opencode-go/deepseek-v4-flash` is hardcoded in the merge logic (matching the literal the print branch already hardcodes) so the spec scenarios can assert it exactly; it is intentionally NOT sourced dynamically from `configs/opencode.jsonc`, to avoid coupling the assertion to that file's contents.
- The merge pattern (parse → `jsonc-parser.modify` per missing key → `applyEdits`) is ported from the `opencode-onboard` surgical-merge approach.
- Add-if-missing is per-agent-key: presence of one key (e.g. `agent.explore`) does not suppress inserting the others.
- Both filenames must be supported; the merge target is always the existing file, never a new one. Although only one file is normally expected, the code checks `hasJson`/`hasJsonc` independently and does not guarantee exclusivity, so precedence is fixed: when both exist, `opencode.json` is merged and `opencode.jsonc` is left untouched. Design SHOULD confirm this precedence against opencode's own config-resolution order before implementation.
- Fallback also covers a config that parses but whose root is not a JSON object (empty file, array, scalar): there is no object to insert `agent` into, so it is treated exactly like a parse failure — file left intact, verification message printed.
- Deferred (out of scope, later ideas): managed markers, config snapshot/backup, and interactive model selection with a catalog. The placeholder-plus-notice approach is intentionally kept for this change.
- Explore-mode session: no production code is modified here; only the spec artifacts are written.

**For design / implementation (non-normative):**
- `package.json` has no `dependencies` field today; adding `jsonc-parser` requires creating that field from scratch.
- The inserted block's indentation should match the surrounding style; name the intended `jsonc-parser` `FormattingOptions` (e.g. `insertSpaces`, `tabSize`) in design so on-disk formatting stays consistent.
