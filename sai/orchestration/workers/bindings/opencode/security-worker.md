# Opencode Security Worker Binding

Start exactly one explicit worker with:

`task(subagent_type: "sai-6-security-worker", prompt: "<original InvocationEnvelope and security-worker instruction>")`

Capture `task_id` in coordinator state and expose it only as binding-owned `continuation_reference`. Continue with `task(task_id: "<captured task ID>", prompt: "<selected value>")` using the exact answer. If same-task continuation fails, start at most one replacement task with the original envelope and complete reconstruction fields. Never package artifacts or the prior journal.

Authorize read-only `explore` for source, diff, and glossary research within the worker's eight-call cap. Authorize bounded read-only execution only for applicable `npm audit`, `pip-audit`, `mvn dependency-check`, `trivy`, and `osv-scanner` commands. Reject generic write-capable delegation, package installation, dependency updates, production edits, dependency-file edits, configuration mutation, and every command outside this audit allowlist.
