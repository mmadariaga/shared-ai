# Provider-owned destination resolution

The registry's default is host-based selection and shared destination resolution.
Keep existing entries unchanged to retain that behavior.

Set `resolution` to `provider` for an adapter that owns destination resolution.
Its `hosts` may be absent: registered host matches win, and otherwise such an
entry is a candidate for an address on an unknown host. Several candidates
require a provider choice. An explicit or configured provider selects its own
resolver before shared host compatibility or repository checks.

Export `resolve({ explicit, config, remotes }, io)`. The inputs are unchanged
destination fields and raw remote addresses; apply explicit fields before
configuration, then remotes. Use `io.run(command, args, input)` for read-only CLI
resolution, passing arguments and content as data. Validate compatibility in
the adapter, not a shared host catalogue. Return `resolved` with the canonical
`repository` and any `project`, or an existing `needs_input`/`unsupported`
outcome. The shared tool attaches the selected provider, instructions and
adapter. A `provider-ambiguous` or `repository-ambiguous` result allows the CLI
wrapper to gather Git remotes and repeat resolution.

Resolution grants no publication authority. Query, confirmation, publication,
origin-update and recovery operations retain their existing contracts. Install
the adapter through the shared `sai-tools` projection and provider references
through the universal skill projection for Claude Code and opencode. Both
harnesses call the shared helper; resolution adds no direct CLI permission.
