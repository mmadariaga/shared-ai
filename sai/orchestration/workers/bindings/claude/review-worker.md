# Claude Review Worker Binding

Start exactly one background worker with:

`Agent(subagent_type: "sai-5-review-worker", run_in_background: true, prompt: "<original InvocationEnvelope and review-worker instruction>")`

Capture the agent ID in coordinator state, await its closed payload, and bind it as `continuation_reference` for `needs_input`. The identifier is binding-owned and never worker output. Forward exact answers with `SendMessage(to: "<captured agent ID>", message: "<selected value>")`; never use Agent `resume`.

If continuation or waiting fails, start at most one fresh background worker with the original envelope and complete reconstruction fields. Never package artifacts or the prior journal.

Authorize exactly two nested branches: read-only `budget-explorer` for source, diff, and glossary research in passes 1-10; and write-capable `budget-subagent` only for Pass 11 mechanical mutation I/O. Mutation batches contain at most 5-6 assigned mutations, run sequentially, and return each mutation exactly once with an outcome from `killed`, `survived`, `pre-check-failed`, or `revert-failed`. Never normalize the Pass 11 branch to read-only exploration.
