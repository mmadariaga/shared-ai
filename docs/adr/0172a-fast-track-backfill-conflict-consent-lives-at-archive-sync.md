# ADR 0172a: Fast-track backfill defers spec-conflict consent to archive's delta-spec sync gate

## Status

Accepted

## Context

Backfill's conflict detection scans `openspec/specs/` and, on overlap, historically waited for an explicit proceed-or-abort decision before writing any artifact. With unattended envelopes (crystallized block + diff-source token + `--fast-track`), no human is present at backfill time. Halting the run for a decision nobody can give would break automation, while silently dropping the report would hide the overlap entirely.

## Decision

Under `fast_track_active`, backfill carries the verbatim conflict report in its payload and continues automatically without the proceed-or-abort ask. The accept-or-reject decision is owned by exactly one surface: `/sai-archive`'s delta-spec sync gate, which already re-surfaces the change's MODIFIED deltas against main specs at archive time — the only moment main specs actually mutate. Backfill writes reversible deltas inside its own change directory; archive gates the irreversible sync.

## Alternatives Considered

| Option | Pro | Con |
|---|---|---|
| Hard halt under fast-track when conflicts exist | Zero unreviewed deltas | Unattended runs always die; agents hang on a picker nobody answers |
| Auto-proceed silently without carrying the report | Simplest flow | The overlap becomes invisible until archive surprises the user |
| Keep the interactive picker for every caller | Maximum caution | Defeats the unattended contract this capability exists to provide |
| Carry the report verbatim and defer consent to archive sync (chosen) | Reversible delta now, human consent at the mutating gate | Consent is deferred one phase later than today |

## Consequences

- Backfill's fast-track opt-out set includes the conflict decision; the interactive path keeps today's picker unchanged.
- Archive's existing delta-spec sync gate becomes the single consent point for spec mutations from backfilled changes.
- The verbatim report must survive into coordinator-presented output so archive-time review has full context.
- Changing where conflict consent lives requires touching both capabilities' specs in one change.

## Provenance

user — the deferral target was corrected in conversation: the reviewer established that backfill never mutates main specs and that archive's sync gate already owns that decision.
