---
name: budget-ro
description: >
  Budget read-only: loads the explorer binding and the language contract, for cards that delegate only read-only research (no executor, no task subagent).
  TRIGGER when: "budget read-only", "budget ro", "read-only budget mode"
license: MIT
compatibility: opencode, claude
metadata:
  author: Mikel Madariaga
  version: "1.0"
---

Load and use the two bindings below; the first names the explorer subagent and its dispatch rules, the second the language contract.
  Fetch @skills/budget-explorer/SKILL.md
  Fetch @skills/token-efficient-languages/SKILL.md
