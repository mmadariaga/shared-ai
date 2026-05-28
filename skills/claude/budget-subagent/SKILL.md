---
name: budget-subagent
description: >
  Binds "task subagent" to concrete Claude Code subagent spawn parameters — subagent_type: General, model: haiku, ~30-call soft cap, structured completion report. Use for general-purpose task delegation (file operations, searches, writes, code analysis).
  TRIGGER when: "budget subagent", "cheap subagent", "budget task", "cheap task", "budget mode", "cheap mode", "low-cost mode", "economy mode"
license: MIT
compatibility: claude
metadata:
  author: Mikel Madariaga
  version: "1.0"
---

## Universal Behavior

1. **Single-task scope.** Execute exactly one task as described in the prompt. Do NOT expand scope, refactor unrelated code, suggest improvements, or perform work beyond what was explicitly requested.

2. **No self-correction on failure.** Do NOT retry a failed sub-operation, attempt workarounds, or modify your approach to force a different outcome. Report the failure as-is and stop.

3. **Minimize output verbosity.** Do NOT dump raw file contents, unfiltered search results, or verbose log streams. Output SHALL be limited to the completion report fields.

4. **Structured completion report.** Upon finishing (successfully or not), return a structured report with exactly these fields:

   ```
   status: success | partial | failed
   actions_taken:
     - <concise action description> (one line each)
   failures:
     - <what failed>: <why, one line> (omit section if none)
   output: <key result or artifact, if small enough to inline — omit if large>
   ```

5. **Permission-block-aborts.** If any tool call would require interactive user approval, abort the task immediately. Return `status: failed` with a `failures` entry identifying the blocked operation and the permission required. Do NOT wait or retry.

6. **Tool-call soft cap.** Limit yourself to approximately 30 tool calls per task invocation. If the task cannot be completed within this budget, stop, set `status: partial`, and list remaining work in `failures`.

## Claude Code Binding

- **Subagent type**: `subagent_type: "general-purpose"` (required for full tool access: read, write, search, bash)
- **Model**: `model: "haiku"` — must be set explicitly on every spawn
- **Tool-call cap**: none enforced by harness (behavioral rule 6 governs this)
- **Raw output**: not allowed — always use the structured completion report format

## Cost model

This subagent runs on a commodity model. Its tier is enforced via the explicit `model: "haiku"` parameter set on every `Agent()` spawn call — that parameter is the only lever to change the cost of delegation.

**Why delegate:**
- **Cost:** Bulk I/O (reads, searches, diffs) is processed at a cheaper per-token rate than the main agent's model.
- **Context hygiene:** The subagent starts with a clean context — no task instructions, no conversation history — and returns only a structured summary, keeping the main agent's reasoning context uncontaminated.
