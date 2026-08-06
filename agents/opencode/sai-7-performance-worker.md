---
description: Owns the complete technical performance phase and returns structured lifecycle metadata. This is the managed agent identity.
mode: subagent
model: opencode-go/glm-5.2
variant: high
permission:
  task:
    "*": deny
    budget: allow
    explore: allow
---

Fetch @sai/orchestration/workers/sai-7-performance-worker.md and follow it exactly.
