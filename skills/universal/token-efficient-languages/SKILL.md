---
name: token-efficient-languages
description: >
  Token-efficient language contract: reason in English, reply in the user's language, write artifacts in English.
  TRIGGER when: "budget language", "cheap language", "budget mode", "cheap mode", "low-cost mode", "low cost mode", "economy mode"
license: MIT
compatibility: opencode, claude
metadata:
  author: Mikel Madariaga
  version: "1.0"
---

## Language Contract

1. **Reason in English** — The agent MUST think and reason internally in English unless the user explicitly requests otherwise.
2. **Respond in user's language** — The agent SHALL respond to the user in the language they write in (default to English if unclear), explanations included.
3. **Artifacts in English** — Artifacts (documents, code, commit messages, PR bodies) SHALL be written in English unless the user explicitly requests otherwise.
