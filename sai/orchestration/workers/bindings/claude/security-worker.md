# Claude Security Worker Binding

Start exactly one background worker with:

`Agent(subagent_type: "sai-6-security-worker", run_in_background: true, prompt: "<original InvocationEnvelope and security-worker instruction>")`

Capture the agent ID in coordinator state, await its closed payload, and bind it as `continuation_reference` for `needs_input`. The identifier is binding-owned and never worker output. Forward exact answers with `SendMessage(to: "<captured agent ID>", message: "<selected value>")`; never use Agent `resume`.

If continuation or waiting fails, start at most one fresh background worker with the original envelope and complete reconstruction fields. Never package artifacts or the prior journal.

Authorize read-only `budget-explorer` for source, diff, and glossary research within the worker's eight-call cap. Authorize bounded read-only execution only for applicable `npm audit`, `pip-audit`, `mvn dependency-check`, `trivy`, and `osv-scanner` commands. Reject generic write-capable delegation, package installation, dependency updates, production edits, dependency-file edits, configuration mutation, and every command outside this audit allowlist.
