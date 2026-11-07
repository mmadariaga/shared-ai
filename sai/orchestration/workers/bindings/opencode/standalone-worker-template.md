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
Fetch `@sai/policies/worker-lifecycle.md`

The worker keeps its prompt cache warm between messages when it receives the
warming switch. End every task message and continuation to it with the switch,
as the policy says: the coordinator sends it because it disposes the worker.
Every real message from the worker carries the diagnostic line `warming: true|false`, beside the report path when it returns only a path (`cache-warming.md` § Warming diagnostic).
The coordinator disposes the worker whatever the warming setting, at the
points and with the stop call that `@sai/policies/worker-lifecycle.md` defines:
at its last use, when it replaces the worker, on abandon or stop, and at run
close. The `warming` diagnostic gates no dispose, and a worker with a pending
`needs_input` question stays alive until the answer arrives.
