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

Global installation migrates SAI-owned `explore.md`, `executor.md`, and `budget.md`
to the matching `budget-*` names, preserving the configured model and optional
variant (including an absent variant). If the new name already exists, its
settings win; the installer reports conflicting legacy settings. It removes a
SAI-owned predecessor only after installing its replacement. Modified or unrelated
legacy files remain in place, with a notice. Reinstallation creates no aliases.
Claude Code's existing names do not change.

Project-local `.opencode/agents/` definitions are never rewritten by global
installation. Manually move each needed override to the corresponding new name,
update external dispatch references, permissions, and saved custom preset targets,
and review old definitions
before removing them. A retained global or project-local `explore.md` (or an
`agent.explore` config entry) can still override OpenCode's built-in explore.
Review legacy config entries manually; SAI never rewrites them. Restart the
harness after migration. Doctor and uninstall use the new names and retain
their managed-content protections for user files.

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
