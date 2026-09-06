<TASK>

Fetch @sai/policies/verified-precondition-handback.md

## Prerequisite checks
Fetch @sai/policies/prereqs.md

## Load instructions (in order)
Fetch @sai/policies/status-picker.md and follow it exactly.
Fetch @sai/policies/remember.md

## Run the status tool

`sai-status` is a read-only progress panel engine. It is run entirely in the main session: at most one `openspec list` call (bulk mode) or one `openspec status` CLI call per change (panel mode), plus local file reads. It creates, modifies, or deletes NOTHING under `openspec/`, `.openspec.yaml`, or elsewhere.

The user's request comes from boot-provided `arguments_value` or status-picker resolution when empty.

### Panel mode: resolve the change name

After the change name is resolved (from `arguments_value` or by `status-picker.md`), invoke the status tool:

```
node <tool-path> panel <change-name> --json --cwd <project-root>
```

Resolve the tool path exactly as specified in `@sai/policies/status-picker.md` § "The change-picker tool" (substitute `sai/tools/status.js` for the path; the resolution rules are identical).

If the tool exits 0 with a JSON payload:
- If the payload contains `archived: true`, print the `panel` text from the payload and stop.
- Otherwise, print the `panel` text from the payload.

If the tool exits 1, it refused (the change does not exist); report the refusal and stop.

If the tool exits 2, report the stderr as a usage or CLI error and stop.

### Bulk mode: render all changes

When `status-picker.md` emits the `> BULK-MODE ACTIVE` signal line, invoke:

```
node <tool-path> bulk --json --cwd <project-root>
```

Print the `table` text from the JSON payload.

</TASK>

Follow the task instructions exactly as written above.
