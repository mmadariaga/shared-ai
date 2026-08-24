# sai-bounded-dispatch-retry Specification

## Purpose

Shared bounded retry contract for transport-class harness-native subagent dispatch failures: retryable failure classes, the identical-prompt retry budget, and the rule that retry accounting stays out of durable state.

## Requirements

### Requirement: Transport-class dispatch failures get bounded retries
Every surface that dispatches delegated tier subagents through the harness-native mechanism SHALL follow `sai/policies/bounded-dispatch-retry.md`: only transport-class failures are retryable — a harness-native transport error class such as `network_error`, a transient infrastructure-side rejection of the dispatch call, or a dispatch timeout with zero observable agent activity — and each logical dispatch gets exactly one initial attempt plus at most two retries re-issuing the IDENTICAL prompt through the identical binding and output contract. A closed result of any kind returned by a started subagent SHALL NOT be retried under this policy.

#### Scenario:
- **WHEN** a harness-native budget-explorer dispatch fails with `network_error` before any agent activity
- **THEN** the caller announces `retry 1 of 2` or `retry 2 of 2`, re-issues the unchanged prompt, and on exhaustion reports the failure class and attempts made without fabricating a result

### Requirement: Retry accounting stays out of durable state
Worker cards that delegate to subagents SHALL fetch the bounded-dispatch-retry policy as part of their fixed load list, and retry accounting SHALL remain conversation-only invocation state — never persisted to artifacts, `.openspec.yaml`, configuration, or worker payloads, and never entered into a worker journal or changed-files union.

#### Scenario:
- **WHEN** a routed worker retries a failed subagent dispatch and later completes
- **THEN** its lifecycle payloads and any written artifacts contain no retry ledger, attempt counters, or repair history from the dispatch-retry policy
