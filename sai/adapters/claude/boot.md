# Claude Code boot adapter

Accept the two-key boot request from the wrapper: `command_name` and `arguments_value`.

This invocation starts clean: disregard prior conversational context except where a fetched contract explicitly directs otherwise.
Fetch @sai/orchestration/command-runner.md and follow it first.

Use `command_name` only for card selection. Routed names (`spec`, `design`, `implement`, `review`, `security`, `performance`, `accessibility`, `apply`, `build`, `meta-review`, `commit`, `archive`, `backfill`, `merge`) select the matching coordinator card — `@sai/commands/{name}/coordinator.md`, for example `Fetch @sai/commands/spec/coordinator.md`, `Fetch @sai/commands/apply/coordinator.md`, `Fetch @sai/commands/build/coordinator.md`, and `Fetch @sai/commands/meta-review/coordinator.md`. Utility names (`explore`, `pr`, `status`, `worktree`) select the matching utility body card — `@sai/commands/{name}/body.md`, for example `Fetch @sai/commands/explore/body.md`).

Forward `arguments_value` byte-for-byte to the selected card. Do not parse, clean, persist, or reinterpret it. Keep continuation references and Claude dispatch metadata adapter-owned. Routed cards select their worker through the active worker binding (`worker.md`, or the apply `red-worker.md`/`green-worker.md` bindings); utility cards never enter a worker lifecycle. Return the selected card's closed lifecycle payload unchanged.
