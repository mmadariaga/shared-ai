# ADR 0065: Fork `status-picker.md` from `change-picker.md` rather than parameterize the shared picker

## Status

Accepted

## Context

`sai/instructions/change-picker.md` is the shared 0/1/N change-name resolver fetched by every change-consuming `sai-*` command. Its consumer-list sentence (line 3) enumerated 10 commands, `sai-status` among them.

The `add-see-all-to-sai-status` change adds a **"See all"** bulk view to `/sai-status` on the 2-or-more-changes branch — an option that no other consumer wants. That option has to live somewhere in the resolution path, and the resolution path is currently a single shared file on the hot path of 9 unrelated commands.

## Decision

Fork a dedicated `sai/instructions/status-picker.md`, fetched only by `sai-status`, that reproduces `change-picker.md`'s 0/1/N resolution machinery verbatim (Wrapper-Echo Resolution, invocation trigger, `openspec list --json` as the sole name source, resolved-name substitution) and diverges only on the 2+ branch to prepend "See all" as the first option. `change-picker.md`'s consumer list drops back to the 9 change-consuming commands, and a `change-picker` consumer-scope requirement locks `sai-status` out of it so the fork boundary is enforced by spec, not just convention.

The ~80% duplication between the two files is accepted intentionally.

## Alternatives Considered

| Option | Pro | Con |
|---|---|---|
| Fork into `status-picker.md` (chosen) | The 9 shared consumers stay byte-for-byte untouched; the "See all" surface is isolated in one file; regression blast radius is zero for the other commands | ~80% of the picker logic is duplicated across two files; a future reader sees near-identical files; re-unifying them later is a refactor spanning all consumers |
| Parameterize `change-picker.md` with a `see-all` flag | Single source of truth; no duplication | Injects a `sai-status`-only branch into the hot path shared by 9 other commands, coupling their behavior to a feature they never use and raising regression risk for all of them |

## Consequences

- `change-picker.md` and `status-picker.md` must be kept in sync by hand on the 0/1/N core; drift is guarded by the `change-picker` consumer-scope scenario and the `status-picker` "0/1/N match change-picker" scenarios, which pin both sides so a divergence fails a scenario check.
- The fork is hard to reverse in the unify direction: merging the two files later touches every consumer. The direction chosen deliberately trades that cost for present-day isolation of the shared hot path.
- `status-picker.md` owns only resolution; it signals "See all" by printing a literal `> BULK-MODE ACTIVE` line (mirroring the existing `> FAST-TRACK MODE ACTIVE` convention) that `sai-status.md` detects and renders — keeping the picker's diff against `change-picker.md` minimal.

## Related

- `openspec/changes/add-see-all-to-sai-status/design.md` — Decisions D1, D4
- `openspec/changes/add-see-all-to-sai-status/specs/change-picker/spec.md` — consumer-scope requirement
- `openspec/changes/add-see-all-to-sai-status/specs/status-picker/spec.md` — status-picker capability
- `sai/instructions/change-picker.md` — the shared picker forked from
