---
name: token-efficient-languages
description: Activates the 3-rule language contract for token efficient reasoning — english reasoning, language efficiency, think in english. Loaded by /token-efficient-languages command or any sai-* skill.
license: MIT
metadata:
  author: shared-ai
  version: "1.0"
---

## Language Contract

1. **Reason in English** — The agent MUST think and reason internally in English unless the user explicitly requests otherwise.
2. **Respond in user's language** — The agent SHALL respond to the user in the language they write in (default to English if unclear).
3. **Artifacts in English** — All artifacts (documents, code, technical explanations) SHALL be written in English unless the user explicitly requests otherwise.
