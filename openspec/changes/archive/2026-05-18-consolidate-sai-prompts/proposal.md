## Why

The sai-* command set has accumulated three drift sources: REPLACEMENTS blocks duplicated verbatim across claude/ and opencode/ wrappers; instructions file names that are misleading (plan.md powers sai-3-implement, implement.md powers sai-4-apply); and only sai-1 prints a handoff message, leaving sai-2 through sai-8 silent about step completion. Centralizing shared content into single-source instructions/sai/ files eliminates drift and makes each step self-describing.

## What Changes

- `instructions/sai/plan.md` renamed to `implement.md`; `instructions/sai/implement.md` renamed to `apply.md`
- All references to old filenames updated in wrappers and within the renamed files themselves
- For sai-1 through sai-8: shared body content (REPLACEMENTS blocks, verify blocks) extracted from both wrapper variants into a new `instructions/sai/<step>.md`; wrappers become thin frontmatter+fetch stubs
- For sai-explore, sai-archive, sai-commit, sai-pr: shared body content extracted into instructions/sai/ files (no handoff added)
- Mandatory STOP+print handoff block appended to `instructions/sai/<step>.md` for each of steps 1–8
- The "generate ONLY proposal+specs" sai-1 override moved from both wrappers into `instructions/sai/spec.propose.md` as a new section
- opencode wrappers sai-5 through sai-8 restored with the missing `Fetch remember.md` line

## Capabilities

### New Capabilities

- `rename-instructions-files`: Rename `plan.md` → `implement.md` and `implement.md` → `apply.md` inside `instructions/sai/`; update every reference in wrappers and within the renamed files
- `dedup-numbered-wrappers`: For sai-1 through sai-8, extract every block identical between claude/commands/sai-N.md and opencode/commands/sai-N.md (modulo path prefixes) into `instructions/sai/<step>.md`; leave wrappers as thin stubs matching the existing sai-2-design pattern
- `dedup-nonnumbered-wrappers`: Apply the same extraction to sai-explore (Context Isolation block), sai-archive (Completion Check block), sai-commit, and sai-pr (path-resolution sentences); no handoff block added for these
- `uniform-handoff`: Append a mandatory STOP+print block to each `instructions/sai/<step>.md` for steps 1–8 with the specified per-step text; sai-8 ends with "Audit chain complete." (terminal)
- `sai-1-override-merge`: Append the "generate ONLY proposal+specs, skip design/tasks" override as a new section in `instructions/sai/spec.propose.md`, removing it from both sai-1 wrappers
- `fix-remember-omissions`: Add the missing `Fetch @~/.config/opencode/instructions/sai/remember.md` line to opencode wrappers sai-5, sai-6, sai-7, and sai-8

### Modified Capabilities

_(none — this is a pure layout refactor; no behavioral changes to any step)_

## Impact

- **Files renamed**: `instructions/sai/plan.md` → `implement.md`; `instructions/sai/implement.md` → `apply.md`
- **Files modified**: `claude/commands/sai-{1..8}.md`, `opencode/commands/sai-{1..8}.md`, `claude/commands/sai-{explore,archive,commit,pr}.md`, `opencode/commands/sai-{explore,archive,commit,pr}.md`, `instructions/sai/spec.propose.md`
- **New instruction files**: `instructions/sai/spec.md` (step for sai-1), plus new step files for sai-3 through sai-8 that don't yet exist; sai-2's design.md already serves as the model
- No changes to openspec CLI behavior, schema, model selections, effort levels, or skill paths
