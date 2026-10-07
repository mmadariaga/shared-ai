# Provider-owned reference resolution

## Selection

The registry's default uses `hosts` or `domainless` for selection, then calls
the adapter's `normalize(value)`. Existing entries retain this behavior.
Under default classification, registered host matches win. For a complete URL
on an unmatched host, entries with `resolution: provider` are fallback
candidates. `hosts` may be absent. Domainless references require an explicit
`domainless` registry declaration.

To own reference classification, set `classification` to `provider` and export
`classify(value)`. It receives the raw trimmed reference, including references
that are not URLs. Return exactly `match` for a direct claim, `fallback` for a
compatibility candidate, or `null` to decline. Classification is pure: inspect
the reference only, with no CLI reads, context lookup, or side effects.

Direct claims win over fallback candidates across both classification modes.
Exactly one candidate in the winning tier is required before context resolution
runs. Classification selects an adapter; it does not validate or resolve the
reference. An adapter with provider-owned classification must validate its raw
reference during resolution. No registered provider currently opts into this
classification mode, so accepted references remain unchanged.

## Context resolution

Set `resolution` to `provider` to export `resolve(value, io)` instead.
Default shared parsing establishes a URL, not compatibility: the selected
resolver validates the raw trimmed reference,
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
