---
name: budget-executor
description: >
  Binds "executor subagent" to the OpenCode executor agent keyword. Model resolved via the executor agent file's model frontmatter (installed under ~/.config/opencode/agents/executor.md) — not hardcoded in here. Enforces execute-only, minimal-output, structured-failure-report discipline.
  TRIGGER when: "budget executor", "cheap executor", "budget mode", "cheap mode", "low-cost mode", "low cost mode", "economy mode"
license: MIT
compatibility: opencode
metadata:
  author: Mikel Madariaga
  version: "1.0"
---

Fetch @sai/policies/executor-agent.md

## OpenCode Binding

- **Agent keyword**: `executor` (lowercase)
- **Tool-call cap**: none.

## Spawn prompt

Give the executor the exact command(s) to run, in order, and the output you need back. A goal without a command also works: the executor then picks the narrowest command that meets it. Either way it runs and reports; diagnosis and fixes stay with you.

## Dispatch mode

The opencode `task` tool has no `run_in_background` parameter; this binding runs synchronously by default. The dispatch-safety invariant defined in `openspec/specs/dispatch-safety-invariant/spec.md` is the containing rule for this case.

## Model resolution

The model for `executor` subagents is controlled by the `model` frontmatter of the executor agent file (`~/.config/opencode/agents/executor.md`), seeded by the installer under the `tunable-seed` lifecycle. This file contains no hardcoded model identifier.

## Cost model

This subagent runs on a commodity model; the `model` frontmatter named under Model resolution is the only lever on the cost of delegation.

- **Cost:** command running and bulk command output are processed at a cheaper per-token rate than the caller's model.
- **Context hygiene:** the subagent starts with a clean context and returns only its per-command report, so long-running or verbose commands keep their output out of the caller's context.
