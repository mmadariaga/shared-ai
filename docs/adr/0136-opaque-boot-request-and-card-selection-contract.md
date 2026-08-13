# ADR 0136: Opaque boot request and card-selection contract

## Status

Accepted

## Context

The boot seam must select a command card without moving change-name parsing, option handling, or continuation ownership out of the routed coordinator and worker contracts. Parsing the request in a shared adapter would make the adapter a second lifecycle owner and could alter wrapper argument semantics.

## Decision

Each wrapper supplies `command_name`, `wrapper_echo_value`, and `arguments_value`, plus an optional opaque continuation reference owned by the active harness. The boot uses `command_name` only to select the routed coordinator or utility body, forwards the two envelope strings byte-for-byte, loads `@sai/command-runner.md` before the selected card, and returns the selected card's closed lifecycle payload unchanged.

## Alternatives Considered

- Pass only cleaned arguments — rejected because wrapper-echo precedence and worker-owned resolution would be lost.
- Let every wrapper fetch its card directly — rejected because selection and harness dispatch would be duplicated across wrappers.

## Consequences

Change resolution, option parsing, and worker lifecycle remain owned by the existing command cards and workers. The adapter contract is stable across routed and utility cards, while continuation references and dispatch identifiers remain harness-owned and never enter worker-authored artifacts.

## Provenance

Derived — the contract preserves the existing opaque invocation envelope and worker-owned lifecycle boundaries while introducing the adapter seam.
