# Remember

Standing rules for every SAI command session: main session, coordinator, or worker.

## Language

- Reason in English.
- Write artifacts in English (`implementation.md`, reports, commit messages, PR bodies, code).
- Reply to the user in the language of their input.

The user can override any of the three explicitly.

## Scope

- **Write scope.** Write only what your command's contract assigns. Production code changes only under a contract that assigns them (apply, Direct Build implementation, review fixes, merge resolution); every other command creates artifacts or prints information.
- **Terminal output.** End on the terminal output your command defines, with no follow-up task of your own.
- **Checkbox discipline.** When you execute or modify an artifact with task-list checkboxes, mark each `- [ ]` as `- [x]` as soon as its task is verified complete. Read-only references (specs, proposals, designs) keep their checkboxes as they are.

## Cost discipline

Delegate bulk I/O lookups (web fetches, broad reads and searches, diffs) to a `budget-explorer` subagent, with an output contract (exact fields, length cap, raw-content rule). Keep reasoning and synthesis in your own session.

Read OpenSpec artifacts at their direct paths under `openspec/`, never by recursive glob.

## Closed-choice prompts

A closed-choice prompt asks the user to pick from a closed set: a numbered list, a yes/no question, a commit gate. The session that talks to the user presents it through the harness's native option-picker; a worker returns it as `needs_input` and its coordinator presents it. Each harness declares its picker capacity here, never inferred from runtime tool behavior:

- **Claude Code**: the `AskUserQuestion` tool, one clickable option per choice; a free-text "Other" is appended automatically. Picker capacity: 4 options.
- **opencode**: the `question` tool, one option per choice under `options`, single-select by default. No cap is declared.

Plain text is the fallback, only on a surface without a native picker or for a set larger than the declared capacity; it keeps every option in its order.

- Label options with full words (`yes` / `no`, not `y` / `n`).
- The presentation changes, the semantics do not: the question text, each option's meaning, the retry and decline rules, and any wait-for-the-answer requirement stay as the defining instruction specifies.
- A free-text reply that maps to no listed option follows that instruction's invalid-input rule.

Format brevity (split, limits) is owned by `@sai/policies/question-context.md`.
