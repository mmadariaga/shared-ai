---
name: budget-explorer
description: >
  Binds "cheap research subagent" to the Copilot budget-explorer custom agent — read-only, GPT-5 mini, tool-call caps, output contracts. Copilot only — NOT compatible with Claude Code or opencode.
  TRIGGER when: "budget explorer", "cheap explorer", "budget mode", "cheap mode", "low-cost mode", "low cost mode", "economy mode"
license: MIT
compatibility: copilot
metadata:
  author: Mikel Madariaga
  version: "1.0"
---

## Subagent binding

"cheap research subagent" → invoke the `budget-explorer` custom agent. Every delegation MUST be routed through that agent.

## Model

Fixed at `GPT-5 mini (copilot)` in `budget-explorer.agent.md`. To change the model, edit the agent file.

## Task classification

Three classes govern delegation and cap rules:

- **`lookup`** — find a known fact (version, file path, symbol). Delegate to `budget-explorer`. ≤10 tool calls.
- **`synthesis`** — design decisions, trade-off reasoning, architecture proposals. Reserved for the main agent. Do NOT delegate.
- **`audit`** — drift detection, doc-vs-code divergence, dead-link scans. Delegate to `budget-explorer`. ≤30 tool calls. Verbatim excerpts (`file:line` + literal strings) required for every divergence.

If a task mixes modes, run audit phase first then synthesis under strict rules.

## Tool-call caps

Per-spawn caps for `budget-explorer` invocations:

- **Lookup spawn**: ≤10 tool calls
- **Audit spawn**: ≤30 tool calls

If a task exceeds the cap, spawn an additional subagent rather than raising the cap. Declare the bound explicitly in every spawn prompt.

## Output contract

Every `budget-explorer` invocation MUST declare in its prompt:
- Exact fields expected in the response
- A hard length cap (word or line count)
- Explicit "no raw file contents" (or "verbatim excerpts required" for audit mode)

## Cost model

**Why delegate:**
- **Cost:** Bulk I/O (reads, searches, diffs) is processed at a cheaper per-token rate than the main agent's model.
- **Context hygiene:** The subagent starts with a clean context and returns only a structured summary, keeping the main agent's reasoning context uncontaminated.

The main agent NEVER calls web fetch or performs bulk file reads directly — all such I/O goes through `budget-explorer`.
