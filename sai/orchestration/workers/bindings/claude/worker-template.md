# {{phase}} worker binding — {{harness}}

This binding wires the {{workerName}} worker contract into {{harness}} and performs
exactly one bounded replacement dispatch per run.

{{panelRenderBinding}}Dispatch the worker once with the harness-native background primitive and capture the
resulting agent ID. The `Agent` dispatch with `run_in_background: true`
returns the agent ID immediately; retain that captured agent ID before any
guard snapshot or continuation. A dispatch cancelled before the agent ID
returns leaves no handle; its retry starts from zero with a deferred
snapshot.

The original InvocationEnvelope slot contains only the opaque `arguments_value`;
binding metadata remains outside the worker request.

```
Agent(
  name: "{{workerName}}",
  run_in_background: true,
  prompt: "Worker contract: Fetch @{{workerContract}} and follow it exactly.\n\nInvocationEnvelope:\n<original InvocationEnvelope>"
)
```

Continue on the same worker by sending the selected value back to the captured agent:

```
SendMessage(to: "<captured agent ID>", message: "<selected value>")
```

Continuation literal: {{continuationLiteral}}

Helper permissions supplied to the worker:

```
{{helperPermissions}}
```

Reconstruction fields restored from the originating binding context:

```
{{replacementFields}}
```

Progress declaration reported by the worker:

```
{{progressDeclaration}}

The coordinator's visual `progress_plan` and routing-only `step_pointer_map`
are separate adapter declarations. When only the map is active, no task list
or milestone stamp is rendered, but progress continuations still carry the
canonical active-step pointer.
```

{{overviewGeneration}}

{{noticeContinuation}}
