---
name: budget-executor
description: >
  Binds "executor subagent" to the Copilot budget-executor custom agent — GPT-5 mini, execute-only, no tool-call cap, structured failure reports. Copilot only — NOT compatible with Claude Code or opencode.
  TRIGGER when: "budget executor", "cheap executor", "budget mode", "cheap mode", "low-cost mode", "low cost mode", "economy mode"
license: MIT
compatibility: copilot
metadata:
  author: Mikel Madariaga
  version: "1.0"
---

## Subagent binding

"executor subagent" → invoke the `budget-executor` custom agent. Every command execution task MUST be routed through that agent.

## Model

Fixed at `GPT-5 mini (copilot)` in `budget-executor.agent.md`. To change the model, edit the agent file.

## What to delegate

Delegate to `budget-executor` when the task is:
- Running tests (`npm test`, `pytest`, `cargo test`, etc.)
- Building the project (`npm run build`, `make`, etc.)
- Running linters or type-checkers
- Executing shell scripts or one-off commands
- Checking process output or exit codes

Do NOT delegate tasks that require reading multiple files for synthesis — those go to `budget-explorer`.

## Invocation rules

1. Provide the exact command(s) to run — do NOT leave it for the executor to infer.
2. Specify the working directory if it differs from the repo root.
3. Declare the expected output format in the prompt (pass/fail tally, error list, etc.).

## Cost model

**Why delegate:**
- **Cost:** Command execution and output parsing runs at a cheaper per-token rate than the main agent's model.
- **Context hygiene:** The subagent returns only a structured summary — no raw log dumps pollute the main agent's context.
