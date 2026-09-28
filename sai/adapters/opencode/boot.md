# Opencode boot adapter

This invocation starts clean: disregard prior conversational context except where a fetched contract explicitly directs otherwise.

1. Fetch @sai/orchestration/command-runner.md and follow it first.
2. Read `command_name` and `arguments_value` from the wrapper's InvocationEnvelope.
3. Select the card from `command_name`:
   - Routed names (`spec`, `design`, `implement`, `review`, `security`, `performance`, `accessibility`, `apply`, `meta-build`, `meta-review`, `commit`, `archive`, `backfill`, `merge`) select the coordinator card, e.g. `@sai/commands/apply/coordinator.md`, `@sai/commands/meta-build/coordinator.md`.
   - Utility names (`explore`, `pr`, `retire-docs`, `status`, `worktree`) select the body card, e.g. `@sai/commands/explore/body.md`.
4. Once the wrapper's command bootstrap has loaded, fetch the selected card — `Fetch @sai/commands/{name}/coordinator.md` for a routed name, `Fetch @sai/commands/{name}/body.md` for a utility name — and follow it, handing it `arguments_value` byte-for-byte; the card owns every parse of it.

Worker dispatch and `task_id` continuation follow the worker binding the card loads.
