<TASK>

Fetch @sai/policies/verified-precondition-handback.md

## Prerequisite checks
Fetch @sai/policies/prereqs.md

## Load instructions (in order)
Fetch @sai/policies/status-picker.md and follow it exactly.
Fetch @sai/policies/remember.md

## Run the status tool

`sai-status` is a read-only panel: it runs in the main session, creates or
changes nothing, and delegates all rendering to `status.js`. Resolve its path
per `@sai/policies/tool-resolution.md` § `sai/tools/*.js` copies, substituting
`status.js`.

- **Panel mode** — once the change name is resolved (from `arguments_value` or
  by the status picker), run
  `node <tool-path> panel <change-name> --json --cwd <project-root>` and print
  the payload's `panel` text; an archived change prints the same way.
- **Bulk mode** — when the status picker emits `> BULK-MODE ACTIVE`, run
  `node <tool-path> bulk --json --cwd <project-root>` and print the payload's
  `table` text.

Exit 1 means the tool refused (the change does not exist): report the refusal
and stop. Exit 2 is a usage or CLI error: report its stderr and stop.

</TASK>

Follow the task instructions exactly as written above.
