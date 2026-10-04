# Provider-owned reference resolution

The registry's default uses `hosts` or `domainless` for selection, then calls
the adapter's `normalize(value)`. Keep existing entries unchanged.

Set `resolution` to `provider` to export `resolve(value, io)` instead.
Registered host matches win. For a complete URL on an unmatched host, entries
with provider-owned resolution are fallback candidates; exactly one candidate
is required. `hosts` may be absent. Domainless references still require an
explicit `domainless` registry declaration. Shared parsing establishes a URL,
not compatibility: the selected resolver validates the raw trimmed reference,
including protocol, credentials, port and issue path, through provider mechanics.

Use `io.run(command, args, input)` for read-only CLI resolution with data
arguments. Return `resolved` with the canonical reference fields used by
`read`, or an existing error outcome. The shared helper attaches provider,
instructions and adapter, and calls `read` only after `resolved`. Resolution
does not import partial content or change origin provenance.

Install adapters through the shared `sai-tools` projection and references
through the universal skill projection for Claude Code and opencode. Both
harnesses use the existing read-only helper permission; no direct CLI grant is
needed.
