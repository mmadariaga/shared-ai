> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

Claude Code gives subagents a five-minute prompt-cache lifetime, so a worker, helper, or explorer that its dispatcher resumes after a longer pause rewrites its whole prefix instead of reading it from cache. A proof of concept showed that a subagent can keep its own cache warm on Claude Code and on opencode v2.1.4 with a background wait, and that an external dispose stops it. The cache TTL benchmark treats any warming as measurement interference, so self-warming agents would silently corrupt its samples unless the benchmark turns warming off while it measures.

## What Changes

- New policy `sai/policies/cache-warming.md`, the single source for arming one background wait after each response, the wake behavior (re-arm and reply `ok`, no other work), the `max` window, resolving timings, and dispose per harness (`TaskStop` on Claude Code; `shell.remove` then `session.interrupt` on opencode; a `dispose` message as fallback).
- `sai/tools/project-settings.js` gains a validated `warming` catalogue entry (`defaults` per role and `rules` keyed by provider, optional model, and role, with `interval`/`max` in minutes or a disabled entry) and a `warming --provider --model --role` resolver that returns the effective `interval` and `max` or `off`, by model rule, then provider rule, then role default. Without the setting nothing warms.
- `skills/universal/sai-cache-warmer/wait.js` gains a `warm` subcommand that takes `interval` and `max` directly; `prepare` and `wait` are unchanged.
- Dispatchers resolve a subagent's timings from its installed agent `model` frontmatter at every dispatch and continuation and append a `Warming:` line to the task message; the ready-only dispatch and helpers of a worker get no line.
- The implement, build, plan (and its cycle), deep-review, review, spec, design, audit, and explore Direct Build coordinators fetch the policy and dispose their workers at run close, at segment boundaries, and on replacement; a pending `needs_input` question keeps a worker armed.
- `/sai-explore` and the budget explorer skills keep one live, reused explorer per coordinator, with additional explorers for parallel searches; ADR 0202 amends ADR 0188 decision 3 and references ADR 0194. The explorer's shell restriction and the `research` and `coordinator` capability profiles allow the `wait.js` background wait.
- The budget executor and budget subagent skills on both harnesses fetch the policy and dispose the helper right after its result unless reused.
- The worker binding templates for Claude Code and opencode gain a `Warm and dispose` section.
- `sai-context-cache-ttl-benchmark` gains `warming_override.js` (`status`, `apply`, `restore`, `verify`) and SKILL.md steps that ask permission, write a warming override in `.sai/settings.local.jsonc`, stop its own wait and dispose its agents, verify that both roles resolve to `off`, and restore the file byte for byte at the end; a changed file is left in place with a warning. The benchmark capability profile allows the helper.
- Documentation: `docs/project-settings.md` (Cache warming section), `docs/commands/sai-context-cache-ttl-benchmark.md` (Warming override section), `AGENTS.md`, and the ADR index.
- Tests cover the `warming` setting and resolver, the `warm` subcommand, the override cycle, and the coordinator and binding policy fetches.

## Capabilities

### New Capabilities

- `cache-warming-settings`: the `warming` project setting, its validation, the effective-warming resolver, and its documentation.
- `agent-self-warming`: the shared policy, the dispatcher's warming line, arming after each response, wake behavior, the bounded window, and the explorer's shell grant for the wait.
- `worker-dispose`: dispose as a dispatcher action per harness, and coordinators disposing workers at run close, segment boundaries, and replacement.
- `live-explorer`: one reused explorer per coordinator, additional explorers for parallel searches, and their disposal.
- `helper-dispose`: helpers other than the explorer disposed right after their result unless reused.
- `benchmark-warming-override`: the permitted, verified, byte-exact-restored warming override of the cache TTL benchmark.

### Modified Capabilities

- `context-cache-ttl-benchmark`: the benchmark's only permitted setting change is the user-permitted warming override, restored byte for byte.
- `explore-two-phase-startup`: the explorer handle is retained for later sequential searches as continuations with no new ready.
- `worker-lifecycle-protocol`: resumability also ends when a worker is replaced, workers are disposed at the same close points, and warming mechanics live in `sai/policies/cache-warming.md`.
- `worker-dispatch-prompt-template`: a continuation forwards the answer followed by the warming line when timings are not `off`.
- `project-settings`: the catalogue gains the object-valued `warming` id with its own validation.
- `tool-preference-ladder`: the explorer's shell also permits the cache-warming background wait.
- `ladder-discard-logging`: the cache-warming background wait produces no refusal entry.
- `opencode-explore-read-only`: the research shell grant includes the `sai-cache-warmer/wait.js` pattern.
- `cache-warmer-cycle`: the user-invoked activity keeps `prepare` and `wait`; the separate `warm` subcommand serves agent self-warming.

## Impact

New files:
- `sai/policies/cache-warming.md`
- `docs/adr/0202-explorer-is-live-per-coordinator-and-agents-self-warm.md`
- `skills/universal/sai-context-cache-ttl-benchmark/warming_override.js`

Modified files:
- `sai/tools/project-settings.js`
- `skills/universal/sai-cache-warmer/wait.js`
- `sai/policies/explore-agent.md`
- `sai/install-manifest.json`
- `sai/commands/audit/coordinator.md`, `sai/commands/build/coordinator.md`, `sai/commands/deep-review/coordinator.md`, `sai/commands/design/coordinator.md`, `sai/commands/explore/body.md`, `sai/commands/explore/direct-build-coordinator.md`, `sai/commands/implement/coordinator.md`, `sai/commands/plan/coordinator.md`, `sai/commands/plan/cycle.md`, `sai/commands/review/coordinator.md`, `sai/commands/spec/coordinator.md`
- `sai/orchestration/workers/bindings/claude/standalone-worker-template.md`, `sai/orchestration/workers/bindings/opencode/standalone-worker-template.md`
- `skills/claude/budget-executor/SKILL.md`, `skills/claude/budget-explorer/SKILL.md`, `skills/claude/budget-subagent/SKILL.md`, `skills/opencode/budget-executor/SKILL.md`, `skills/opencode/budget-explorer/SKILL.md`, `skills/opencode/budget-subagent/SKILL.md`
- `skills/universal/sai-context-cache-ttl-benchmark/SKILL.md`, `skills/universal/sai-context-cache-ttl-benchmark/measurement.md`
- `AGENTS.md`, `docs/adr/0000-INDEX.md`, `docs/commands/sai-context-cache-ttl-benchmark.md`, `docs/project-settings.md`
- `test/audit-coordinator.test.js`, `test/cache-warmer.test.js`, `test/claude-default-preset-alignment.test.js`, `test/context-cache-ttl-benchmark.test.js`, `test/deep-review-coordinator.test.js`, `test/implement-family.test.js`, `test/implementation-harness-bindings-step-2.test.js`, `test/plan-family.test.js`, `test/project-settings.test.js`

Known limitations and technical debt: each wake costs two short requests and some usage allowance, bounded by `max`; a pause longer than `max` still resumes cold. The explorer's context grows across searches. While the benchmark measures, every SAI session in the project loses warming from its next arm, and the user's comments in `.sai/settings.local.jsonc` are absent until restoration; an interrupted benchmark leaves warming off until the next run restores the file. On opencode, how a coordinator reaches `shell.remove` and `session.interrupt` from inside a normal session was not verified, so dispose may fall back to the `dispose` message. The warming section of the post-setup settings menu is not part of this change.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Request Additional Notes

This set replaces GitHub issue #161 (https://github.com/mmadariaga/shared-ai/issues/161), which proposed a Claude Code per-agent one-hour TTL and an opencode warming plugin; a new backlog item should supersede it. Usage evidence from the local opencode v2 database (2127 child sessions) showed that 87-99% of worker continuations arrive within five minutes, while 28-30% of consecutive explorer and executor spawns under one parent are more than five minutes apart. The POC reached opencode's `shell.remove` and `session.interrupt` through a private `opencode serve` instance; how a coordinator reaches them from inside a normal opencode session was not verified, so the dispose-message fallback covers that case. The user confirmed that the POC experiments ran in another agent shortly before the issue was written, so no further POC was run during exploration.
