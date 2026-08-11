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
- **Model resolution**: controlled by the `model` frontmatter of the budget agent file (`~/.config/opencode/agents/budget.md`) — not hardcoded in this file.
- **Tool-call cap**: none enforced by the harness; the fetched policy's approximately 30-call behavioral limit governs the task.
- **Raw output**: not allowed — the fetched policy owns the bounded completion-report output contract.

## Dispatch mode

The opencode `task` tool has no `run_in_background` parameter; this binding runs synchronously by default. The dispatch-safety invariant defined in `openspec/specs/dispatch-safety-invariant/spec.md` is the containing rule for this case.

## Cost model

This subagent runs on a commodity model. Its tier is controlled by the `model` frontmatter of the budget agent file (`~/.config/opencode/agents/budget.md`) — that setting is the only lever to change the cost of delegation.

**Why delegate:**
- **Cost:** Bulk I/O (reads, searches, writes, and code analysis) is processed at a cheaper per-token rate than the main agent's model.
- **Context hygiene:** The subagent starts with a clean context — no task instructions or conversation history — and returns only a structured summary, keeping the main agent's reasoning context uncontaminated.

**Scope boundaries:**
- Clear task boundaries enable effective subagent delegation and cost control: one task per spawn, a declared output contract, and the behavioral cap keep the delegation cheap and the report parseable.
- The fetched `budget-agent.md` policy remains the source for the structured completion report, permission-block abort, no-self-correction, and approximately 30-call behavior.
