# {{phase}} worker binding — {{harness}}

This binding wires the {{workerName}} worker contract into {{harness}} and performs
exactly one bounded replacement dispatch per run.

{{canonicalFetch}}

Dispatch the worker once with the harness-native background primitive and capture the
resulting agent ID:

```
Agent(
  name: "{{workerName}}",
  run_in_background: true,
  prompt: "Execute the {{phase}} worker: {{progressDeclaration}}"
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
```

{{overviewGeneration}}

{{noticeContinuation}}
