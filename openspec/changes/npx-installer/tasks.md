# Tasks: npx-installer

## Step 1: Create package.json

**Files Affected**: `package.json`

**What Will Be Done**: Write `package.json` at the repo root with `name: "shared-ai"`, `version: "1.0.0"`, `bin: { "shared-ai": "bin/install.js" }`, `files: ["bin", "commands", "sai", "skills", "configs", "openspec/schemas"]`, and `engines: { "node": ">=18" }`. No `dependencies` field.

**Testing Strategy**: Run `node -e "const p=require('./package.json'); console.log(p.bin, p.engines)"` — must print bin entry and engines. Run `npx .` from repo root — must invoke `bin/install.js`.

---

## Step 2: Scaffold bin/install.js (shebang, imports, constants, --help)

**Files Affected**: `bin/install.js`

**What Will Be Done**: Create `bin/install.js` with:
- Shebang `#!/usr/bin/env node`
- `require` only `fs`, `path`, `os`, `readline`
- Source root constant: `const ROOT = path.join(__dirname, '..')`
- OS-aware destination bases using `os.homedir()` + `path.join`: `CLAUDE_BASE` and `OPENCODE_BASE`
- `--help` flag handler: print usage (available keys: up/down arrows navigate, space toggles, enter confirms) then exit 0

**Testing Strategy**: `node bin/install.js --help` must print usage and exit 0 (`echo $?` = 0). Constants must resolve correctly on both Windows and Unix.

---

## Step 3: Implement interactive checklist UI

**Files Affected**: `bin/install.js`

**What Will Be Done**: Add `promptChecklist(items, defaultSelected)` function:
- Guard: if `!process.stdin.isTTY`, print `"Error: interactive mode requires a TTY. Run directly in a terminal."` and exit 1
- Call `process.stdin.setRawMode(true)` and `resume()`; use `readline.emitKeypressEvents`
- Track cursor index and selection state (array of booleans)
- Default state: `Claude Code` unchecked, `Opencode` checked
- Render: print checklist with `[x]`/`[ ]` indicators; on each keypress, move cursor up N lines and redraw
- Key handlers: up/down arrow (move cursor), space (toggle selection), enter (resolve with selected names), Ctrl-C / q (exit 0)
- Returns a Promise resolving to array of selected item names

**Testing Strategy**: Run `node bin/install.js` in a TTY. Verify default selection shows Opencode checked. Arrow keys move cursor. Space toggles. Enter confirms. Deselecting both then confirming prints `"Nothing selected. Exiting."` and exits 0.

---

## Step 4: Implement copy helpers

**Files Affected**: `bin/install.js`

**What Will Be Done**: Add utility functions:
- `ensureDir(dir)` — `fs.mkdirSync(dir, { recursive: true })`
- `forceCopy(src, dest)` — `ensureDir(path.dirname(dest))` then `fs.copyFileSync(src, dest)`
- `copyWithWarn(src, dest)` — print `Overwriting <dest>`, then `forceCopy`
- `copySkipIfExists(src, dest)` — if `fs.existsSync(dest)`, print `Skipping <dest> (already exists)` and return; else `forceCopy`
- `listMdFiles(dir)` — `fs.readdirSync(dir).filter(f => f.endsWith('.md'))` returning full paths

**Testing Strategy**: Call each function with controlled temp src/dest paths. Verify: `forceCopy` overwrites existing file; `copyWithWarn` prints message before writing; `copySkipIfExists` does not overwrite when dest exists and does copy when it doesn't.

---

## Step 5: Implement Claude file map

**Files Affected**: `bin/install.js`

**What Will Be Done**: Add `installClaude()` function applying the spec file map under `CLAUDE_BASE`:
- `commands/claude/*.md` → `commands/` using `forceCopy` per file (via `listMdFiles`)
- `sai/commands/*.md` → `sai/commands/` using `forceCopy` per file
- `sai/instructions/*.md` → `sai/instructions/` using `copyWithWarn` per file
- Eight explicit skill mappings (no glob) using `copySkipIfExists`:
  - `skills/universal/caveman/SKILL.md` → `skills/caveman/SKILL.md`
  - `skills/universal/token-efficient-languages/SKILL.md` → `skills/token-efficient-languages/SKILL.md`
  - `skills/claude/budget-explorer/SKILL.md` → `skills/budget-explorer/SKILL.md`
  - `skills/claude/budget-executor/SKILL.md` → `skills/budget-executor/SKILL.md`
  - `skills/claude/fetch/SKILL.md` → `skills/fetch/SKILL.md`

**Testing Strategy**: Run installer selecting only Claude Code against a temp destination. Verify: all md files land in correct paths, instruction files print warnings, existing skills are skipped, missing skills are created with parent dirs.

---

## Step 6: Implement Opencode file map and conditional config copy

**Files Affected**: `bin/install.js`

**What Will Be Done**: Add `installOpencode()` with same structure as `installClaude()` but under `OPENCODE_BASE` and using opencode-specific skill sources:
- `commands/opencode/*.md` → `commands/` (forceCopy)
- `sai/commands/*.md` → `sai/commands/` (forceCopy)
- `sai/instructions/*.md` → `sai/instructions/` (copyWithWarn)
- Nine explicit skill mappings (copySkipIfExists):
  - `skills/universal/caveman/SKILL.md` → `skills/caveman/SKILL.md`
  - `skills/universal/token-efficient-languages/SKILL.md` → `skills/token-efficient-languages/SKILL.md`
  - `skills/opencode/budget-explorer/SKILL.md` → `skills/budget-explorer/SKILL.md`
  - `skills/opencode/budget-executor/SKILL.md` → `skills/budget-executor/SKILL.md`
  - `skills/universal/budget/SKILL.md` → `skills/budget/SKILL.md`
  - `skills/opencode/fetch/SKILL.md` → `skills/fetch/SKILL.md`

Add `copyOpencodeConfig()`:
- Check if `opencode.json` or `opencode.jsonc` exists in `OPENCODE_BASE`
- If neither: `forceCopy(ROOT/configs/opencode.jsonc, OPENCODE_BASE/opencode.jsonc)`
- If either exists: print manual instructions for adding the `agent` section

**Testing Strategy**: Test config copy with no existing config — verify `opencode.jsonc` appears in dest. Test with `opencode.json` present — verify no copy and manual instructions printed. Verify skill skip logic same as Claude.

---

## Step 7: Wire main orchestration and post-install reminder

**Files Affected**: `bin/install.js`

**What Will Be Done**: Add `main()` async function:
1. Check `--help` flag → print usage and exit 0
2. Call `await promptChecklist(...)` to get selected targets
3. If nothing selected: print `"Nothing selected. Exiting."` and exit 0
4. Call `installClaude()` if `"Claude Code"` selected
5. Call `installOpencode()` (including `copyOpencodeConfig()`) if `"Opencode"` selected
6. Print post-install reminder:
   ```
   Reminder: run 'openspec init --tools claude' (or --tools opencode) in each project,
   then copy the openspec/schemas folder from this repo into the project root.
   ```
Call `main()` at end of file.

**Testing Strategy**: Full end-to-end run in TTY — select both targets, verify all files copied to correct paths, reminder printed. Run `npx .` from repo root — same result. Verify Ctrl-C during checklist exits cleanly with code 0.

---

## Required Documentation

### Local files
- openspec/changes/npx-installer/proposal.md
- openspec/changes/npx-installer/specs/npx-installer/spec.md
- commands/claude/ (directory listing — 14 .md files)
- commands/opencode/ (directory listing — 14 .md files)
- sai/commands/ (directory listing — 13 .md files)
- sai/instructions/ (directory listing — 17 .md files)
- skills/universal/ (directory listing — budget/, caveman/, token-efficient-languages/)
- skills/claude/ (directory listing — budget-executor/, budget-explorer/, fetch/)
- skills/opencode/ (directory listing — budget-executor/, budget-explorer/, fetch/)
- configs/opencode.jsonc:1-20
- README.md:1-50

### External URLs
None

## Implementation Context

**Stack**: Node.js ≥ 18, CommonJS (`require`), zero external dependencies. Built-ins only: `fs`, `path`, `os`, `readline`. No build step, no transpilation.

**Conventions**:
- Skills are platform-tiered: `skills/universal/` maps to both platforms; `skills/claude/` and `skills/opencode/` are platform-specific — never cross-copy between platforms
- `sai/commands/` and `sai/instructions/` are shared: identical source, copied to both Claude and Opencode destinations
- `commands/` is platform-split: `commands/claude/` → Claude only, `commands/opencode/` → Opencode only — never mixed
- `skills/universal/budget/SKILL.md` is mapped for both Claude and Opencode
- All artifact filenames are kebab-case `.md` files; no exceptions in the repo

**Avoid**:
- ESM (`import`/`export`) — breaks shebang scripts without `"type":"module"`, adds cross-platform friction
- `require('glob')` or any non-built-in module — violates zero-dep constraint; `npx` won't install it
- `process.cwd()` for source path resolution — breaks under `npx` where cwd ≠ script location; use `__dirname`
- Hardcoded absolute paths — always `os.homedir()` + `path.join`
- Calling `setRawMode` without TTY check — throws opaque `TypeError` in non-TTY contexts
