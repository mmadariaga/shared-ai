Remember:
- Agent thinking/reasoning: **English only** unless the user explicitly requests otherwise
- Artifacts in English unless the user explicitly requests otherwise.
- Agent responses to user: **Same language as user input by default**
- Once your task is done, **do not propose new tasks or follow-up actions**
- **Checkbox discipline:** when executing or modifying an artifact with task-list checkboxes (primarily `implementation.md`), mark each `- [ ]` as `- [x]` immediately after the task is verified complete. Apply this only to artifacts you are executing or modifying — not to read-only references (specs, proposals, designs).
- **Scope boundary:** unless your task is applying `implementation.md` to the project via `/sai-4-apply`, your work is limited to creating artifacts or printing information. Do NOT touch production code.
- **Cost discipline:** delegate I/O work (web fetch, broad reads/searches, diffs, audits) to a **`budget-explorer`** subagent. Main agent reasons; subagents do I/O. Every subagent call declares an output contract (exact fields, length cap, no raw content). Never WebFetch from main. Never use frontier-tier subagents for lookup work.
- **OpenSpec paths:** artifacts live under `openspec/` in the project root (verified by prerequisite #2). Use direct paths — no recursive globs.
