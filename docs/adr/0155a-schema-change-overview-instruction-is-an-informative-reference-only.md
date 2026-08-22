# ADR 0155a: Schema change-overview instruction is an informative reference only

<!-- adr-index: refs 0146b -->

## Status

Accepted

## Context

The workflow schema's `change-overview` `instruction:` field (in `openspec/schemas/sai-workflow/schema.yaml`) previously duplicated normative contract material that belongs solely in the shared contract (`sai/commands/design/change-overview.md`) and the design-worker envelope-mapping clause. That embedded instruction carried a second, stale normative generation contract enumerating forbidden sections, the five-field envelope, failure-kind vocabulary, and parent-vs-generator split prose.

Applying the consumption criterion — schema.yaml consumes nothing and only projects text, while the design worker consumes and validates the generator envelope — the embedded instruction must become a non-empty informative reference only. The live CLI projection surface `openspec instructions change-overview` reads this field and must not degrade to silence.

The command-owned path that the instruction now points to was established by [ADR 0146b](./0146b-command-owned-files-live-in-their-consuming-command-directory.md), which moved `change-overview.md` from the retired `sai/` root into `sai/commands/design/`.

## Decision

The workflow schema's `change-overview` `instruction:` field remains non-empty so the live CLI projection surface `openspec instructions change-overview` does not degrade to silence. It is an informative reference to `sai/commands/design/change-overview.md` only and does not carry a second normative generation contract. In particular it does not:

- enumerate required or forbidden overview sections
- restate fidelity rules or pre-write validation rules
- restate the five-field generator envelope (`status`, `changed_files`, `validation`, `failure_details`, `failure_kind`)
- restate the closed `failure_kind` vocabulary or the parent-versus-generator authoring split
- restate the outer `envelope-contract-violation` mapping or other outer worker classification rules

Those norms remain solely in `sai/commands/design/change-overview.md` and in the design-worker envelope-mapping clause the worker consumes.

## Alternatives Considered

- **Empty `schema.yaml` `instruction:` entirely** — rejected; degrades the live CLI surface (`openspec instructions change-overview`) to silence, and the proposal explicitly rejected this.
- **Keep the superseded normative prose in `instruction:`** — rejected; it is a second stale normative generation contract that drifts from the shared contract and is exactly the defect that produced overviews mirroring source-document headings.

## Consequences

- The schema `instruction:` is less prescriptive than the current duplicated contract text; it is a pointer, not a contract.
- Downstream CLI consumers depend on the non-empty instruction; removing content is irreversible without restoring the superseded prose.
- The closed generator envelope, the closed `failure_kind` vocabulary, and the parent-vs-generator authoring split remain defined solely by the shared generation contract and the design-worker envelope-mapping clause.

## Provenance

codebase-forced — the consumption criterion (schema consumes nothing, worker consumes and validates the envelope) is an existing structural fact, and the live CLI surface requires a non-empty instruction. The proposal explicitly rejected the empty-instruction alternative.
