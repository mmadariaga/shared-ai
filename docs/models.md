# Model defaults and customization

Run project `setup` and choose **Customize models** to change individual models,
or **Load preset** to start from a subscription-specific mix. Both Claude Code
and opencode support project-local overrides. See
[model selection and presets](../README.md#post-install) for the quick guide.
Project behavior settings, which are not models, have their own menu entry; see
[project settings](project-settings.md).

OpenCode model and variant discovery works without opening its interface first.
Each query has a 30-second limit. While it runs, **Esc** goes back and **q** or
**Ctrl+C** cancels to the customization menu. A failed or cancelled query changes
no model settings and retains the selected targets for an explicit retry. Cleanup
targets only the query's own process tree and has a one-second wait limit.
Time spent choosing a provider, model, or variant does not count toward a query's
limit. Claude Code's model and effort selection is unchanged.

The opencode defaults below balance cost and reasoning demand. The command
coordinates the run; its worker does the technical work. Configure these roles
separately when you want stronger reasoning without paying the same rate for
every task. Helper agents handle bounded research, command execution, and small
delegated tasks.

- **CONTEXT:** expected task material, not the model's context-window size.
- **DIFFICULTY:** reasoning demand, from `↑` to `↑↑↑`.
- **SETTING:** provider/model and reasoning variant.

Choose design models for planning quality and the implement coordinator for
orchestration, test arbitration, and evidence-based corrections to the plan.
GREEN needs to follow the resulting contracts. These roles do not imply a strict
capability ranking: Claude Code's defaults use Sonnet/high for design and
Opus/medium for the implement coordinator. Validate a model mix on your project
rather than treating model families and effort levels as one ordered scale.

## Full opencode defaults

```text
      TYPE          TARGET                       CONTEXT  DIFFICULTY  SETTING
      ────────────  ───────────────────────────  ───────  ──────────  ─────────────────────────────────────────────────
      AGENT         budget-subagent              Medium   ↑           opencode/muse-spark-1.3-contributor-free (xhigh)
      AGENT         budget-executor              Small    ↑           opencode/muse-spark-1.3-contributor-free (xhigh)
      AGENT         budget-explorer              Medium   ↑           opencode/muse-spark-1.3-contributor-free (xhigh)

      ORCHESTRATOR  sai-explore                  Large    ↑↑↑         opencode-go/muse-spark-1.3-contributor (xhigh)
      WORKER        sai-direct-build-worker      Large    ↑↑          opencode-go/deepseek-v4.1-flash (max)
      ORCHESTRATOR  sai-1-spec                   Medium   ↑↑          opencode-go/muse-spark-1.3-contributor (xhigh)
      WORKER        sai-1-spec-proposal-worker   Medium   ↑↑          opencode-go/deepseek-v4.1-flash (max)
      ORCHESTRATOR  sai-2-design                 Medium   ↑↑          opencode-go/muse-spark-1.3-contributor (xhigh)
      WORKER        sai-2-design-worker          Large    ↑↑↑         opencode-go/deepseek-v4.1-flash (max)
      ORCHESTRATOR  sai-plan                     Large    ↑↑↑         opencode-go/muse-spark-1.3-contributor (xhigh)

      ORCHESTRATOR  sai-build                    Large    ↑↑↑         opencode-go/muse-spark-1.3-contributor (xhigh)
      ORCHESTRATOR  sai-direct-build             Large    ↑↑↑         opencode-go/muse-spark-1.3-contributor (xhigh)
      ORCHESTRATOR  sai-3-implement              Large    ↑↑↑         opencode-go/muse-spark-1.3-contributor (xhigh)
      WORKER        sai-3-red-worker             Medium   ↑           opencode-go/deepseek-v4.1-flash (max)
      WORKER        sai-3-green-worker           Medium   ↑↑          opencode-go/deepseek-v4.1-flash (max)
      ORCHESTRATOR  sai-4-review                 Medium   ↑↑          opencode-go/muse-spark-1.3-contributor (xhigh)
      WORKER        sai-4-review-worker          Large    ↑↑          opencode-go/gpt-5.6-luna (max)

      ORCHESTRATOR  sai-deep-review              Large    ↑↑          opencode-go/muse-spark-1.3-contributor (xhigh)
      ORCHESTRATOR  sai-5-security               Medium   ↑           opencode-go/muse-spark-1.3-contributor (xhigh)
      WORKER        sai-5-security-worker        Large    ↑↑↑         opencode-go/deepseek-v4.1-flash (max)
      ORCHESTRATOR  sai-6-performance            Medium   ↑           opencode-go/muse-spark-1.3-contributor (xhigh)
      WORKER        sai-6-performance-worker     Large    ↑↑          opencode-go/deepseek-v4.1-flash (max)
      ORCHESTRATOR  sai-7-accessibility          Medium   ↑           opencode-go/muse-spark-1.3-contributor (xhigh)
      WORKER        sai-7-accessibility-worker   Large    ↑↑          opencode-go/deepseek-v4.1-flash (max)

      ORCHESTRATOR  sai-backfill                 Medium   ↑↑          opencode-go/muse-spark-1.3-contributor (xhigh)
      WORKER        sai-backfill-worker          Large    ↑↑          opencode-go/deepseek-v4.1-flash (max)
      ORCHESTRATOR  sai-archive                  Medium   ↑↑          opencode-go/muse-spark-1.3-contributor (xhigh)
      WORKER        sai-archive-worker           Medium   ↑           opencode-go/muse-spark-1.3-contributor (high)
      ORCHESTRATOR  sai-merge                    Large    ↑↑↑         opencode-go/muse-spark-1.3-contributor (xhigh)
      WORKER        sai-merge-worker             Large    ↑↑          opencode-go/deepseek-v4.1-flash (max)
      ORCHESTRATOR  sai-commit                   Small    ↑           opencode-go/muse-spark-1.3-contributor (xhigh)
      WORKER        sai-commit-worker            Small    ↑           opencode-go/muse-spark-1.3-contributor (xhigh)

      UTILITY       sai-retire-docs              Large    ↑↑          opencode-go/muse-spark-1.3-contributor (xhigh)
      UTILITY       sai-retrospective            Large    ↑↑          opencode-go/muse-spark-1.3-contributor (xhigh)
      UTILITY       sai-status                   Small    ↑           opencode-go/muse-spark-1.3-contributor (xhigh)
      UTILITY       sai-worktree                 Small    ↑           opencode-go/muse-spark-1.3-contributor (xhigh)
```

Claude Code's shipped defaults match the OPUS preset: Sonnet for spec and design
roles and audit coordinators; Opus for demanding coordination and review roles,
including the technical audit workers; and Haiku for the generic helpers, RED
and GREEN workers, commit and archive workers, and status and worktree utilities.
These are starting points, not a guarantee for every project; test alternatives
on your own work before switching the whole pipeline.

## Keeping your configuration

Save custom mixes under a personal preset name. The `[sai-default]-` prefix is
reserved: distributed presets are refreshed on installation, but personal
presets and project model selections stay unchanged until you apply a preset.

Command and agent instructions remain managed even after you select a different
model. Installation preserves the selected `model` and `effort` (Claude Code),
or `model` and `variant` (opencode), a `harness: opencode` line that you add by
hand to a Claude Code agent file (see below), and the exact text after
`<!-- User customizations below this line -->`. The rest of each definition is
replaced. Legacy files without the marker retain only their tunables, with no
backup of other edits. OpenCode commands keep the variant in `model#variant`;
agents keep a separate `variant` field.

The installer refreshes existing local overrides in its current project as well
as the global files. `setup <project-path>` refreshes that project's existing
overrides for both harnesses. Neither operation creates extra local copies or
scans other projects. `doctor` flags stale managed content, ignoring tunables
and the customization section.

Retired or renamed definitions are deleted, not upgraded or migrated: their old
models and custom text do not transfer to the new name. This applies to the
global installation and to existing local files in the project being refreshed.
Only exact retired paths from the install manifest are removed.

Only SAI commands and agents are model-customization targets. The universal
backlog and PR workflows run with the active session's model rather than a
separate model selection in this menu.

## Run a Claude Code agent on an OpenCode model

With Claude Code as your harness, you can run any agent on the model of its
OpenCode agent. Add one line to the agent's frontmatter in
`~/.claude/agents/<name>.md` (or the project's `.claude/agents/<name>.md`):

```yaml
harness: opencode
```

The installer never writes this line, keeps it across installs, and `doctor`
reports no drift for it. A Claude Code coordinator then runs that agent with
`opencode run --format json`, one process per turn, and continues it with the
session ID. OpenCode must be installed and must have an agent of the same name;
the model, variant, permissions, and tools come from that OpenCode agent, not
from the Claude Code file. Without the line, or with `harness: claude`, the agent
runs through Claude Code as before.

When the `opencode` command or the same-named agent is missing, or the first turn
fails, the agent runs through Claude Code with the `model` of its Claude Code
file, and the coordinator prints one notice naming the agent and the cause.

Limits: each turn adds a few seconds of process startup, an OpenCode-routed agent
gets no cache warming, an `ask` permission in its OpenCode agent is rejected
instead of prompting you (nothing is auto-approved), and an OpenCode `shell`
deny is not a sandbox. With opencode as your harness nothing changes.
