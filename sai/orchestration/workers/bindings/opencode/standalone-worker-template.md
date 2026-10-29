# {{phase}} worker binding — {{harness}}

{{harness}} calls for creating and continuing {{workerName}}. The coordinator
that fetches this binding owns the worker's lifecycle: when to create it, when
to replace it, and what each message carries.

## Create

Create the worker with the ready prompt alone. The returned task ID is its
handle for the whole run. A replacement worker is created with the same call.

```
task(subagent_type: "{{workerName}}", prompt: "Worker contract: Fetch @{{workerContract}} and follow it exactly.\n\nReturn event: ready now; await task disclosure in the same-worker continuation.\n\nReturn exactly:\n```yaml\nevent: ready\nchanged_files: []\n```")
```

## Continue

Send every later message (each step's brief, a fix round, or a corrected
instruction) to the captured handle:

```
task(task_id: "<captured task ID>", prompt: "<message>")
```

## Warm and dispose

Fetch @sai/policies/cache-warming.md

The worker may keep its prompt cache warm between messages. Resolve its
timings and add the warming line to every task message and continuation, as the
policy says. Every real message from the worker declares `warming: true|false`, beside the report path when it returns only a path (`cache-warming.md` § Warming declaration); the coordinator keeps the latest value for the handle.
The coordinator disposes the worker at run close, at a segment
boundary, and when it replaces the worker, and not while a `needs_input`
question is pending, and only when the worker's latest message declared
`warming: true`; with any other value it disposes nothing. It removes the outstanding shell of the worker's session
and then interrupts that session, both through the session API with the
captured task ID, and falls back to the `dispose` message when the API is not
reachable.
