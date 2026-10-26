# Skills

Skills are reusable behavior modules loaded by wrappers and subagents at runtime. SAI skills live under `skills/` and are installed globally by the main installer. OpenSpec skills are project-local and are installed by `openspec init` during project setup.

The backlog and branch workflow skills are described in the
[backlog command reference](backlog-commands.md).

## Behavior skills

Each `sai-*` command loads only the skills it needs. You can also trigger the
skills below directly in your prompts for cost discipline or guarded operations.

| Skill | Purpose | Trigger |
|-------|---------|---------|
| `sai-commands` | Lists all `/sai-*` commands and requires loading the command file before executing any of them, so the agent does not skip the wrappers. | `/sai-*` commands |
| `fetch` | Resolves `Fetch @` paths through the active harness's installed roots. Loaded first by the Claude Code and opencode wrappers. | auto-loaded |
| `safe-operations` | Enforces reversibility and impact awareness — agent must ask before destructive, hard-to-reverse, or shared-system operations, and must not use destructive shortcuts. | `"dangerous"`, `"destructive"`, `"git push --force"`, `"rm -rf"`, `"delete files/branches"` |
| `token-efficient-languages` | Enforces a 3-rule language contract: (1) think/reason in English, (2) respond in user's language, (3) write artifacts in English unless the user explicitly requests another language. English tokenizers produce fewer tokens per unit of meaning. | `"budget language"`, `"cheap language"` |
| `budget-explorer` | Read-only research and documentation lookup, with bounded output and a 40-call ceiling per execution segment. Main-agent synthesis stays outside the helper. | `"budget explorer"`, `"cheap explorer"` |
| `budget-executor` | Run specified commands, tests, or builds; no self-correction, minimal output, structured failure reports. | `"budget executor"`, `"cheap executor"` |
| `budget-subagent` | One well-scoped delegated task, with a structured completion report and approximately 30-call soft cap. | `"budget subagent"`, `"cheap subagent"`, `"budget task"` |
| `budget` | Loads the three budget subagent bindings together (`budget-explorer` + `budget-executor` + `budget-subagent`). Activates full cost-discipline for the session. | `"budget mode"`, `"cheap mode"`, `"low-cost mode"`, `"economy mode"` |
| `budget-ro` | Loads only read-only exploration and the language contract, without executor or writable task delegation. | `"budget read-only"`, `"budget ro"` |

Helper models come from the configured agent files, not each skill. Claude Code
and opencode both use `budget-explorer`, `budget-executor`, and `budget-subagent`.
Customize them through project `setup` or the corresponding agent overrides.

### Migrating existing opencode agents

Installation deletes the retired `explore.md`, `executor.md`, and `budget.md`
agent files from the opencode global root and the current project's `.opencode/`
root, including customized copies. It does not migrate their models, variants,
or instruction text. Existing `budget-*` definitions retain their own tunables
and customization section; absent global definitions receive shipped defaults.
The installer creates no local replacement files or aliases. Claude Code's
generic-agent names do not change.

Installation refreshes existing, current-name project-local SAI definitions in
the current project, preserving tunables and the customization section described
in [model configuration](models.md#keeping-your-configuration). Both harnesses
delete all exact file paths declared retired in `sai/install-manifest.json`,
regardless of their contents. Unrelated filenames stay intact. A retired file
symlink is unlinked without touching its target; directories and paths through
linked directories below the harness root are skipped, never recursively
removed. A linked global harness root is still cleaned; a linked project root
is skipped entirely, with one notice.

Update external dispatch references, permissions, and saved custom preset targets
to use current names. Review legacy configuration entries manually: an
`agent.explore` config entry can still override OpenCode's built-in explore,
and SAI never rewrites those entries. Doctor remains read-only, and uninstall
retains its managed-content protections for user files.

## Optional third-party skill

**writing-for-agents** helps word the Explore edge-case and
implementation-detail lists: each list is drafted, reviewed for wording, and
only then displayed. It is not bundled or SAI-managed. The global installer
offers installation through skills.sh only in an interactive terminal and only
after consent. You can also run:

```bash
npx skills@latest add mattpocock/skills --skill writing-for-agents
```

`pnpm dlx` and `bunx` are alternatives. skills.sh lets you choose assistant and
scope; no global scope or assistant is preselected. Without it, Explore warns
once per invocation and continues. Doctor and uninstall ignore this user-owned
skill. See [Third Party Tools](../README.md#third-party-tools).
