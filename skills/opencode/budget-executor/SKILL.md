---
name: budget-executor
description: >
  Binds "executor subagent" to the OpenCode budget-executor agent keyword. Model resolved via the budget-executor agent file's model frontmatter (installed under ~/.config/opencode/agents/budget-executor.md) — not hardcoded in here. Enforces execute-only, minimal-output, structured-failure-report discipline.
  TRIGGER when: "budget executor", "cheap executor", "budget mode", "cheap mode", "low-cost mode", "low cost mode", "economy mode"
license: MIT
compatibility: opencode
metadata:
  author: Mikel Madariaga
  version: "1.0"
---

Fetch @sai/policies/executor-agent.md

## OpenCode Binding

- **Agent keyword**: `budget-executor` (lowercase)
- **Tool-call cap**: none.

## Spawn prompt

Give the executor the exact command(s) to run, in order, and the output you need back. A goal without a command also works: the executor then picks the narrowest command that meets it. Either way it runs and reports; diagnosis and fixes stay with you.

A report without a final result for a requested command (`pending`, `running`, or no entry) is an obstacle under `sai/policies/obstacle-escalation.md`: read the result from the evidence the report names, such as its output log, or dispatch again, and do not wait for a later message from that executor.

## Dispatch mode

The opencode `task` tool has no `run_in_background` parameter; this binding runs synchronously by default. The dispatch-safety invariant is the containing rule for this case: a background child is dispatched only from a dispatcher that outlives it and awaits its result, and synchronous dispatch satisfies this.

## Model resolution

The model for `budget-executor` subagents is controlled by the `model` frontmatter of the budget-executor agent file (`~/.config/opencode/agents/budget-executor.md`), seeded by the installer under the `tunable-seed` lifecycle. This file contains no hardcoded model identifier.

## Warming and dispose

Fetch @sai/policies/cache-warming.md

The executor never arms: its report declares `warming: false`, so it is never sent a warming line or a `warm-up`, and there is nothing to dispose.

## Cost model

This subagent runs on a commodity model; the `model` frontmatter named under Model resolution is the only lever on the cost of delegation.

- **Cost:** command running and bulk command output are processed at a cheaper per-token rate than the caller's model.
- **Context hygiene:** the subagent starts with a clean context and returns only its per-command report, so long-running or verbose commands keep their output out of the caller's context.
