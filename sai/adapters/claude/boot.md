# Claude Code boot adapter

Accept the four-field boot request from the wrapper: `command_name`, `wrapper_echo_value`, `arguments_value`, and the optional opaque `continuation_reference`.

Fetch @sai/orchestration/command-runner.md and follow it first.

Use `command_name` only for card selection. Routed names (`spec`, `design`, `implement`, `review`, `security`, `performance`, `accessibility`, `apply`, `build`) select the matching coordinator card — `@sai/commands/{name}/coordinator.md`, for example `Fetch @sai/commands/spec/coordinator.md`, `Fetch @sai/commands/apply/coordinator.md`, and `Fetch @sai/commands/build/coordinator.md`. Utility names (`archive`, `backfill`, `commit`, `explore`, `pr`, `status`, `worktree`) select the matching utility body card — `@sai/commands/{name}/body.md`, for example `Fetch @sai/commands/archive/body.md`.

Forward `wrapper_echo_value` and `arguments_value` byte-for-byte to the selected card. Do not parse, clean, persist, or reinterpret either value. Keep `continuation_reference` and Claude dispatch metadata adapter-owned. Routed cards select their worker through the active worker binding (`worker.md`, or the apply `red-worker.md`/`green-worker.md` bindings); utility cards never enter a worker lifecycle. Return the selected card's closed lifecycle payload unchanged.
