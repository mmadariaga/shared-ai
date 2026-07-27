# SAI Learnings — shared-ai

Durable execution-observed facts about the shared-ai prompt and installer repository.

## Stack

- **bin/install-flow.js**: Existing legacy opencode configurations are augmented with missing managed agents instead of being returned unchanged.
  *Observed:* introduce-design-coordinator-worker — a legacy three-agent placeholder skipped the design entries; removing the early return and adding migration coverage made the merge pass.

## Conventions

## Avoid

## Test Command
