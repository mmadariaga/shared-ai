# Skills

Skills are reusable behavior modules loaded by wrappers and subagents at runtime. SAI skills live under `skills/` and are installed globally by the main installer. OpenSpec skills are project-local and are installed by `openspec init` during project setup.

## Explicit workflow skills

These run in the current conversation in Claude Code and opencode without
OpenSpec or SAI's fresh-context boot. Invoke them explicitly; imports never
authorize implementation, and publication always needs content approval.

| Skill | Purpose | Input |
|-------|---------|-------|
| [`new-change-branch`](commands/new-change-branch.md) | Create and switch to a local change branch; preserve existing work. | Current discussion, then your base selection |
| [`from-backlog`](commands/from-backlog.md) | Import a GitHub/GitLab issue or Azure Boards work item for discussion. | One reference |
| [`from-next-backlog-item`](commands/from-next-backlog-item.md) | Select a highest-priority eligible backlog item and import it. | No arguments; missing pile context is asked |
| [`to-backlog`](commands/to-backlog.md) | Create an item or update the originating item's title and description. | Agreed conversation context and approved destination/content |
| [`to-pr`](commands/to-pr.md) | Publish a GitHub PR, GitLab MR, or Azure Repos PR from committed changes. | Destination/target choices; separate publication and push approvals |

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

Helper models come from the configured agent files, not each skill: Claude Code
uses `budget-explorer`, `budget-executor`, and `budget-subagent`; opencode uses
`explore`, `executor`, and `budget`. Customize them through project `setup` or
the corresponding agent overrides.

## Optional third-party skill

**writing-for-agents** helps word the Explore edge-case and implementation-detail
lists. It is not bundled or SAI-managed. The global installer offers installation
through skills.sh only in an interactive terminal and only after consent. You
can also run:

```bash
npx skills@latest add mattpocock/skills --skill=writing-for-agents
```

`pnpm dlx` and `bunx` are alternatives. skills.sh lets you choose assistant and
scope; no global scope or assistant is preselected. Without it, Explore warns
once per invocation and continues. Doctor and uninstall ignore this user-owned
skill. See [Third Party Tools](../README.md#third-party-tools).
