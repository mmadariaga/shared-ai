---
name: budget-explorer
description: >
  Binds cheap research subagent to the opencode explore agent keyword. Model resolved via the explore agent file's model frontmatter (installed under ~/.config/opencode/agents/explore.md) — not hardcoded in here.
  TRIGGER when: "use explorer", "use cheap subagent", "delegate research", "run cheap subagent", "spawn explore subagent", "cheap research agent", "use explore agent", "delegate lookup"
license: MIT
compatibility: opencode
metadata:
  author: Mikel Madariaga
  version: "1.0"
---

Fetch @sai/policies/explore-agent.md

## Subagent binding

"cheap research subagent" → `explore` (lowercase) when invoked as an OpenCode agent keyword.

Callers must declare an output contract in every spawn prompt with exact response fields, a hard word-or-line length cap, and an explicit no raw file contents rule; the fetched `explore-agent.md` policy supplies the effective output-contract behavior.

## Prompt-authoring discipline

Every caller spawn prompt MUST state the **goal** and the **output contract** — exact fields, length cap, raw-content rule. A spawn prompt MUST NOT prescribe a specific research tool, a procedure, a numbered sequence of steps, or a method. The tool-preference ladder (in `@sai/policies/explore-agent.md`) is the governing preference order and is never overridden by a caller prompt.

## Dispatch mode

The opencode `task` tool has no `run_in_background` parameter; this binding runs synchronously by default. The dispatch-safety invariant defined in `openspec/specs/dispatch-safety-invariant/spec.md` is the containing rule for this case.

## Model resolution

The model for `explore` subagents is controlled by the `model` frontmatter of the explore agent file (`~/.config/opencode/agents/explore.md`), seeded by the installer under the `tunable-seed` lifecycle. This file contains no hardcoded model identifier.

## Cost model

This subagent runs on a commodity model. Its tier is controlled by the `model` frontmatter of the explore agent file (`~/.config/opencode/agents/explore.md`) — that setting is the only lever to change the cost of delegation.

**Why delegate:**
- **Cost:** Bulk I/O (reads, searches, and documentation lookup) is processed at a cheaper per-token rate than the main agent's model.
- **Context hygiene:** The subagent starts with a clean context — no task instructions or conversation history — and returns only a structured summary, keeping the main agent's reasoning context uncontaminated.

**When to use:**
- Use `explore` for read-only lookups, searches, and documentation reads that fit the caller-declared output contract. Reserve synthesis and judgment for the main agent.

## Tool-call caps

Per-spawn cap for `explore` subagents: ≤40 tool calls. If a task exceeds the cap, spawn an additional subagent rather than raising the cap.

## Two-Phase Startup handshake (sai-explore only)

Pre-crystallization explore → explore runs in two phases with no `run_in_background` change; this binding stays synchronous and the dispatch-safety invariant remains the containing rule. The initial `task` dispatch is ready-only under strict-zero: base instructions only, with no goal, output contract, change/topic, or provenance. The explorer returns exactly `event: ready` with empty `changed_files` before any expensive work. The goal plus output contract travels only in the post-ready same-task continuation via `task(task_id: "<captured task ID>", prompt: "<goal + output contract>")`. Each parallel explorer performs its own independent ready with no shared batch ready. Retain the task ID for continuation only with no guard snapshot. Ready and task retry separately with identical prompts under the shared bounded retry budget (at most two retries per operation); a missing ready relaunches fresh with the original minimal envelope and no resume-before-ready. The ladder, output contract, and 40-call ceiling hold across both phases; the ready prompt never names a tool. Supervised crystallization-close spec/design dispatches keep their routed two-phase with no double wrap. Explore declares no progress plan. Full semantics live in the fetched explore-agent policy.
