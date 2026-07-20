## Why

The explore-mode "No file writes" guarantee (`sai/instructions/explore.md:3`) is enforced by model discipline alone: in Claude Code and GitHub Copilot the LLM running `sai-explore` can still call write tools (`Edit`, `Write`, destructive `Bash`, the Copilot terminal `execute`) and modify files. Both harnesses expose a per-command frontmatter mechanism that can enforce read-only, turning a convention into an actual constraint.

## What Changes

- Add an `allowed-tools` frontmatter list to `commands/claude/sai-explore.md` scoping the command to a read-only tool subset. Shell access is granted as `Bash(openspec:*)` and `Bash(git:*)` rather than a bare `Bash`, so `openspec list --json` keeps working while destructive shell usage is excluded. `Edit`, `Write`, and unrestricted `Bash` are omitted.
- Change the `tools:` frontmatter in `commands/copilot/sai-explore.prompt.md`: drop `execute` (terminal — can write) and narrow the broad `vscode` category to `vscode/askQuestions` (so the artifact-review and crystallization language gates keep working inside VS Code); keep the non-writing `read`, `search`, `web`, and `todo`.
- Leave `commands/opencode/sai-explore.md` **unchanged**: the opencode command frontmatter has no per-command tool-restriction field, and the only working alternative (routing to a read-only sub-agent) breaks the main-session interactivity `sai-explore` requires. Model discipline stays the accepted fallback there.
- Document the new enforcement and the opencode gap in `AGENTS.md`, so the harness asymmetry is explicit rather than silent.

## Capabilities

### New Capabilities
- `per-command-tool-scoping`: restrict `sai-explore` to a read-only tool subset via per-command frontmatter in the two harnesses that support it (Claude Code `allowed-tools`, Copilot `tools:`), while preserving every read-only operation the command relies on.
- `asymmetry-documentation`: record in `AGENTS.md` that the read-only guarantee is frontmatter-enforced in Claude Code and Copilot but convention-only in opencode, and why the opencode wrapper is intentionally left unchanged.

### Modified Capabilities
<!-- none -->

## Impact

- Affected files: `commands/claude/sai-explore.md` (add `allowed-tools`), `commands/copilot/sai-explore.prompt.md` (revise `tools:`), `AGENTS.md` (document enforcement + opencode gap).
- Explicitly **not** touched: `commands/opencode/sai-explore.md` (user decision — model discipline is the accepted fallback), `sai/instructions/explore.md` (the guarantee text is unchanged; this change enforces it, it does not restate it), and any artifact under `openspec/specs/`, `openspec/changes/`, or `openspec/changes/archive/`.
- Behavioral risk is low: the scoping only removes write-capable tools; all read, research, option-picker, skill-loading, and subagent-dispatch paths `sai-explore` uses remain available.

## Proposal Research Documentation

**Local files**: `commands/claude/sai-explore.md`, `commands/copilot/sai-explore.prompt.md`, `commands/opencode/sai-explore.md`, `sai/commands/sai-explore.md`, `sai/instructions/explore.md`, `AGENTS.md`

**External URLs**: harness frontmatter/permission semantics were checked against each harness's documentation during the explore session that produced this change:
- Claude Code documentation — slash-command frontmatter and tool permissions (`allowed-tools`): https://docs.claude.com/en/docs/claude-code
- GitHub Copilot / VS Code documentation — prompt files and the `tools:` frontmatter (incl. `vscode/*` tool sets): https://code.visualstudio.com/docs/copilot/copilot-customization
- opencode documentation — command frontmatter and permissions: https://opencode.ai/docs

## Additional Notes

- `commands/claude/sai-explore.md` currently has no `allowed-tools` key (frontmatter: `description`, `argument-hint`, `model: claude-sonnet-4-6`, `effort: medium`) — the `allowed-tools` list is introduced by this change, so it will not match any prior source value.
- `commands/copilot/sai-explore.prompt.md` currently declares `tools: [vscode, read, execute, search, web, todo]`; the target state drops `execute` and replaces the broad `vscode` with `vscode/askQuestions`.
- The `Bash(openspec:*)` / `Bash(git:*)` globs are deliberately coarse: `openspec` and `git` both have write-capable subcommands, so the scope is looser than ideal. Tightening further would make the frontmatter brittle to future read-only additions; the looseness is an accepted trade-off.
- Enforcement is asymmetric by design: opencode's read-only guarantee stays convention-only, mitigated by the `AGENTS.md` documentation rather than by a wrapper change.
- Narrowing the broad Copilot `vscode` category to `vscode/askQuestions` also drops any *other* read-only `vscode/*` tools the broad category implicitly granted (e.g. editor/API helpers). `sai-explore` is not known to invoke any `vscode/*` tool other than the option-picker, so this is expected to be inert; if a future `sai-explore` turn needs another `vscode/*` read-only tool, this narrowing will surface the gap and that tool must be added explicitly.
- Subagent tool inheritance is out of frontmatter scope: research subagents run with their own tool configuration, so the wrapper `allowed-tools` / `tools:` lists govern main-session tools only (see the `per-command-tool-scoping` "preserves non-writing operations" requirement).
