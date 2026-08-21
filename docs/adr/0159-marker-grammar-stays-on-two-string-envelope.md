# ADR 0159: Supervised marker grammar stays on the two-string envelope; Explore owns the capability

<!-- adr-index: refs 0158; refs ddr:0114 -->

## Status

Accepted

## Context

The `--supervised` marker must reach phase workers so they can strip it before change resolution. Explore serializes Auto-supervised envelopes. Spec uses leading line-wise strip grammar; design uses name-first flag recognition beside `--fast-track` and `--overview-lang`. After deleting the worker-owned review loop, the marker must no longer act as a review-loop enable/suppress switch, but parsing still has to live somewhere.

This is change `remove-cold-artifact-reviewer`, Decision D3.

## Decision

Keep `--supervised` inside `wrapper_echo_value` / `arguments_value` only. Do not add a third envelope field or touch boot adapters. Move capability ownership and the normative “phase grammars differ and SHALL NOT be collapsed” rule under `explore-pipeline-supervision`. Worker files still implement parsing because they are the envelope consumers; they no longer treat the marker as a review-loop switch.

## Alternatives Considered

- **Third envelope field** — rejected; expands the closed two-string envelope (DDR 0114).
- **Collapse spec and design grammars into one ordering rule** — rejected by existing phase grammar scenarios.
- **Move parsing entirely into Explore without worker recognition** — rejected; workers must still strip the marker before resolution.
- **Keep two-string envelope; Explore owns capability; workers keep parse mechanics** (chosen).

## Consequences

- Marker transport/serialization ownership is Explore; parse consumption remains on workers.
- Implementers must not delete worker parse mechanics when removing review-loop branching.
- Tests continue to pin two-string envelopes and phase-specific grammars.

## Provenance

Codebase-forced — `openspec/changes/remove-cold-artifact-reviewer/design.md`, Decision D3.
