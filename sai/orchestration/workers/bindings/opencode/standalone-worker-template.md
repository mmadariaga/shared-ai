# {{phase}} worker binding — {{harness}}

{{harness}} calls for creating and continuing {{workerName}}. The coordinator
that fetches this binding owns the worker's lifecycle: when to create it, when
to replace it, and what each message carries.

## Create

Create the worker with the ready prompt alone. It runs in the background, and
the `sessionID` the call returns is its handle for the whole run. A replacement
worker is created with the same call.

```
subagent(agent: "{{workerName}}", description: "{{phase}} worker", prompt: "Worker contract: Fetch `@{{workerContract}}` and follow it exactly.\n\nReturn event: ready now; await task disclosure in the same-worker continuation.\n\nReturn exactly:\n```yaml\nevent: ready\nchanged_files: []\n```", background: true)
```

The worker's completion notification reaches the coordinator's conversation
when it finishes; the coordinator matches it to the worker by `sessionID` and
sends no message to a worker whose last status is `running`.

## Continue

Send every later message (each step's brief, a fix round, or a corrected
instruction) to the captured handle, with the same `agent` the worker was
created with (a continuation without `agent` is invalid), only after the
worker's completion notification has arrived:

```
subagent(agent: "{{workerName}}", description: "{{phase}} worker", sessionID: "<captured sessionID>", prompt: "<message>", background: true)
```

## Warm and dispose

Fetch `@sai/policies/cache-warming.md`

The worker may keep its prompt cache warm between messages. Resolve its
timings and add the warming line to every task message and continuation, as the
policy says. Every real message from the worker declares `warming: true|false`, beside the report path when it returns only a path (`cache-warming.md` § Warming declaration); the coordinator keeps the latest value for the handle.
The coordinator disposes the worker at run close, at a segment
boundary, and when it replaces the worker, and not while a `needs_input`
question is pending, and only when the worker's latest message declared
`warming: true`; with any other value it disposes nothing. It removes the outstanding shell of the worker's session
and then interrupts that session through the session API
(`api/session/:sessionID/interrupt`), both with the captured `sessionID`, and
falls back to the `dispose` message when the API is not reachable.
