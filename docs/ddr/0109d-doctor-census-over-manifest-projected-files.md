# DDR 0109d: Doctor's opencode agent census derives from manifest-projected agent files, with the binding-to-projection alignment desync an explicit open gap

## Status

Accepted

## Context

Two main specs asserted opposite doctor behavior: `openspec/specs/install-doctor-diagnostics/spec.md` required doctor to validate worker presence in the opencode configuration agent map, while `openspec/specs/opencode-agent-preservation/spec.md` forbade exactly that. The shipped doctor follows the latter: `managedOpencodeAgentRecords` (`bin/doctor.js:367-412`) emits a record per **manifest-projected agent file** — `missing` error with re-install remediation, `ok`, or `incompatible` error — via `managedBytesMatch` (`bin/doctor.js:314-317`), which compares body-and-non-tunable-frontmatter identity after stripping per-harness tunable keys. Doctor's only config read is `openspec/config.yaml` (`bin/doctor.js:100-106`); it never parses the opencode configuration, so the configuration agent-map presence check the spec prescribed performs no check at all.

The guarantee that can actually be made is scoped: doctor SHALL emit a record for every manifest-projected opencode agent file. "Every binding-dispatched worker is visible to doctor" holds exactly while the manifest's projection set stays aligned with the binding-derived roster; that alignment is enforced by no runtime or test check — `validateOpencodeWorkerBindings` (`bin/install-flow.js:282-304`) validates binding files only with no manifest cross-check, doctor reads the manifest only, and no test imports both surfaces.

## Decision

The census requirement is re-expressed over the manifest's opencode `tunable-seed` agent projections: doctor SHALL derive its inventory from the install manifest and SHALL emit a record for each projected agent file — missing, incompatible, or compatible — so that no projected worker can be silently absent from the doctor report. The installer's binding-derived roster validation SHALL remain the install-time counterpart. The binding-to-projection alignment desync is an explicit open gap, recorded as the delta scenario "A binding without a projection is invisible to doctor" and owned by a future code change (installer roster validation cross-checking the projection set, with tests) — not a guarantee this requirement claims.

## Alternatives Considered

- **Keep the configuration agent-map presence check** — rejected: it describes machinery that performs no check; doctor never parses the opencode configuration.
- **Re-express over the binding-derived roster** — rejected: doctor does not read bindings, so the requirement would still encode a claim the shipped implementation does not uphold.

## Consequences

The decision states the domain invariant "no projected worker is silently absent from the doctor report" — a property that must hold of doctor's records at all times, stated as a property of the domain rather than as the mechanism that upholds it (inventory derives from manifest projections), which is why this record is a DDR. The accurate-but-scoped guarantee replaces the false-but-strong one, and the recorded open gap is the trail the future alignment cross-check builds on.

## Provenance

Codebase-forced — shipped doctor behavior (manifest-only inventory, body-and-non-tunable identity) leaves no alternative for an accurate requirement.
