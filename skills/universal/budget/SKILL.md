---
name: budget
description: >
  Loads the three budget subagent bindings (explorer + executor + subagent) together, for cards that delegate cheap work and for a session-wide cost-discipline mode.
  TRIGGER when: "budget mode", "cheap mode", "low-cost mode", "economy mode"
license: MIT
compatibility: opencode, claude
metadata:
  author: Mikel Madariaga
  version: "1.0"
---

Load and use the three budget bindings below; each names its subagent and the dispatch rules for it.
  Fetch @skills/budget-explorer/SKILL.md
  Fetch @skills/budget-executor/SKILL.md
  Fetch @skills/budget-subagent/SKILL.md
