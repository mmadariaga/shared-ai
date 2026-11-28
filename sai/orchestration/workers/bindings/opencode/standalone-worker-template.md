# {{phase}} worker binding — {{harness}}

{{harness}} calls for creating and continuing {{workerName}}. The coordinator
that fetches this binding owns the worker's lifecycle: when to create it, when
to replace it, and what each message carries.

## Create

Before every creation of the worker, a replacement included, run the route
query of `@sai/policies/claude-dispatch.md` § Route, with the dispatch path that
policy resolves, and take the branch it answers:

- `opencode`: Create the worker with the ready prompt alone, through the call
  below. It runs in the background, and the `sessionID` the call returns is its
  handle for the whole run. A replacement worker is created with the same call.
- `claude`: create it as that policy's § Create says, and keep the `sessionID`
  it returns as the handle. A ready turn that is `failed` falls back to the call
  below, with the one notice that policy prints.

```
subagent(agent: "{{workerName}}", description: "{{phase}} worker", prompt: "Worker contract: Fetch `@{{workerContract}}` and follow it exactly.\n\nReturn event: ready now; await task disclosure in the same-worker continuation.\n\nReturn exactly:\n```yaml\nevent: ready\nchanged_files: []\n```", background: true)
```

The worker's completion notification reaches the coordinator's conversation
when it finishes; the coordinator matches it to the worker by `sessionID`. A
worker whose last status is `running` is mid-turn, and the coordinator sends it
no message, with one exception: a `running` notification whose background-work
list holds only `wait.js warm` commands (every entry is the worker's own
cache-warm wait) marks an idle worker. The coordinator processes that worker's
message (a report reference, or a reply without one under
`@sai/policies/worker-report-transport.md` § Undelivered reports) and may
continue it. A `running` worker with any other background work keeps the rule:
wait for its completion.

## Continue

Send every later message (each step's brief, a fix round, or a corrected
instruction) to the captured handle, with the same `agent` the worker was
created with (a continuation without `agent` is invalid), only after the
worker's completion notification has arrived, or its `running` notification
shows only its own `wait.js warm`:

```
subagent(agent: "{{workerName}}", description: "{{phase}} worker", sessionID: "<captured sessionID>", prompt: "<message>", background: true)
```

A worker created on the `claude` route is continued as
`@sai/policies/claude-dispatch.md` § Continue says, never with that call, and
its completion notification is the end of the dispatch shell's task.

When the harness refuses a continuation of a worker that still reports
`running`, the refusal is one attempt of the step's obstacle under
`@sai/policies/obstacle-escalation.md`: stop the worker's shells with
`dispose-shells.js`, per `@sai/policies/worker-lifecycle.md` § Stop call (which
also ends its cache warming), and send the continuation again. A further
failure follows that policy's replacement and escalation.

## Warm and dispose

Fetch `@sai/policies/cache-warming.md`
Fetch `@sai/policies/worker-lifecycle.md`

A worker created on the `opencode` route keeps its prompt cache warm between
messages when it receives the warming switch. End every task message and continuation to it with the switch,
as the policy says: the coordinator sends it because it disposes the worker.
Every real message from the worker carries
the diagnostic line `warming: true|false`, beside the report path when it
returns only a path (`cache-warming.md` § Warming diagnostic). A worker created
on the `claude` route receives no switch and declares `warming: false`.
The coordinator disposes the worker whatever the warming setting, at the
points and with the stop call that `@sai/policies/worker-lifecycle.md` defines:
at its last use, when it replaces the worker, on abandon or stop, and at run
close. The `warming` diagnostic gates no dispose, and a worker with a pending
`needs_input` question stays alive until the answer arrives.
