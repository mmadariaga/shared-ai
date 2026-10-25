# Model defaults and customization

Run project `setup` and choose **Customize models** to change individual models,
or **Load preset** to start from a subscription-specific mix. Both Claude Code
and opencode support project-local overrides. See
[model selection and presets](../README.md#post-install) for the quick guide.
Project behavior settings, which are not models, have their own menu entry; see
[project settings](project-settings.md).

The opencode defaults below balance cost and reasoning demand. The command
coordinates the run; its worker does the technical work. Configure these roles
separately when you want stronger reasoning without paying the same rate for
every task. Helper agents handle bounded research, command execution, and small
delegated tasks.

- **CONTEXT:** expected task material, not the model's context-window size.
- **DIFFICULTY:** reasoning demand, from `↑` to `↑↑↑`.
- **SETTING:** provider/model and reasoning variant.

Keep design at least as capable as the implement coordinator, and the
coordinator at least as capable as the GREEN worker. The earlier phases make decisions
that the later implementer should be able to follow without redesigning them.

## Full opencode defaults

```text
      TYPE          TARGET                       CONTEXT  DIFFICULTY  SETTING
      ────────────  ───────────────────────────  ───────  ──────────  ─────────────────────────────────────────────────
      AGENT         budget                       Medium   ↑           opencode/muse-spark-1.3-contributor-free (xhigh)
      AGENT         executor                     Small    ↑           opencode/muse-spark-1.3-contributor-free (xhigh)
      AGENT         explore                      Medium   ↑           opencode/muse-spark-1.3-contributor-free (xhigh)

      ORCHESTRATOR  sai-explore                  Large    ↑↑↑         opencode-go/muse-spark-1.3-contributor (xhigh)
      WORKER        sai-direct-build-worker      Large    ↑↑          opencode-go/deepseek-v4.1-flash (max)
      ORCHESTRATOR  sai-1-spec                   Medium   ↑↑          opencode-go/muse-spark-1.3-contributor (xhigh)
      WORKER        sai-1-spec-proposal-worker   Medium   ↑↑          opencode-go/deepseek-v4.1-flash (max)
      ORCHESTRATOR  sai-2-design                 Medium   ↑↑          opencode-go/muse-spark-1.3-contributor (xhigh)
      WORKER        sai-2-design-worker          Large    ↑↑↑         opencode-go/deepseek-v4.1-flash (max)

      ORCHESTRATOR  sai-build                    Large    ↑↑↑         opencode-go/muse-spark-1.3-contributor (xhigh)
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
      UTILITY       sai-status                   Small    ↑           opencode-go/muse-spark-1.3-contributor (xhigh)
      UTILITY       sai-worktree                 Small    ↑           opencode-go/muse-spark-1.3-contributor (xhigh)
```

Claude Code's shipped defaults match the OPUS preset: Opus for demanding roles,
Sonnet for the spec, design, and audit phases, and Haiku for the executor and the
RED and GREEN implementation workers.
These are starting points, not a guarantee for every project; test alternatives
on your own work before switching the whole pipeline.

## Keeping your configuration

Save custom mixes under a personal preset name. The `[sai-default]-` prefix is
reserved: distributed presets are refreshed on installation, but personal
presets and project model selections stay unchanged until you apply a preset.

Command and agent instructions remain managed even after you select a different
model. Installation preserves the selected `model` and `effort` (Claude Code),
or `model` and `variant` (opencode), and the exact text after
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
