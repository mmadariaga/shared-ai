# ADR 0040: Session-scoped commit authorization lives in in-conversation working memory only

## Status

Accepted

## Context

The `commit-auth-allow-on-session` change introduces a session-scoped authorization flag that skips subsequent per-commit authorization gates after the user selects `Allow on this session`. The flag must be stored somewhere while the in-conversation session is active.

## Decision

The flag is a boolean held in the agent's in-conversation working memory only. It is never written to disk and resets at the start of a new chat or new `/sai-*` invocation. This mirrors the feedback-gate iteration counter (`artifact-feedback-gate.md:19-27`) which follows the same in-conversation-only model.

## Alternatives Considered

- **Persist the grant to `.openspec.yaml` or config file.** Rejected: breaks the per-invocation authorization model, makes expiry and scope boundaries murky, and would survive across unrelated invocations.
- **Persist to a runtime store.** Rejected: there is no runtime; this is an agent-instruction capability implemented in prose.
- **In-conversation working memory only** (chosen): keeps the grant explicit, ephemeral, and safe by default. The user must opt in again in every new session.

## Consequences

- The grant is best-effort: if the agent loses context (long conversation, summarization), it falls back to asking — the safe default.
- No disk footprint, no config migration, no backward-compatibility concerns.
- Sets the pattern for future in-memory-only authorization state in the SAI workflow.
