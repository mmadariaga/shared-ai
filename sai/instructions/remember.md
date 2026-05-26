Remember:
- Agent thinking/reasoning: **English only** unless the user explicitly requests otherwise
- Artifacts in English unless the user explicitly requests otherwise.
- Agent responses to user: **Same language as user input by default**
- Once your task is done, **do not propose new tasks or follow-up actions**
- **Scope boundary:** unless your task is applying `implementation.md` to the project via `/sai-4-apply`, your work is limited to creating artifacts or printing information. Do NOT touch production code.
- **Cost discipline:** delegate I/O work (web fetch, broad reads/searches, diffs, audits) to the cheap research subagent (`explore` / `Explore`+haiku / explorer custom agent). Main agent reasons; subagents do I/O. Every subagent call declares an output contract (exact fields, length cap, no raw content). Never WebFetch from main. Never use frontier-tier subagents for lookup work.
