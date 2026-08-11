---
name: budget-executor
description: >
  Binds "executor subagent" to the OpenCode executor agent keyword. Model resolved via the executor agent file's model frontmatter (installed under ~/.config/opencode/agents/executor.md) — not hardcoded in here. Enforces execute-only, minimal-output, structured-failure-report discipline.
  TRIGGER when: "use executor", "spawn executor", "run command subagent", "delegate execution", "execute in subagent", "run cheap executor"
license: MIT
compatibility: opencode
metadata:
  author: Mikel Madariaga
  version: "1.0"
---

Fetch @sai/policies/executor-agent.md

## OpenCode Binding

- **Agent keyword**: `executor` (lowercase)
- **Model resolution**: controlled by the `model` frontmatter of the executor agent file (`~/.config/opencode/agents/executor.md`) — not hardcoded in this file.
- **Tool-call cap**: none.
- **Raw output**: allowed for results of explicitly requested commands and relevant error or compiler messages. It does not authorize unrequested full-file dumps or unfiltered log streams.
- **Failure reporting**: the fetched policy supplies the structured failure report with exit code, one-line reason, applicable file and line locations, and test/build tallies when relevant.

## Dispatch mode

The opencode `task` tool has no `run_in_background` parameter; this binding runs synchronously by default. The dispatch-safety invariant defined in `openspec/specs/dispatch-safety-invariant/spec.md` is the containing rule for this case.

## Model resolution

The model for `executor` subagents is controlled by the `model` frontmatter of the executor agent file (`~/.config/opencode/agents/executor.md`), seeded by the installer under the `tunable-seed` lifecycle. This file contains no hardcoded model identifier.

## Cost model

This subagent runs on a commodity model. Its tier is controlled by the `model` frontmatter of the executor agent file (`~/.config/opencode/agents/executor.md`) — that setting is the only lever to change the cost of delegation.

**Why delegate:**
- **Cost:** Bulk execution output and command-running work are processed at a cheaper per-token rate than the main agent's model.
- **Context hygiene:** The subagent starts with a clean context — no task instructions or conversation history — and returns bounded execution results, keeping the main agent's reasoning context uncontaminated.

**Execution overhead:**
- Delegation reduces main-agent context pollution when running long-running or resource-intensive operations; the subagent absorbs the requested command output while retaining the policy's execute-only and failure-report boundaries.
