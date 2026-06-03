---
name: budget-subagent
description: >
  Binds cost-controlled task delegation to the Copilot budget-subagent custom agent — GPT-5 mini, ~30-call soft cap, structured completion report. Use for general-purpose task delegation (file operations, searches, writes, code analysis). Copilot only — NOT compatible with Claude Code or opencode.
  TRIGGER when: "budget subagent", "cheap subagent", "budget task", "cheap task", "budget mode", "cheap mode", "low-cost mode", "economy mode"
license: MIT
compatibility: copilot
metadata:
  author: Mikel Madariaga
  version: "1.0"
---

## Subagent binding

"task subagent" → invoke the `budget-subagent` custom agent. General-purpose delegation (mixed read/write/search tasks) MUST be routed through that agent.

## Model

Fixed at `GPT-5 mini (copilot)` in `budget-subagent.agent.md`. To change the model, edit the agent file.

## When to use budget-subagent vs other agents

| Task type | Route to |
|---|---|
| Read-only research / lookups | `budget-explorer` |
| Command execution / tests / builds | `budget-executor` |
| Mixed read + write + analysis | `budget-subagent` |

## Invocation rules

1. Describe exactly one task per invocation. Do NOT batch unrelated work.
2. Declare the expected completion report fields in the prompt.
3. If the task might require user approval (e.g., deleting files), split it or obtain approval from the user first — do NOT let the subagent prompt for input.
4. Keep the ~30-call soft cap in mind when scoping the task. If it's too large, split into sequential invocations.

## Cost model

**Why delegate:**
- **Cost:** Bulk I/O (reads, searches, diffs, writes) runs at a cheaper per-token rate than the main agent's model.
- **Context hygiene:** The subagent starts with a clean context and returns only a structured completion report, keeping the main agent's reasoning context uncontaminated.
