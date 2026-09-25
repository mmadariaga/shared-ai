---
name: budget-subagent
description: >
  Binds cost-controlled task delegation to the OpenCode `budget` agent keyword. Model resolved via the budget agent file's model frontmatter (installed under ~/.config/opencode/agents/budget.md) — not hardcoded in here. Use for general-purpose task delegation (file operations, searches, writes, code analysis).
  TRIGGER when: "budget subagent", "cheap subagent", "budget task", "cheap task", "budget mode", "cheap mode", "low-cost mode", "economy mode"
license: MIT
compatibility: opencode
metadata:
  author: Mikel Madariaga
  version: "1.0"
---

Fetch @sai/policies/budget-agent.md

## OpenCode Binding

- **Agent keyword**: `budget` (lowercase)
- **Model resolution**: controlled by the `model` frontmatter of the budget agent file (`~/.config/opencode/agents/budget.md`), seeded by the installer under the `tunable-seed` lifecycle; this file hardcodes no model.
- **Tool-call cap**: none enforced by the harness; the fetched policy's approximately 30-call behavioral limit governs the task.

## Spawn prompt

Give one task per spawn: what to do, the files or area it covers, and, when you need a specific result, the exact shape to return. Without a shape the subagent returns its structured completion report. Split independent tasks into separate spawns.

## Dispatch mode

The opencode `task` tool has no `run_in_background` parameter; this binding runs synchronously by default. The dispatch-safety invariant defined in `openspec/specs/dispatch-safety-invariant/spec.md` is the containing rule for this case.

## Cost model

This subagent runs on a commodity model; the `model` frontmatter named in the binding is the only lever on the cost of delegation.

- **Cost:** bulk I/O (reads, searches, writes, and code analysis) is processed at a cheaper per-token rate than the caller's model.
- **Context hygiene:** the subagent starts with a clean context and returns only its report, so scoped work stays out of the caller's context.
- **Scope boundaries:** one task per spawn keeps the delegation cheap and the report parseable. The fetched `budget-agent.md` policy owns the result shape, the permission-block abort, no self-correction, and the approximately 30-call behavior.
