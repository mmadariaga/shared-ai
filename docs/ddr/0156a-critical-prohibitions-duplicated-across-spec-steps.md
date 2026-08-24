# DDR 0156: Critical prohibitions are deliberately duplicated across the spec worker contract and its step files

## Status

Accepted

## Context

Step-gated instruction delivery (ADR 0172c) splits the sai-1-spec worker's instructions into one file per progress-plan step so each stretch is salient when it becomes active. Carving raises a maintenance temptation: the artifact-only scope, the forbidden-artifact list, and the external-findings evidence rules now appear both in the always-loaded worker contract (`worker.md` plus `steps/common.md`) and restated inside the step files that operationalize them. A future editor will see the duplication and want to single-source it.

Removing either copy would reintroduce the drift the split exists to fix: compliance would again depend on remembering a paragraph read thousands of tokens earlier, and the step-file copy is the one in force while the worker actually writes artifacts. The wholesale-move alternative is also closed: the lifecycle sentences in `worker.md` are pinned by tests and by cross-phase consumers, so they must stay verbatim where they are.

## Decision

The duplication is an invariant, not incidental debt: critical prohibitions and boundary rules SHALL remain present verbatim in the worker contract while step files deliberately restate their operational flow for the active step. When a prohibition changes, both surfaces MUST be updated together in the same change. Deduplicating one side — or moving a rule wholesale out of `worker.md` into a step file — violates this record.

## Alternatives Considered

- **Single-source via fetch-only references** — rejected: a pointer is not salient content; the drift protection comes from the rules being read again at point of use.
- **Move the evidence rules wholesale into `review.md`** — rejected: those lifecycle sentences in `worker.md` are pinned byte-for-byte by tests and shared with other consumers; relocating them changes more than this experiment owns.

## Consequences

Editors must treat the two copies as one logical rule with two required renderings; divergence between them is a defect, not flexibility. Review of any future edit touching scope, findings-evidence, or forbidden-artifact wording must check both surfaces. This is a durable property of how step-gated prompt material is maintained, so it is recorded as a DDR.

## Provenance

User + derived — Decision D4 of `openspec/changes/spec-step-gated-instructions/design.md`.
