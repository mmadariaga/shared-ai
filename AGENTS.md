# shared-ai — AGENTS.md

## What is this repository

A prompt and instruction library for orchestrating a **structured AI-assisted development pipeline** built on top of [OpenSpec](https://github.com/Fission-AI/OpenSpec).

It contains no application code. It is prompt infrastructure installed as global commands in Claude Code and opencode.

The `sai-*` commands are **wrappers over OpenSpec skills**. OpenSpec owns the change lifecycle and artifact schema; shared-AI owns the quality layer (isolation mode, model routing, glossary, cost discipline, RED→GREEN) and adds a granular implementation phase optimized for cheap-model execution.

## Main pipeline

```
 explore (optional) → spec(1) → design(2) → implement(3) → apply(4) → review(5) → [security(6) | performance(7) | accessibility(8)]
                                     ↑                                    ↓
                             approval gate                       commit / pr (on-demand)
                          (specs → .openspec.yaml)                       ↓
                                                                     archive
```

`/sai-build` is the user-invoked shortcut that chains implement(3) → apply(4) in one routed composition.

`/sai-review` is the user-invoked shortcut that runs review(5) and conditionally dispatches the recommended audits (security(6), performance(7), accessibility(8)) in one routed composition.

Each phase reads from and writes to **`openspec/changes/{change-name}/`** — single source of truth per change. Runs in **Isolation Mode**: every command starts with no inherited context, reading only the artifacts it needs.

`opsx:*` skills (`opsx:explore`, `opsx:propose`, `opsx:apply`, `opsx:archive`) are **internal building blocks** owned by the OpenSpec CLI. Users invoke the `sai-*` wrappers exclusively — they layer shared-AI quality behaviors on top of the skills.


## Repo structure

```
 sai/orchestration/command-runner.md            ← neutral command-runner protocol (loaded by every boot adapter before card selection)
 sai/orchestration/worker-core.md               ← neutral worker lifecycle protocol (loaded by the routed worker cards)
 sai/commands/                    ← command cards — routed cards per phase and utility cards per command (fetched by boot adapters at runtime)
 sai/commands/{spec,design,implement,apply,build,review,security,performance,accessibility}/  ← routed cards: coordinator.md, worker.md, and invocation.md where retained
 sai/commands/meta-review/             ← routed composition cards: command-bootstrap.md + coordinator.md (no invocation.md; no worker of its own)
 sai/commands/commit/             ← routed-shaped cards: coordinator.md + worker.md (no invocation.md; no openspec dependency)
 sai/commands/archive/            ← routed-shaped cards: coordinator.md + worker.md (no invocation.md)
 sai/commands/backfill/           ← routed-shaped cards: coordinator.md + worker.md (no invocation.md)
  sai/commands/merge/              ← routed-shaped cards: coordinator.md + worker.md (no invocation.md; no openspec dependency)
 sai/commands/{explore,pr,retire-docs,status,worktree}/          ← utility cards: body.md only
 sai/commands/{name}/instructions.md   ← command-local phase content (TASK block) folded into each command card
 sai/commands/{name}/*.template.md     ← neighboring co-located report/plan template files beside each card
 sai/commands/design/change-overview.md      ← shared overview-generation instruction, owned by the design command
 sai/commands/implement/adr-index.template.md ← canonical project-agnostic ADR index template, owned by the implement command
 sai/commands/implement/ddr-index.template.md ← canonical project-agnostic DDR index template, owned by the implement command
  sai/adapters/claude/             ← Claude Code boot adapter and paired non-worker panel/idea-list runtime glue
  sai/adapters/opencode/           ← opencode boot adapter and paired non-worker panel/idea-list runtime glue
  sai/orchestration/               ← matrix worker-binding templates (no flat coordinator/worker contracts)
  sai/orchestration/workers/bindings/ ← neutral installed routed worker bindings (ten phases plus the two apply and the one direct-build implementer worker)
 sai/policies/                    ← canonical reusable policies and prerequisite rules
 sai/tools/                       ← deterministic Node tools invoked by command prose (projected to both harnesses)
  sai/compat/                      ← retired caller-neutral compatibility-only assets
 sai/install-manifest.json        ← deterministic harness projection manifest for install, doctor, and uninstall
 commands/claude/                 ← Claude Code wrappers (model + effort + fetch to sai/adapters/claude/boot.md)
 commands/opencode/               ← opencode wrappers (model + fetch to sai/adapters/opencode/boot.md)
 agents/claude/                   ← Claude Code managed agents (fifteen routed Managed Workers + three Generic Agents)
 skills/claude/                   ← Claude Code harness skills
 skills/opencode/                 ← opencode harness skills
 configs/                         ← config samples (opencode.jsonc)
 openspec/schemas/sai-workflow/   ← custom OpenSpec schema (schema.yaml + 9 templates)
```

## Prerequisites

The pipeline depends on the OpenSpec CLI:
1. Install the `openspec` binary globally (see https://github.com/Fission-AI/OpenSpec).
2. Run `openspec init` in each project that will use shared-AI.

The openspec-dependent `sai-*` commands halt with a clear error if either is missing. Skills are installed by `openspec init` (per project), never bundled by the shared-AI install script. Global installer projections are expanded deterministically from `sai/install-manifest.json`; the same manifest drives install, doctor, and uninstall.

## Repository structure

| Directory | Purpose |
|-----------|---------|
| `sai/commands/{name}/instructions.md` | Command-local phase content (TASK block) folded into each command card, fetched by the card that owns it. |
| `sai/commands/{name}/*.template.md` | Co-located report/plan templates beside their owning card — e.g. `sai/commands/review/review-report.template.md`, `sai/commands/implement/implementation-plan.template.md`, `sai/commands/pr/pr-body.template.md`. |
| `sai/commands/design/change-overview.md` | Shared overview-generation instruction executed by the budget-routed subagent, the single source of the `change-overview.md` generation contract for every generation and regeneration. Owned by the design command, its only consumer. |
| `sai/commands/implement/adr-index.template.md`, `sai/commands/implement/ddr-index.template.md` | The canonical project-agnostic ADR/DDR index templates consumed by the Step 3 index-maintenance cold build. Owned by the implement command, their only consumer. |
| `sai/orchestration/command-runner.md` | Neutral command-runner protocol (result loop, coordinator routing, no phase branches). Loaded by every boot adapter before card selection. |
| `sai/orchestration/worker-core.md` | Neutral worker lifecycle protocol (worker journal, envelope, changed-files union, reconstruction). Loaded by the routed worker cards. |
| `sai/commands/` | Command cards — routed cards per phase and utility cards per command, fetched by boot adapters at runtime. |
| `sai/commands/{spec,design,implement,apply,build,review,security,performance,accessibility}/` | Routed cards: `coordinator.md`, `worker.md`, and `invocation.md` where retained. The build route uses `command-bootstrap.md` plus `coordinator.md` and adds no build-specific worker. |
| `sai/commands/meta-review/` | Routed composition cards: `command-bootstrap.md` + `coordinator.md` (no `invocation.md`; no worker of its own). The bootstrap declares the segment list and bounded triage parse; the coordinator is the supervising driver that reuses the existing review/security/performance/accessibility phase adapters as segments. |
| `sai/commands/commit/` | Routed-shaped commit cards: `coordinator.md` + `worker.md` (no `invocation.md`; no openspec dependency — the documented exemption). The coordinator owns the destructive surface (safe-operations) and executes the authorized `git commit`; the worker authors the message and never runs git mutations. |
| `sai/commands/archive/` | Routed-shaped archive cards: `coordinator.md` + `worker.md` (no `invocation.md`). The worker owns the read-only pre-flight (classification, checkbox scan, delta-sync diffing, collision check) and returns the two pre-mutation gates as `needs_input`; the coordinator owns every mutation — the sync writes, the archive directory move, and the post-archive commit gate. |
| `sai/commands/merge/` | Routed-shaped merge cards: `coordinator.md` + `worker.md` (no `invocation.md`; no openspec dependency — the documented exemption). The worker owns read-only conflict detection and analysis, returns the closed `conflict_detected` hand-off, then produces a complete global strategy with iterative context/correction support; the coordinator owns language selection, information/question presentation, every mutation, and the authorized commit. |
| `sai/commands/{explore,pr,retire-docs,status,worktree}/` | Utility cards: `body.md` only — the complete command body for utility commands. |
| `sai/adapters/claude/boot.md` | Claude Code boot adapter — loads `@sai/orchestration/command-runner.md`, selects the requested card, owns Claude fetch/dispatch; paired non-worker panel runtime glue also lives under `sai/adapters/claude/`, including `panel-render.md` and `idea-list-render.md`. |
| `sai/adapters/opencode/boot.md` | Opencode boot adapter — loads `@sai/orchestration/command-runner.md`, selects the requested card, owns opencode fetch/dispatch; paired non-worker panel runtime glue also lives under `sai/adapters/opencode/`, including `panel-render.md` and `idea-list-render.md`. |
| `sai/orchestration/` | Matrix worker-binding templates (`bindings/{claude,opencode}/worker-template.md`); no flat coordinator/worker contracts remain. |
| `sai/orchestration/workers/bindings/` | Neutral installed routed worker bindings for the eleven phases (`spec/design/implementation/review/security/performance/accessibility/commit/archive/backfill/merge-worker.md`) plus the two apply Step-execution worker bindings (`red-worker.md`/`green-worker.md`) and the explore direct-build implementer binding (`direct-build-worker.md`) projected for both harnesses; Direct-build draft and archive execution use the existing backfill and archive bindings; non-worker panel and idea-list runtime glue is owned by the adapter seam. |
| `sai/policies/` | Canonical glossary, prerequisite, picker, commit, status, and feedback policies. `sai/policies/artifact-review-contract.md`: shared artifact review finding contract — closed severity vocabulary and assignment criteria, finding shape, severity-prefixed identifier scheme, and closing `Summary:` tally line — single-sourced and referenced by every artifact review surface. |
| `sai/tools/` | Deterministic Node tools invoked by command prose instead of being re-interpreted by it: `check-delta-headers.js` (delta header preflight), `worktree.js` (the `/sai-worktree` inventory, create, index, remove, and branch-deletion engine), `prereqs.js` (the OpenSpec prerequisite preflight engine), `change-picker.js` (the change-name resolution engine shared by `change-picker.md` and `status-picker.md`), `status.js` (the `/sai-status` single-change panel and bulk-table engine), `openspec-yaml.js` (the shared `.openspec.yaml` reader consumed by the status tool and the linter), and `lint.js` (the selectable artifact-format checks). The `sai-tools` projection installs every `*.js` here into `sai/tools/` under both harness roots as managed, content-tracked files, so an invocation resolves against the same root that served the calling instruction. |
| `sai/compat/` | Retired caller-neutral compatibility assets. The ADR index template is not owned here. |
| `sai/commands/apply/invocation.md` and `sai/commands/{review,security,performance,accessibility}/invocation.md` | Caller-neutral invocation bodies retained by those routed paths. Spec and design use their worker/coordinator step contracts directly; implementation uses `worker.md` plus `steps/`. The build composition uses `sai/commands/meta-build/command-bootstrap.md` and `coordinator.md`. |
| `sai/install-manifest.json` | Deterministic source-to-destination projection rules consumed by installer, doctor, and uninstall. |
| `sai/SAI_AGENTS.md` | Project-agnostic orientation index over the SAI documentation surfaces; installed at each harness root (`SAI_AGENTS.md`) by the `sai-agents-index` root-class projection. |
| `agents/claude/` | Claude Code managed agents — fourteen routed Managed Workers (`sai-1-spec-proposal-worker`, `sai-2-design-worker`, `sai-3-implementation-worker`, `sai-4-red-worker`, `sai-4-green-worker`, `sai-5-review-worker`, `sai-6-security-worker`, `sai-7-performance-worker`, `sai-8-accessibility-worker`, `sai-commit-worker`, `sai-archive-worker`, `sai-backfill-worker`, `sai-merge-worker`, `sai-direct-build-worker`) plus the three Generic Agents (`budget-explorer`, `budget-executor`, `budget-subagent`). |
| `agents/claude/sai-1-spec-proposal-worker.md` | Claude Code custom agent for the medium-effort spec proposal worker. |
| `agents/claude/sai-3-implementation-worker.md` | Claude Code custom agent for the high-effort implementation-planning worker. |
| `agents/claude/sai-2-design-worker.md` | Claude Code custom agent for the high-effort design-planning worker. |
| `agents/claude/budget-explorer.md` | Claude Code Generic Agent for read-only research and doc lookup — installed as a user-global seed at `~/.claude/agents/budget-explorer.md`; `model` and `effort` frontmatter is user-owned (shipped seed `model: haiku` + `effort: low`). |
| `agents/claude/budget-executor.md` | Claude Code Generic Agent for execute-only command delegation — installed as a user-global seed at `~/.claude/agents/budget-executor.md`; `model` and `effort` frontmatter is user-owned (shipped seed `model: haiku` + `effort: low`). |
| `agents/claude/budget-subagent.md` | Claude Code Generic Agent for general-purpose task delegation — installed as a user-global seed at `~/.claude/agents/budget-subagent.md`; `model` and `effort` frontmatter is user-owned (shipped seed `model: haiku` + `effort: low`). |
| `skills/claude/` | Claude Code harness skills. |
| `skills/opencode/` | opencode harness skills. |
| `skills/` | Universal skills installed globally (not project-local). Fetched by wrappers via `~/.claude/skills/` or `~/.config/opencode/skills/`. |
| `skills/universal/sai-commands/SKILL.md` | SAI command registry — lists all /sai-* commands and enforces fetch-before-execute discipline. Loaded to prevent LLM from skipping command files. |
| `skills/universal/safe-operations/SKILL.md` | Safe operations skill — enforces reversibility and impact awareness, requires user confirmation before destructive/hard-to-reverse/shared-system operations. Loaded by 9 sai-* command wrappers. |
| `skills/universal/` | Universal skills (no vendor). Fetched by all wrappers. |
| `skills/claude/` | Claude Code-specific skills (subagent dispatch rules, etc.). Fetched by wrappers that spawn subagents. Routed workers load neutral bindings directly from installed `sai/orchestration/workers/bindings/` paths. |
| `skills/opencode/` | Opencode-specific skills (subagent dispatch rules, etc.). Fetched by wrappers that spawn subagents. Routed workers load neutral bindings directly from installed `sai/orchestration/workers/bindings/` paths. |
| `skills/claude/budget-explorer/SKILL.md` | Subagent dispatch rules for Claude Code — dispatch uses the matching `budget-explorer` agent file, whose `model` and `effort` frontmatter is user-owned; task classification, a 30-call maximum, and output contracts. Fetched by wrappers that spawn subagents. |
| `skills/claude/budget-executor/SKILL.md` | Executor subagent rules for Claude Code — dispatch uses the matching `budget-executor` agent file, whose `model` and `effort` frontmatter is user-owned; execute-only discipline. Fetched by wrappers that spawn executor subagents. |
| `skills/claude/budget-subagent/SKILL.md` | Task subagent rules for Claude Code — dispatch uses the matching `budget-subagent` agent file, whose `model` and `effort` frontmatter is user-owned; single-task scope with an approximate 30-call soft limit. Fetched by wrappers that spawn task subagents. |
| `skills/opencode/budget-explorer/SKILL.md` | Subagent dispatch rules for opencode — explore keyword binding, cap rules, output contracts. Model resolved from the explore agent file's `model` frontmatter (`~/.config/opencode/agents/explore.md`). |
| `skills/opencode/budget-executor/SKILL.md` | Executor subagent rules for opencode — executor keyword binding, execute-only discipline. Model resolved from the executor agent file's `model` frontmatter (`~/.config/opencode/agents/executor.md`). |
| `skills/opencode/fetch/SKILL.md` | Fetch @ path resolver for opencode — replicates Claude Code's built-in Fetch @ mechanism. Loaded first by all opencode wrappers to enable `@sai/` and `@skills/` path resolution. |
| `agents/claude/sai-1-spec-proposal-worker.md` | Claude Code custom agent for the medium-effort spec proposal worker. |
| `agents/claude/sai-3-implementation-worker.md` | Claude Code custom agent for the high-effort implementation-planning worker. |
| `agents/claude/sai-2-design-worker.md` | Claude Code custom agent for the high-effort design-planning worker. |
| `commands/claude/` | Wrappers for Claude Code. YAML frontmatter (`description`, `argument-hint`, `model`, `effort`) + fetch to `sai/adapters/claude/boot.md` + fetch to project-local skill files. |
| `commands/opencode/` | Wrappers for opencode. YAML frontmatter (`description`, `model`) + fetch to `sai/adapters/opencode/boot.md` + fetch to project-local skill files. |
| `configs/` | Config samples. `opencode.jsonc`: `$schema` + `subagent_depth` + the SAI external-directory permission; no agent definitions (the agents ship as managed agent files). |

Wrappers are **thin** — they specify the model, route through their harness boot adapter, and (for openspec-dependent commands) fetch policies, compatibility assets, and relevant project-local skills. Each wrapper enters its own `sai/adapters/{claude,opencode}/boot.md`; the boot loads `@sai/orchestration/command-runner.md`, selects the requested command card, and owns only the harness-specific fetch and dispatch mechanics. Claude Code and opencode load harness-selected routed bindings directly from the neutral installed SAI paths. The manifest determines which source files are installed for both harnesses. A source-tree reference such as `Fetch @sai/orchestration/workers/bindings/spec-worker.md` therefore targets the installed neutral projection, not a required checked-in file at that path; opencode resolves a project-local `.opencode/sai/` candidate first and falls back to `~/.config/opencode/sai/`, while Claude Code uses its corresponding installed SAI root. The final phase bindings are materialized from the worker matrix and the per-harness worker templates during projection.

## Critical conventions

### Wrappers, never skills
sai-* commands prepend shared-AI behaviors (glossary-format, spec.propose) and then `Fetch` the OpenSpec skill content. The skill `SKILL.md` files are **never modified** — the OpenSpec CLI regenerates them on update.

### Harness universality
The pipeline supports two harnesses: **Claude Code** and **opencode**. Every change to a wrapper, shared instruction, skill, installer, or this AGENTS.md MUST consider both. Harness-agnostic content stays harness-agnostic; the moment one harness is named, both are named with their own mechanism. This rule is upstream of Mirror discipline and also governs instruction prose, installer scripts, model tables, and docs. Before finishing any change, scan the diff for a harness name and verify both supported harnesses are addressed.

### Implementation coordinator and worker
Claude Code and opencode route `/sai-3-implement` through the shared orchestration core and their respective worker binding. Both preserve the same `implementation.md` artifact contract and MANDATORY STOP. The routed coordinator performs no technical I/O and only the worker owns routed planning writes.

### Apply coordinator and worker
Claude Code and opencode route `/sai-4-apply` through the routed apply card set (`sai/commands/apply/coordinator.md`, `runner.md`, `invocation.md`, and the RED and GREEN worker contracts) and dispatch the `sai-4-red-worker` / `sai-4-green-worker` managed workers on the budget tier. The coordinator remains the executing main-session driver: it owns change resolution, the run-start Step Projection, coordinator verification, human gates, appendices, and commits, while the RED worker authors the tests (blind to the GREEN implementation body in the split flow, and authoring green tests under the green-exception) and the GREEN worker implements with an absolute test-file prohibition. Both harnesses preserve the same `implementation.md` artifact contract and MANDATORY STOP.

**Three irreducible apply differences** (deliberate design, not debt): apply answers three shared questions differently from every other routed phase, and each difference is intentional.
1. **Dynamic Step projection from `implementation.md`** — apply has no static `progress_plan`; the coordinator renders the step list at run start by reading `openspec/changes/{change-name}/implementation.md` and collecting `#### Step N:` headings. The plan is auth-authored, not phase-declared, and the dynamic projection is the only visible list during apply.
2. **Fresh blind workers per Step** — each RED and GREEN dispatch is a separate worker invocation with an immutable dispatch-local plan; workers do not persist across Steps, and RED remains blind to the GREEN implementation body in the split flow.
3. **Coordinator-owned git operations** — the coordinator alone runs `git add` and `git commit` at the two commit-authorization gates (per-Step STOP & COMMIT and terminal documentation commit); RED and GREEN workers never run git and never edit `implementation.md`.

The coordinator card owns the single fetch of `runner.md`; `invocation.md` is a shell card that carries prerequisite checks, fast-track parse (sole authority), change resolution, behavior loads, the `## Completion` section (sole authority for the standalone completion action), and a non-normative scratch-cleanup reference. The relocated behaviors — `session_commit_authorized` flag, fast-track branch auto-stay, and chained activation contract — live on the coordinator card because both entry paths (standalone wrapper boot and `/sai-build` chained segment) load it.

### Build coordinator and worker

`/sai-build` is a user-invoked routed composition command, not an `opsx:*` skill. Its internal routed identity is `meta-build` (`command_name: meta-build`), and Claude Code and opencode use `sai/commands/meta-build/command-bootstrap.md` followed by `sai/commands/meta-build/coordinator.md`. The ordinary composition coordinator runs exactly two phase adapters in list order: the existing implementation adapter, then the existing apply adapter. It resolves the change once, strips an explicit `--fast-track` token before resolution, does not re-enter either wrapper, and does not add an intermediate approval gate. Build does not declare a managed worker, worker binding, or worker matrix entry; apply remains the sole owner of RED/GREEN selection. Apply fast-track is always injected at activation and the build coordinator owns its single banner. Claude Code uses `opus` with low effort; opencode uses `opencode-go/deepseek-v4-flash` with `variant: max`. Both harnesses preserve the same phase order, artifacts, changed-files union, worker ownership, and terminal behavior.

### Meta-review coordinator and worker

`/sai-review` is a user-invoked routed composition command, not an `opsx:*` skill. Claude Code and opencode use `sai/commands/meta-review/command-bootstrap.md` followed by `sai/commands/meta-review/coordinator.md`. The ordinary composition coordinator runs the existing review adapter at position 0, then conditionally activates the existing security/performance/accessibility adapters at positions 1–3 based on a bounded triage parse of the freshly regenerated `review.md`. It resolves the change once, strips an explicit `--fast-track` token before resolution as a behavioral no-op, does not re-enter any wrapper, and does not add an intermediate approval gate. Meta-review does not declare a managed worker, worker binding, or worker matrix entry; each activated segment retains its existing worker. The bootstrap declares the segment list and triage parse; the coordinator dispatches eligible audit workers concurrently in one harness-native batch and processes their Result Loops sequentially in fixed order (security → performance → accessibility). A `needs_input` pauses only its own segment through the native picker. Claude Code uses `opus` with low effort; opencode uses `opencode-go/deepseek-v4-flash` with `variant: max`. Both harnesses preserve the same phase order, artifacts, changed-files union, worker ownership, and terminal behavior.

### Design coordinator and worker
Claude Code and opencode route `/sai-2-design` through the shared orchestration core and their respective design-worker binding; Claude uses a low-effort coordinator and high-effort worker, while opencode declares `model: opencode-go/glm-5.2` and `variant: high` on the wrapper and uses `sai-2-design-worker`. Fixed notices are acknowledged with `continue_after_notice`; `/sai-2-design` ends at design completion, and `/sai-3-implement {name}` is separate in a new chat. The opencode routed phases run under your active primary agent; it must permit native question and task dispatch to the numbered SAI workers. The stock build agent satisfies this. If a restrictive primary agent is active, switch to a permissive one (e.g. build) — do not reintroduce a managed coordinator profile. Both paths preserve `openspec/changes/{change-name}/design.md`, `tasks.md`, and `interfaces.md`; Proposal Complexity remains descriptive.

### Spec coordinator and worker
Claude Code and opencode route `/sai-1-spec` through the shared spec coordinator and worker, consuming the canonical `sai/policies/spec-phase-contract.md` and their mirrored spec worker bindings. Claude Code preserves the `opus`/medium wrapper and uses the medium-effort `sai-1-spec-proposal-worker`; opencode uses `opencode-go/minimax-m3` and `sai-1-spec-proposal-worker`. The worker owns prerequisites, resolution, proposal/spec artifacts, summary, and feedback; both paths create only proposal/spec artifacts plus permitted glossary updates, preserve the same summary/feedback/stop contract, and require same-harness parity evidence.

**Active experiment — step-gated instruction delivery:** `/sai-1-spec`, `/sai-2-design`, `/sai-3-implement`, `/sai-5-review`, `/sai-6-security`, `/sai-7-performance`, and `/sai-8-accessibility` split each worker's instruction mass into one file per progress-plan step under `sai/commands/{spec,design,implement,review,security,performance,accessibility}/steps/` (including the design step library at `sai/commands/design/steps/`; `common.md` plus per-id step files; `prereqs-and-change` / `prereqs-resolution` has no file of its own, and each audit phase's leading scope-resolution step is likewise fileless). Each worker card loads `steps/common.md` at dispatch alongside its fixed protocols; each coordinator declares a static `step_pointer_map`, and each progress-event continuation carries one deterministic `Active step:` pointer line naming the next step file. Feedback and recovery continuations carry no pointer line, replacement reconstruction adds `active_step_id`, and adapters without a declared map keep today's exact continuation behavior. The remaining compatibility instruction for apply stays beside the implementation step library; it is not part of the active implementation worker route.

The design step map covers the id superset of both plans; base-plan activations never derive the inert `overview` pointer entry. The design worker executes only the coordinator-named step, while `steps/review.md` and `steps/overview.md` remain thin reinforcement files (review references `@sai/policies/artifact-feedback-gate.md`; overview references the worker card's unchanged Overview generation section). The spec `prereqs-and-change` step and implement `prereqs-resolution` step run from the worker card plus `common.md` before the first pointer. `/sai-build`'s chained implement segment rebinds the implement adapter's declared `step_pointer_map` through per-segment adapter-field rebinding and therefore inherits pointer delivery, with no opt-out special case. The implementation `steps/` library is the active route; `instructions.md` remains only for apply compatibility.

### Audit coordinators and workers
Claude Code and opencode route `/sai-5-review`, `/sai-6-security`, `/sai-7-performance`, and `/sai-8-accessibility` through the shared orchestration core and their respective audit-worker bindings. Each audit adapter declares the canonical `progress_plan` (resolution, scope/discovery, primary analysis, gated analysis, report verification) and an explicit `recovery_policy: false` (bounded recovery stays disabled for the minimal-lifecycle commands' documented absence and for these audits); its worker reports completed milestones through additive progress events; the optional gated stages (review Pass 11 mutation analysis, security SCA, performance diagnostics, accessibility runtime checks) complete when their applicability gates resolve, whether the work runs or is legitimately skipped, and empty-diff/no-UI early outcomes report their completed milestones before the existing terminal result. Each audit coordinator card declares its done-literal exactly once, in its navigation section (`Review done.`, `Security audit done.`, `Performance audit done.`, `Accessibility audit done.`); the `terminal_navigation` field line points to that section without restating the literal. Both harnesses render the plans through `@sai/policies/todo-structure.md` with coordinator-only emission and no `Milestone Stamp` annotations.

### Commit coordinator and worker
Claude Code and opencode route `/sai-commit` through the routed-shaped commit card set (`sai/commands/commit/coordinator.md` + `worker.md`) and dispatch the `sai-commit-worker` managed worker through the `commit-worker.md` binding. The adapter declares a minimal lifecycle: no `progress_plan`, no `recovery_policy`, no progress events, and no feedback gate; `original_envelope` is exactly `arguments_value`. The worker authors the proposed message from staged state (faithfulness rule, repo-style rubric via `commit-rules.md`, Status/Staged/Totals/Unstaged blocks) and returns it as payload content; the authorization ask is a `needs_input` result that the coordinator presents through the native picker and forwards verbatim. On authorization YES (or an active session grant), the COORDINATOR alone executes the git mutation — today's exact surface (`git commit -m`/`--amend` HEREDOC form); the worker never runs `git add` or `git commit`. Terminal navigation prints the worker-authored summary verbatim and closes with exactly `Commit done.` on an executed commit. Both harnesses preserve the same payloads, stop texts, and git surface.

### Archive coordinator and worker
Claude Code and opencode route `/sai-archive` through the routed-shaped archive card set (`sai/commands/archive/coordinator.md` + `worker.md`) and dispatch the `sai-archive-worker` managed worker through the `archive-worker.md` binding. The adapter declares the same minimal lifecycle shape as commit: no `progress_plan`, no `recovery_policy`, no progress events, no feedback gate, and closed adapter fields. The coordinator keeps full openspec prerequisite checks (no exemption), parses `--fast-track` itself (banner + cleaned remainder), resolves the change via the shared change-picker before dispatch, and declares `fast_track_active` to the worker as session state alongside the envelope — never an envelope key. The worker owns the read-only pre-flight (Classification Check, checkbox scan, delta-sync diffing vs main specs, target-name collision check) by following `sai/commands/archive/instructions.md`, returns findings as payload content, and carries both pre-mutation gates — unchecked-items and delta-spec sync — as `needs_input` results that the coordinator presents through the native picker and forwards verbatim. The coordinator owns every mutation: the upstream skill's sync execution (with worker post-sync re-verification), the archive directory move into `openspec/changes/archive/YYYY-MM-DD-{name}/`, and the post-archive commit gate per `archive-commit-gate.instructions.md` (skip rule, three-option selector, fast-track new-commit auto-select, two-path staging, empty-index guard, pushed-HEAD guard). Terminal navigation prints the worker-authored summary verbatim and closes with exactly `Archive done.` only when the move executed. All stop texts, gate question wordings, checkbox-threshold semantics, delta-sync behaviour, date-prefix naming rules, and the change-picker integration are preserved byte-for-byte; the command operates on OTHER changes mid-migration without recursion hazards.

### Merge coordinator and worker
Claude Code and opencode route `/sai-merge` through the routed-shaped merge card set (`sai/commands/merge/coordinator.md` + `worker.md`) and dispatch the `sai-merge-worker` managed worker through the `merge-worker.md` binding. The adapter keeps the same minimal lifecycle shape as commit and archive while declaring the merge-only closed nonterminal `conflict_detected` extension; it has no `progress_plan`, no `recovery_policy`, and no progress events, and `original_envelope` is exactly `arguments_value`. The coordinator keeps the openspec prerequisite exemption (like `sai-commit`), parses `--fast-track` itself (banner + cleaned remainder), and carries `fast_track_active` and the conflict-triggered `working_language` as invocation state alongside the envelope — never as envelope keys. A clean merge never asks for a language or strategy. On conflict, the worker reports the affected-file inventory before semantic analysis; the coordinator asks for the working language through the active harness-native question mechanism, then the worker analyzes the conflict with that language and returns one complete global resolution strategy. The coordinator presents worker information as ordinary text, sends closed decisions through the native picker, forwards open context/correction input to the same worker, and requires strategy confirmation before validating or writing complete resolution files. New application or verification problems re-enter strategy analysis with the same language and worker. The worker remains read-only; the coordinator owns the merge launch, resolution validation/writes, ADR/DDR renames (`git mv`), reference updates, staging, verification routing, and authorized merge commit (HEREDOC form). Terminal navigation prints the worker-authored summary verbatim and closes with exactly `Merge done.` only when the commit executed; refusal documents the exact repo state (E9). Fast-track bypasses only the scope gate, and both harnesses preserve the same language hand-off, strategy decisions, complete-file payloads, stop texts, verification budget, ADR/DDR suffix ordering, and commit surface.

### Direct Build (unattended) selector option (crystallization-close)
Current Direct Build (unattended) mutation ownership is the existing `sai-backfill-worker` and
`sai-archive-worker`: each uses a read-only `--direct-build-prepare` stretch and
one coordinator-validated `--direct-build-execute` continuation. The dedicated
hands-worker role (historical `sai-autofast-hands-worker`), its matrix entry, and
both harness projections are retired. The archive worker owns the validated sync →
archive move → owned staging → one local commit order; the backfill worker owns only
its validated draft writes.

Claude Code and opencode offer a third **Direct Build - Unattended** option on sai-explore's crystallization-close selector (item 10 of `sai/commands/explore/instructions.md`) beside the existing **Plan - Unattended** / **Manual** options. Selecting it consents delegated writes AND pre-authorizes exactly one local commit; it dispatches nothing unless selected and every other command surface is unaffected. The run is an eight-step unattended flow: block-driven direct implementation by `sai-direct-build-worker` (envelope = `--direct-build` marker + the complete Ready to Propose block — it receives ONLY the block), a functional review/fix loop with the existing three-round budget semantics (cap exhaustion non-failure), retroactive artifact reconstruction via the EXISTING sai-backfill worker with grounded auto-answer-or-escalation (diff source = staged changes over a base SHA captured at implementer dispatch; Q1 from What/Why; Q2 from fix-loop findings), spec review plus schema validation of draft content read-only against `openspec/schemas/sai-workflow/schema.yaml`, the ADR/DDR criteria pass, archive mutations under fast-track gate semantics via the EXISTING sai-archive worker pre-flight, and closed-order validated mutations by the same archive worker after `--direct-build-execute` (exact-path writes by backfill → sync → archive move → owned-path staging → commit-rules message authoring → HEREDOC local commit; never push). The implementer is a budget-tier managed worker wired like the apply RED/GREEN roles: matrix entry in `sai/install-manifest.json` (phase `direct-build`, binding stem `direct-build`, contract at `sai/commands/explore/direct-build-worker.md`), materialized bindings for both harnesses, and managed agent files. Route identity is `direct-build-unattended`; visible label is `Direct Build - Unattended`. This lane is not `/sai-build` / `meta-build`. The autonomy-audit layout used by the Plan - Unattended and Direct Build - Unattended terminal reports is single-sourced in `sai/policies/autonomy-audit-log.md`; the auto-answer machinery itself is explore-only — no standalone command gains auto-answers, counters, or audit emission, and extracting the shared policy is a behavior-neutral refactor of explore's existing output.

### Backfill coordinator and worker
Claude Code and opencode route `/sai-backfill` through the routed-shaped backfill card set (`sai/commands/backfill/coordinator.md` + `worker.md`) and dispatch the `sai-backfill-worker` managed worker through the `backfill-worker.md` binding. The adapter declares the same minimal lifecycle shape as commit and archive: no `progress_plan`, no `recovery_policy`, no progress events, closed adapter fields; `original_envelope` is exactly `arguments_value`. The coordinator keeps full openspec prerequisite checks (no exemption) and owns ask presentation, schema validation, and every final write: interview asks arrive as worker `needs_input` payloads (closed-choice asks through the native picker per `remember.md`; open-ended interview questions rendered as ordinary conversation text exactly once per the instruction's Delivery rule), exact answers forward byte-faithfully through the binding continuation, draft artifacts validate against `openspec/schemas/sai-workflow/schema.yaml`, and only fully valid drafts are written into `openspec/changes/{name}/` by the coordinator itself. The worker owns the read-only technical flow — diff-source selection, read-only diff computation, optional intent capture, in-memory intent reconciliation with `prior_intent` marker rules, the fixed and adaptive interview, delegated `budget-explorer` conflict scanning (the `@skills/budget/SKILL.md` load lives in the worker card), and draft composition — returning draft artifact CONTENT as payload text and never writing a file or running a mutating git command. Terminal navigation prints the worker-authored summary verbatim, closes with exactly `Backfill complete in openspec/changes/{name}/.` (today's preserved MANDATORY STOP text) only when validated artifacts were written, then prints the `## Ready to Archive` block as the LAST output. Interview question wordings, gate semantics, schema-validation rules, applied-state markers/prior_intent handling, and budget-explorer output contracts are preserved verbatim; the tool operates on OTHER changes mid-migration without recursion hazards.

### Single artifact home
All sai-* artifacts (`implementation.md`, `review.md`, `security.md`, `performance.md`, `accessibility.md`, `pr.md`) write to `openspec/changes/{change-name}/`. The legacy `plans/` directory is **not used** by the new pipeline.

### Checkboxes are actions, notes are explanations
In `implementation.md`, a **checkbox** (`- [ ]`) is an **action** — something `/sai-4-apply` runs or the user verifies, then marks `[x]`; every `- [ ]` is a task a downstream consumer (`sai-4-apply`, `sai-archive`, `sai-pr`) acts on. An **italic note** (`*(...)*`) is an **explanation** — context for the reader that is never marked or acted on. A step with no observable human check therefore encodes that absence as an italic note, never as a placeholder `- [ ] No human check required` checkbox.

### Prerequisite check
All openspec-dependent sai-* commands (`sai-explore`, `sai-1-spec`, `sai-2-design`, `sai-3-implement`, `sai-4-apply`, `sai-build`, `sai-archive`, `sai-5-review`, `sai-6-security`, `sai-7-performance`, `sai-8-accessibility`, `sai-pr`) perform three checks by fetching `@sai/policies/prereqs.md` (resolved per harness: Claude Code via `~/.claude/sai/`, opencode via `~/.config/opencode/sai/`): (1) `openspec` binary in PATH, (2) `openspec/` directory exists, (3) `openspec/config.yaml` declares `schema: sai-workflow`. The three checks are evaluated by `sai/tools/prereqs.js` (`check`, always with `--json` and `--cwd`; exit 0 = `verdict: pass`, 1 = `verdict: halt` with the failed check in `failed_check`, 2 = usage or IO error) rather than re-derived in prose; the consuming surface owns the STOP-and-print remediation literals and prints the one matching `failed_check` verbatim. `/sai-build` performs resolution and prerequisite checks once for the composition; its apply segment does not repeat them. `sai-commit`, `sai-merge`, `/sai-retire-docs`, and `/sai-worktree` are the exceptions — they do not require the OpenSpec CLI or schema. Routed-shaped `/sai-commit` and `/sai-merge` keep that exemption in their coordinator cards: they never fetch `@sai/policies/prereqs.md` and require no openspec artifact or binary. `/sai-retire-docs` may inspect available `openspec/specs/` files but never runs `openspec validate --specs`. `/sai-worktree` runs its whole state machine through `sai/tools/worktree.js` (`inventory`, `create`, `index`, `remove`, `delete-branch`, always with `--json` and `--cwd`), and the Create action performs one best-effort, non-fatal indexing step after creating a worktree: it prints the pre-announcement returned by `create`, then runs `index <worktree-path>` (`codegraph init` there) and reports a single one-line result whether it succeeds, the `codegraph` binary is absent, or it fails — while still requiring no OpenSpec prerequisites.

### Isolation Mode
Isolation is enforced by a single preamble line carried in **both** harness boot adapters (`sai/adapters/claude/boot.md` and `sai/adapters/opencode/boot.md`), identical word-for-word:

```
This invocation starts clean: disregard prior conversational context except where a fetched contract explicitly directs otherwise.
```

The boot loads this preamble once per invocation, before `@sai/orchestration/command-runner.md` and before any card selection. Per-command cards (`coordinator.md`, `invocation.md`, launcher cards) carry **no** isolation block of their own. Never remove or modify the boot preamble line, and keep it byte-identical across both harnesses.

### Safe Operations
Loaded by 10 sai-* commands (`sai-1-spec`, `sai-4-apply`, `sai-archive`, `sai-backfill`, `sai-commit`, `sai-explore`, `sai-merge`, `sai-pr`, `sai-retire-docs`, `sai-worktree`) via `Fetch @skills/safe-operations/SKILL.md` — on the wrapper where the command still carries one, otherwise on the routed coordinator card (`sai-archive`, `sai-backfill`, `sai-commit`, and `sai-merge` load it in their coordinator cards). The skill enforces:
- **Reversibility assessment**: agent MUST evaluate whether an operation is hard to reverse, destructive, or affects shared systems before executing.
- **Confirmation gate**: agent MUST ask user before: deleting files/branches, `rm -rf`, `git push --force`, `git reset --hard`, amending published commits, pushing code, commenting on PRs/issues, modifying shared infrastructure.
- **No destructive shortcuts**: agent MUST NOT bypass safety checks (`--no-verify`) or discard unfamiliar files that may be in-progress work.

### Explore-mode read-only enforcement
`sai-explore`'s explore-mode "No file writes" guarantee (`sai/commands/explore/instructions.md`) is **enforced**, not merely conventional, in Claude Code via `allowed-tools` (scoped to read/search/dispatch tools — `Edit`, `Write`, and bare `Bash` omitted; shell limited to the prefix-scoped globs `Bash(openspec:*)` and `Bash(git:*)`). **opencode** has no per-command tool-restriction frontmatter field, so `commands/opencode/sai-explore.md` is intentionally left unchanged and its read-only guarantee stays model-discipline-only; routing opencode's `sai-explore` to a read-only sub-agent was rejected because it breaks the main-session interactivity the command requires.

### Language Policy
All agents MUST think and reason internally in English, regardless of the user's input language.

- **User-facing chat:** respond in the language the user writes in (default English if unclear).
- **Generated artifacts** (`implementation.md`, `review.md`, `security.md`, `performance.md`, `accessibility.md`, commit messages, PR bodies, code, technical explanations): written in English unless the user explicitly requests otherwise.

### Cost Discipline (research subagents)
Wrappers that spawn subagents fetch `skills/claude/budget-explorer/SKILL.md` (Claude) or `skills/opencode/budget-explorer/SKILL.md` (opencode). The main agent reasons and synthesizes. Subagents do I/O. Key rules:
- Claude Code dispatches a single explorer tier through the matching `budget-explorer` agent file — `Agent(subagent_type: budget-explorer, run_in_background: true, prompt: <prompt>)` with no per-spawn model; the resolved `budget-explorer.md` agent file's `model` and `effort` frontmatter (user-owned) selects the model, and the tool-call ceiling is 30 per spawn.
- Multi-step synthesis stays with the main agent; speculative exploration ("look around") is allowed only in the explorer tier.
- Opencode retains its own mechanism: the `explore` keyword binds the explore agent, and the model comes from the explore agent file's `model` frontmatter (`~/.config/opencode/agents/explore.md`).
- Every subagent call declares an **output contract** (exact fields, length cap, no raw content).
- Main agent never calls WebFetch directly.

### Budget-subagent hang containment

`CLAUDE_ASYNC_AGENT_STALL_TIMEOUT_MS` is unset in this project's configuration and is not active by default; a probe with the variable unset ran for roughly 600 seconds of complete silence without triggering termination. opencode exposes no equivalent mechanism.

The configured case (a non-zero value of `CLAUDE_ASYNC_AGENT_STALL_TIMEOUT_MS` set explicitly) is an open question that this change did not probe. No design or task in this change may depend on a stall watchdog firing in its current default-off configuration — the rule is scoped to "this change" and to "default-off configuration", not to the future possibility of an activated watchdog.

The only containment layer this change adopts is background dispatch on Claude Code, which keeps a hung child reachable for reaping but does not terminate it automatically, and no wall-clock bound is assumed to fire. The opencode half of this change is documentation parity only, since opencode's `task` tool has no `run_in_background` parameter.

### GLOSSARY.md
- `sai-1-spec` reads `GLOSSARY.md`, updates it inline, challenges ambiguous terms.
- `sai-3-implement` uses canonical glossary terms for identifiers.
- `sai-5-review` validates language consistency in new code.
- Format: `sai/policies/glossary-format.md`, loaded by each glossary-consuming command's active worker or phase contract.

### RED → GREEN
Integrated in `implementation.md` (loaded by `sai-3-implement`) and `sai/commands/implement/instructions.md` (loaded by `sai-4-apply`):
- `implementation.md` includes a RED block (failing test) before GREEN (minimal implementation).
- `sai-4-apply` runs RED, verifies failure, writes GREEN, verifies pass.

Retirement of obsolete guard tests is owned by the RED dispatch (or the green-exception flow), never by GREEN: the plan names retired test files only inside RED blocks by exact repository-relative path, and the RED worker may remove exactly those plan-named files. Tests assert the absence of retired files; they never encode routing vocabulary such as "must be removed in GREEN".

### ADR/DDR Proposal Check
The three criteria, the ordered routing test that resolves `adr` vs `ddr`, and the never-offer-a-choice rule are single-sourced in `sai/policies/adr-ddr-criteria.md`, fetched by `sai-2-design` (which records `**Record family**: adr|ddr` in `design.md`) and `sai-3-implement` Step 3 (which acts on it). The criteria are:
1. **Hard to reverse**
2. **Surprising without context**
3. **Real trade-off**

`sai-3-implement` uses only the resolved family's physical `docs/adr/0000-INDEX.md` or `docs/ddr/0000-INDEX.md` as the ADR/DDR culture signal: an existing index permits direct creation of a qualifying record; an absent index requires explicit user approval, even when records exist. Non-qualifying decisions create and ask nothing.

### Triage in review
`sai-5-review` does not perform SAST/profiling/axe. It detects the touched surface and recommends audits:
- Security surface → `sai-6-security`
- Performance surface → `sai-7-performance`
- Accessibility surface (`.tsx`/`.jsx`/`.astro`/`.html`/`.vue`/`.svelte`/`.css`) → `sai-8-accessibility`

### Fast-track flag (`--fast-track`)

A per-invocation opt-in on `sai-explore`, `sai-2-design`, `sai-4-apply`, `sai-archive`, `sai-backfill`, and `sai-merge` that trades a fixed, audited set of gates for a single end-of-run checkpoint. The canonical model is single-sourced in `sai/policies/fast-track-flag.md`: the coordinator/main session owns BOTH the parse and the banner on every opt-in command, the activation signal travels everywhere as invocation-scoped session state named exactly `fast_track_active` (never an envelope key, never persisted), and every fast-track invocation produces exactly one visible `> FAST-TRACK MODE ACTIVE` confirmation. Concretely: `sai-explore`, `sai-4-apply`, `sai-archive`, and `sai-merge` parse in their main-session body/coordinator cards and own their banner; `sai-2-design`'s coordinator card owns the parse and banner since the flag-parsing unification (the worker no longer emits a banner notice or keeps `fast_track_banner_emitted` dedup state); for routed-shaped `sai-backfill`, its worker card parses `--fast-track` and the diff-source tokens (`--staged | --unstaged | --diff <sha>`) from `arguments_value` itself (phase-owned parse, no banner — a deliberate documented exception). `/sai-build` is not a seventh opt-in: it strips an explicit `--fast-track` token as a behavioral no-op and unconditionally injects fast-track for the chained apply segment. `/sai-review` is outside this parser membership and strips an explicit `--fast-track` token as a behavioral no-op without activating fast-track or emitting a banner. Each command's opt-out set is fixed:
- `sai-explore` — skips both language gates (artifact review and crystallization), and at a subsequent Plan (unattended) activation skips the overview-language ask with `overview_language` resolving to `None` (an explicit `--overview-lang` still suppresses the ask in every mode; under Direct Build (unattended) it is a documented no-op).
- `sai-2-design` — auto-approves the specs approval gate.
- `sai-4-apply` — pre-activates session commit authorization and defers Human Verification to end-of-run.
- `sai-archive` — auto-proceeds the unchecked-items gate.
- `sai-backfill` — skips generated reconciliation questions (remaining `stated-but-unevidenced` items stay non-normative), auto-proceeds the spec-conflict gate after carrying the conflict report verbatim, and auto-accepts a crystallized-block `**Change name**` without the yes/no confirmation.
- `sai-merge` — auto-applies full resolution scope without the scope gate.

Safe-operations confirmations and all unnamed gates remain in force — including backfill's hard halts and its MANDATORY STOP literal, and fast-track never suppresses an input question (a missing diff-source token still fires the normal ask).

## Installation

Commands are **user globals**, not per-project. The manifest-driven installer expands `sai/install-manifest.json` into deterministic harness projections, and the same projections are used by `doctor` for missing/drift checks and by `uninstall` for safe removal. Claude Code and opencode receive mirrored routed spec, design, and implementation bindings from the shared Orchestration Core. The canonical project-agnostic ADR and DDR index templates are `sai/commands/implement/adr-index.template.md` and `sai/commands/implement/ddr-index.template.md`; the recursive `sai-commands` projection installs command-local instructions and co-located `.template.md` files for both supported harnesses, and it also covers the shared overview-generation instruction at `sai/commands/design/change-overview.md` and both index templates, which are owned by the single command that consumes each.

The `sai-agents-index` root-class projection additionally writes `SAI_AGENTS.md` — the orientation index over the four SAI documentation surfaces — to each harness root, inheriting doctor missing-file detection, drift detection, and uninstall cleanup.

- **Claude Code**: `~/.claude/commands/`
- **opencode**: `~/.config/opencode/commands/`

Supported harnesses: Claude Code and opencode.

Project-local commands override user-global ones by filename in Claude Code (`.claude/commands/`) and opencode (`.opencode/commands/`). OpenSpec skills are always **project-local** (installed by `openspec init`) — never copied to user globals.

## Generated artifacts

```
openspec/changes/{change-name}/
├── proposal.md         # sai-1-spec  (via opsx:propose — specs phase)
├── specs/**/*.md       # sai-1-spec  (via opsx:propose — specs phase)
├── design.md           # sai-2-design (via opsx:continue — gated on specs approval)
├── tasks.md            # sai-2-design (via opsx:continue — gated on specs approval)
├── change-overview.md   # sai-2-design (generated after the feedback loop closes; materialized by a budget-routed subagent — not a new phase; `overview.state` persisted in `.openspec.yaml`)
├── implementation.md   # sai-3-implement (granular plan)
├── review.md           # sai-5-review
├── security.md         # sai-6-security      (required; N/A justification if not applicable)
├── performance.md      # sai-7-performance   (required; N/A justification if not applicable)
├── accessibility.md    # sai-8-accessibility (required; N/A justification if not applicable)
└── pr.md               # sai-pr
```

Once the change is finished, `sai-archive` (wrapping `opsx:archive`) moves the directory to `openspec/changes/archive/YYYY-MM-DD-{change-name}/`.

## Migration from the legacy `plans/` pipeline

Existing projects with `plans/{feature-name}/` artifacts are **not migrated automatically** — that is a deliberate breaking change. Options:
- Keep finishing the in-flight change with older command versions from git history.
- Manually copy/move artifacts into `openspec/changes/{name}/` and rename `plan.md` → `implementation.md`, `spec.md` → `proposal.md`.

## How to modify this repo

### Add / modify an instruction
1. Edit the canonical file in `sai/commands/{name}/`, `sai/policies/`, `sai/compat/`, or `sai/orchestration/` as appropriate. The ADR index template belongs at `sai/commands/implement/adr-index.template.md` (and the DDR index template at `sai/commands/implement/ddr-index.template.md`); `sai/compat/` remains for compatibility-only assets.
2. If it changes a per-phase artifact path, update the corresponding wrapper REPLACEMENT block (`sai-3-implement.md`, `sai-4-apply.md`) and the AGENTS.md artifact table above.
3. If it changes an installable surface, update `sai/install-manifest.json` and keep Claude Code and opencode projections explicit. Their routed bindings must remain mirrored.
4. If the recommended model changes, update the wrappers in `commands/claude/` and `commands/opencode/`.

### Change picker
Twelve `sai-*` commands consume an OpenSpec change name via `$ARGUMENTS`: `sai-2-design`, `sai-3-implement`, `sai-4-apply`, `sai-build`, `sai-review`, `sai-5-review`, `sai-6-security`, `sai-7-performance`, `sai-8-accessibility`, `sai-archive`, `sai-pr`, `sai-status`. Resolution begins with the two-key invocation envelope: `command_name` is card-selection metadata and `arguments_value` is the complete opaque request. A trimmed, non-empty `arguments_value` is authoritative for direct change-name resolution; when it is empty, the existing `$ARGUMENTS` check and 0/1/N picker logic applies. `sai-1-spec` is a conditional consumer only: it fetches `sai/policies/change-picker.md` solely when its trimmed `arguments_value` is empty (a supplied name still selects an existing change to build on; the picker never invents a new change), so it sits outside the twelve-command membership above. `/sai-build` strips any `--fast-track` tokens before applying this standard resolution and retains one resolved name across both segments. `/sai-review` strips any `--fast-track` tokens before applying this standard resolution as a behavioral no-op and retains one resolved name across all segments.

Placement depends on command shape:
- **6 body commands** (`sai-2-design`, `sai-5-review`, `sai-6-security`, `sai-7-performance`, `sai-8-accessibility`, `sai-pr`): fetch it as the first line under `## Load instructions (in order)`, before the first existing fetch.
- **2 commands** (`sai-3-implement`, `sai-4-apply`): fetch it at the very top of the `<TASK>` block, before `## Prerequisite checks` — because their own "Also verify" block dereferences `{change-name}` inside `## Prerequisite checks`, which runs before `## Load instructions`.
- **1 routed-shaped command** (`sai-archive`): the coordinator fetches it after the prerequisite checks and fast-track parse, resolving the change BEFORE dispatching its worker; the resolved name becomes the worker's `arguments_value`.
- **2 composition commands** (`sai-build`, `sai-review`): resolve from their invocation envelopes through the standard change-consuming picker after normalizing `--fast-track`; they are not additional body-file parse members and neither segment re-enters a harness wrapper or re-runs resolution.

When adding a new change-consuming command, check whether it dereferences `{change-name}` inside its own `## Prerequisite checks` before picking a placement.

### Add a new command
1. Create the instruction in `sai/commands/{name}/instructions.md` with a TASK block (or, for openspec-backed commands, write a wrapper that fetches a skill). Isolation comes from the harness boot preamble — do not add an isolation block to the card.
2. Create wrappers in `commands/claude/sai-{name}.md` and `commands/opencode/sai-{name}.md`.
3. Update README.md with the phase in the corresponding table.

### Specs approval gate
`sai-1-spec` stops after generating `proposal.md` and `specs/`, telling the user to review them and run `/sai-2-design` when ready. Invoking `/sai-2-design` IS the approval: it asks nothing and automatically stamps `approval.specs.approved_at` (only when absent or empty) + `approval.specs.notes` (always empty string) into `.openspec.yaml` before generating anything. Bypassing `sai-2-design` (e.g. calling `opsx:continue` directly) skips this check — `opsx:*` commands are internal, document this accordingly.

### Mirror discipline
Any change to `commands/claude/` MUST be mirrored to `commands/opencode/` in the same commit (and vice versa — both stay in sync). Enforce via PR checklist. This is one consequence of the "Harness universality" convention above, which also covers shared instructions, installers, and docs.

### Format conventions
- Never use `any` in TypeScript (even though there is no TS here, it applies to code examples in instructions).
- Generated artifacts are in English unless the user explicitly requests otherwise.
- Fetch URLs point to `@~/.claude/sai/{commands,policies,compat,orchestration}/...` (Claude Code) or `@~/.config/opencode/sai/{commands,policies,compat,orchestration}/...` (opencode).
- Skill fetches use project-local paths (`.claude/skills/...` or `.opencode/skills/...`).
- `TODO-ENHANCEMENTS.md` tracks future enhancement ideas (not part of the pipeline).
