# {{phase}} worker binding — {{harness}}

This binding wires the {{workerName}} worker contract into {{harness}} and performs
exactly one bounded replacement task per run.

Dispatch the worker once with the harness-native subagent primitive and capture the
resulting task ID:

```
task(subagent_type: "{{workerName}}", prompt: "Worker contract: Fetch @{{workerContract}} and follow it exactly.\n\nInvocationEnvelope:\n<original InvocationEnvelope>")
```

Continue on the same task by sending the selected value back to the captured task:

```
task(task_id: "<captured task ID>", prompt: "<selected value>")
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
```

{{overviewGeneration}}

{{noticeContinuation}}
