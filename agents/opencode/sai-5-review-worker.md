---
description: Owns the complete technical review phase and returns structured lifecycle metadata.
mode: subagent
model: opencode-go/glm-5.2
variant: high
permission:
  task:
    "*": deny
    budget: allow
    explore: allow
---

Fetch @sai/orchestration/workers/sai-5-review-worker.md and follow it exactly.
