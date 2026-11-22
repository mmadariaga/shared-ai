# {{phase}} worker binding — {{harness}}

{{harness}} calls for creating and continuing {{workerName}}. The coordinator
that fetches this binding owns the worker's lifecycle: when to create it, when
to replace it, and what each message carries.

## Create

Fetch `@sai/policies/opencode-dispatch.md`

Before every creation of the worker, a replacement included, run the route query of that policy (§ Route). The query reads the agent file, so never decide the route yourself. When it answers `opencode`, create, continue, and dispose the worker as that policy says, with the same ready prompt and the same messages, instead of the `Agent` and `SendMessage` calls below; when it answers `claude`, use those calls.

Create the worker with the ready prompt alone. The returned agent ID is its
handle for the whole run. A replacement worker is created with the same call.

```
Agent(
  subagent_type: "{{workerName}}",
  name: "{{workerName}}",
  run_in_background: true,
  prompt: "Worker contract: Fetch `@{{workerContract}}` and follow it exactly.\n\nReturn event: ready now; await task disclosure in the same-worker continuation.\n\nReturn exactly:\n```yaml\nevent: ready\nchanged_files: []\n```"
)
```

## Continue

Send every later message (each step's brief, a fix round, or a corrected
instruction) to the captured handle, only after the worker's completion
notification has arrived: the `task-notification` with `status: completed` for
the turn that returned the message you answer, matched to the worker by its task
ID, whatever its summary:

```
SendMessage(to: "<captured agent ID>", message: "<message>")
```

A handback (the `ready` reply or a report reference) reaches the coordinator
before the worker's turn has ended, so the handback alone never marks the turn
as ended. A `completed` notification whose summary says the worker is waiting on
its own background work (its armed cache-warm wait) ends the turn: send the
message without waiting for that work. A `completed` notification that says the
worker has not reported yet is not a result: send nothing and keep waiting for
the handback under the recovery rules that already apply. A stop call at a
dispose point is not a continuation and never waits for a notification.

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
