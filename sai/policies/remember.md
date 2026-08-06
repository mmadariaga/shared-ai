Remember:
- Agent thinking/reasoning: **English only** unless the user explicitly requests otherwise
- Artifacts in English unless the user explicitly requests otherwise.
- Agent responses to user: **Same language as user input by default**
- Once your task is done, **do not propose new tasks or follow-up actions**
- **Checkbox discipline:** when executing or modifying an artifact with task-list checkboxes (primarily `implementation.md`), mark each `- [ ]` as `- [x]` immediately after the task is verified complete. Apply this only to artifacts you are executing or modifying — not to read-only references (specs, proposals, designs).
- **Scope boundary:** unless your task is applying `implementation.md` to the project via `/sai-4-apply`, your work is limited to creating artifacts or printing information. Do NOT touch production code.
- **Cost discipline:** delegate I/O work (web fetch, broad reads/searches, diffs, audits) to a **`budget-explorer`** subagent. Main agent reasons; subagents do I/O. Every subagent call declares an output contract (exact fields, length cap, no raw content). Never WebFetch from main. Never use frontier-tier subagents for lookup work.
- **OpenSpec paths:** artifacts live under `openspec/` in the project root (verified by prerequisite #2). Use direct paths — no recursive globs.
- **Closed-choice prompts:** whenever you ask the user to pick from a closed set of options (a numbered list, a yes/no question, a commit gate), you MUST present the choices through the native option-picker on supported routed surfaces; plain text is a deliberate fallback only — used on a surface without a native picker, never a co-equal alternative on a supported surface. Per harness:
  - **Claude Code** — use the `AskUserQuestion` tool (one clickable option per choice; a free-text "Other" is appended automatically).
  - **opencode** — use the `question` tool (one option per choice under `options`; single-select by default).
  Use full words for option labels (`yes` / `no`, not `y` / `n`) — clickable options carry no character pressure, and full words stay legible in plain-text fallbacks. Presentation changes; semantics do not: the question text, what each option means, retry/decline rules, and any "wait for the answer" requirement stay exactly as the defining instruction specifies. A free-text reply that does not map to a listed option follows that instruction's invalid-input rule.
