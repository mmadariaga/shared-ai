# ADR 0079: Design worker notices and reconstruction metadata

<!-- adr-index: refs 0075; refs 0076 -->

## Status

Accepted

## Context

The implementation coordinator-worker exchange (ADR 0075, ADR 0076) defines an invocation envelope and lifecycle payload for implementation planning. The design coordinator-worker needs a parallel contract but with two additional lifecycle behaviors: a nonterminal notice that the coordinator acknowledges with a fixed response rather than user-facing input, and durable reconstruction metadata that survives worker failure without leaking context across Isolation Mode boundaries.

Without an explicit notice protocol, a banner emission or intermediate status message would either block the worker (if treated as needs_input) or force the coordinator to inspect unstructured output. Without opaque input history and pending feedback in reconstruction metadata, a recovered worker would re-ask already-answered questions or lose in-progress feedback.

## Decision

Extend the coordinator-worker lifecycle for design with these additions:

1. **Nonterminal notice**: The worker may emit a `DesignNotice` containing `event: "notice"`, `message`, and `changed_files`. The coordinator prints the message verbatim and replies with the fixed acknowledge token `continue_after_notice` without adding it to opaque input history, user answers, or pending feedback. The worker resumes processing.

2. **Opaque input history**: The coordinator maintains an ordered list of `{question, options, answer_value}` tuples from every `needs_input` exchange. On recovery, the coordinator forwards the exact history. The worker replays it to skip already-resolved questions.

3. **Pending feedback**: An in-progress feedback payload is forwarded on recovery so the worker can re-apply it to reconstructed artifacts without requiring the user to re-enter it.

4. **Implementation contract isolation**: Design reconstruction metadata never carries implementation-planning state. The boundary is enforced by the resolved-change-name copy in Continue-now (see ADR 0080).

## Alternatives Considered

- **Include the notice as a field in the existing lifecycle payload** - would change the shared implementation payload shape unacceptably.
- **Skip reconstruction and restart from scratch on failure** - wastes the durable artifacts the worker already wrote and forces the user through repeated closed-choice prompts.
- **Forward artifact contents in reconstruction** - violates Isolation Mode by leaking artifact content across the coordinator-worker seam.

## Consequences

- The coordinator must handle a third lifecycle event type distinct from `needs_input` and terminal statuses.
- Reconstruction is bounded by what the opaque history records; the worker cannot recover ephemeral state it did not push through the coordinator.
- The notice protocol is design-only; implementation planning has no need for nonterminal notices.

## Related

- `docs/adr/0075-normalized-invocation-envelope-and-lifecycle-payload.md`
- `docs/adr/0076-resume-worker-before-durable-reconstruction.md`
- `openspec/changes/introduce-design-coordinator-worker/specs/design-worker-notices/spec.md`
