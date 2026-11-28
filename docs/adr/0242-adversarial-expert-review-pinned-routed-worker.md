# ADR 0242: Adversarial expert review is a pinned routed worker

## Status

Accepted.

## Context

Every product of the pipeline was reviewed by the workers and framing that produced it: the plan review rounds read the artifacts the plan workers had just written, and `/sai-4-review` read the diff through the change's own framing. A defect that producer and reviewer shared reached the user, and more rounds inside the existing workers added no independent viewpoint, because the viewpoint was the same. The pipeline needed one optional reviewer that reads a finished product adversarially and proposes corrections, at the point where that product is about to settle. A generic agent would leave the routed worker family: it would carry no `worker-matrix` model or effort, no generated binding on either harness, and its report would sit outside the closed report schema and its validator, so no coordinator could decide on it from a validated field.

## Decision

The reviewer is a pinned routed worker, `sai-adversarial-expert-review-worker`, with its own matrix phase `expert-review`, its contract `sai/commands/adversarial-expert-review/worker.md`, and the binding stem `adversarial-expert-review`. The installer materializes its binding and its agent files on Claude Code and opencode from the standalone binding template and the worker template, and the matrix supplies its default model per harness; the five shipped presets carry their own `worker:sai-adversarial-expert-review-worker` entry, so the model is a `setup` choice rather than a card detail.

Its capability profile `worker-expert` extends `worker-write`: read, edit, write, and shell access for read-only verification and `transfer.js`, and no subagent dispatch. The card loads `sai/commands/implement/worker-common.md` for the ready handshake, the report transport, and the git and subagent prohibitions, and carries no step machine, because one checkpoint means one message.

Its report is closed by `sai/tools/worker-report-validator.js --command adversarial-expert-review`: a `completed` report requires `findings`, a possibly empty list of `{identifier, severity, location, issue, correction}` entries with an optional `paths` list of string paths, and document mode adds `corrected_documents`, a list of `{path, sha256, change_name}`. Severity is the closed `High`, `Medium`, `Low` set of `sai/policies/artifact-review-contract.md`.

## Alternatives Considered

- **A generic agent like the budget helpers.** Rejected because it leaves the routed worker family: no matrix model, no generated binding or agent file on either harness, and a report with no command row in the validator, so a coordinator could only read prose.
- **A standalone command the user invokes separately.** Rejected because a command owns a conversation, its own lifecycle, and its own commit authorization, while the reviewer must run inside the invoking run at that run's checkpoint, over the run's own product, with the coordinator keeping or reverting each correction.

## Consequences

- One routed role joins the worker matrix, the capability registry, the presets, and the report validator's command table, so every existing parity and count check follows it.
- The reviewer's model and variant come from the `worker-matrix` and the setup; changing them needs no card edit.
- The reviewer's findings use the shared artifact review contract, so they compare with the plan review rounds, while `review.md` keeps its own audit vocabulary.
- The worker writes only the allowed write paths of its brief and its report; the coordinator decides, verifies, and commits.

## Provenance

Change `adversarial-expert-review`, decision "Adversarial expert review is a pinned routed worker".
