# Model defaults and customization

Run project `setup` and choose **Customize models** to change individual models,
or **Load preset** to start from a subscription-specific mix. Both Claude Code
and opencode support project-local overrides. See
[model selection and presets](../README.md#post-install) for the quick guide.

The opencode defaults below balance cost and reasoning demand. The command
coordinates the run; workers usually do the technical work. sai-3's coordinator
also owns common planning analysis and final integration. Configure these roles
separately when you want stronger reasoning without paying the same rate for
every task. Helper agents handle bounded research, command execution, and small
delegated tasks.

- **CONTEXT:** expected task material, not the model's context-window size.
- **DIFFICULTY:** reasoning demand, from `↑` to `↑↑↑`.
- **SETTING:** provider/model and reasoning variant.

Keep design at least as capable as implementation planning, and planning at
least as capable as the apply GREEN worker. The earlier phases make decisions
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
      ORCHESTRATOR  sai-3-implement              Medium   ↑↑          opencode-go/muse-spark-1.3-contributor (xhigh)
      WORKER        sai-3-ui-worker              Large    ↑↑          opencode-go/deepseek-v4.1-flash (max)
      WORKER        sai-3-frontend-worker        Large    ↑↑          opencode-go/deepseek-v4.1-flash (max)
      WORKER        sai-3-backend-worker         Large    ↑↑          opencode-go/deepseek-v4.1-flash (max)
      WORKER        sai-3-infra-worker           Large    ↑↑          opencode-go/deepseek-v4.1-flash (max)
      WORKER        sai-3-other-worker           Large    ↑↑          opencode-go/deepseek-v4.1-flash (max)
      ORCHESTRATOR  sai-4-apply                  Large    ↑↑↑         opencode-go/muse-spark-1.3-contributor (xhigh)
      WORKER        sai-4-red-worker             Medium   ↑           opencode-go/deepseek-v4.1-flash (max)
      WORKER        sai-4-green-worker           Medium   ↑↑          opencode-go/deepseek-v4.1-flash (max)

      ORCHESTRATOR  sai-review                   Large    ↑↑          opencode-go/muse-spark-1.3-contributor (xhigh)
      ORCHESTRATOR  sai-5-review                 Medium   ↑↑          opencode-go/muse-spark-1.3-contributor (xhigh)
      WORKER        sai-5-review-worker          Large    ↑↑          opencode-go/gpt-5.6-luna (max)
      WORKER        sai-review-fix-worker        Medium   ↑↑          opencode-go/deepseek-v4.1-flash (max)
      ORCHESTRATOR  sai-6-security               Medium   ↑           opencode-go/muse-spark-1.3-contributor (xhigh)
      WORKER        sai-6-security-worker        Large    ↑↑↑         opencode-go/deepseek-v4.1-flash (max)
      ORCHESTRATOR  sai-7-performance            Medium   ↑           opencode-go/muse-spark-1.3-contributor (xhigh)
      WORKER        sai-7-performance-worker     Large    ↑↑          opencode-go/deepseek-v4.1-flash (max)
      ORCHESTRATOR  sai-8-accessibility          Medium   ↑           opencode-go/muse-spark-1.3-contributor (xhigh)
      WORKER        sai-8-accessibility-worker   Large    ↑↑          opencode-go/deepseek-v4.1-flash (max)

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
Sonnet for lighter coordination and implementation, and Haiku for the executor.
These are starting points, not a guarantee for every project; test alternatives
on your own work before switching the whole pipeline.

## Keeping your configuration

### Planning-agent overrides

The customizer groups `sai-3-ui-worker`, `sai-3-frontend-worker`,
`sai-3-backend-worker`, `sai-3-infra-worker`, and `sai-3-other-worker` below
`sai-3-implement`; every worker remains individually selectable in Workers and
All views, presets, reset, and project-local model configuration. All five ship
identical instructions, skills, and the former sai-3 worker's default model per
harness. No default model is claimed to specialize in a category.

For Claude Code, override `.claude/agents/<worker>.md` (model and effort). For
opencode, override `.opencode/agents/<worker>.md` (model and optional variant).
The existing project-local definition wins over its global managed seed.
Start from the installed definition and keep its shared planning-contract
fetch. Add project-specific required skills to that local definition if needed;
model customization changes model tunables, not skills or planning ownership.
After agent-definition changes, restart the harness. Reinstall after upgrades
to refresh global managed seeds without overwriting project-local definitions.
Unavailable models or required skills stop the affected task with a named
resource report; no dynamic model selection or fallback is performed.

See the [category mapping and failure boundaries](commands/sai-3-implement.md#category-planning).

Save custom mixes under a personal preset name. The `[sai-default]-` prefix is
reserved: distributed presets are refreshed on installation, but personal
presets and project model selections stay unchanged until you apply a preset.

Only SAI commands and agents are model-customization targets. The universal
backlog and PR workflows run with the active session's model rather than a
separate model selection in this menu.
