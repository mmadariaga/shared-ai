**Complexity**: medium (2 capabilities, 5 requirements, 4 files, no breaking change)

## Why

No live card emits a Fetch for `sai/commands/design/change-overview.md`, so the change-overview generation subagent never receives its shared contract. The design worker improvises a prompt and fills gaps from `schema.yaml`'s superseded instruction text, producing overviews that mirror source-document headings instead of the nine required sections. The defect is absent transport, not a missing contract file — everything living only in the un-fetched contract is lost on every run.

## What Changes

- Design-worker overview-generation dispatch names the budget-subagent binding per harness and transports the shared generation contract by Fetch inside the dispatch prompt
- The dispatch prompt is reduced to the change name, `overview_language`, and the Fetch directive; it MUST NOT paraphrase sections, content rules, or validation rules
- On contract-load failure the generator returns `failure_kind: generation-error` and MUST NOT improvise
- `openspec/schemas/sai-workflow/schema.yaml` points the `change-overview` artifact at `sai/commands/design/change-overview.md` instead of the retired `sai/change-overview.md` root path
- The schema `instruction:` field becomes a non-empty informative reference to that contract (kept non-empty so `openspec instructions change-overview` does not degrade to silence) and stops carrying any second normative generation contract — including forbidden-section prose, the five-field envelope, failure-kind vocabulary, parent-versus-generator split, and outer classification mapping
- Contract tests assert the transport exists (worker Fetch + both harness bindings) and that schema `instruction:` carries no forbidden-section or envelope/contract prose; template-only section checks do not substitute for that coverage
- `sai/commands/design/change-overview.md` is not modified — it is already the correct single source of the generation contract
- Non-goals: schema re-sync / drift detection for installed projects; detection or repair of a stale project-local Fetch override of the overview contract; worker-side structural verification of the written overview before `overview.state: current`; the three specs ADR 0146b deliberately left lagging (`wrapper-fetch-paths`, `instructions-fold`, `docs-sync`)

## Capabilities

### New Capabilities

- None

### Modified Capabilities

- `change-overview-generation-routing`: the dispatch names its budget binding per harness and transports the contract by Fetch; the generator loads the shared instruction itself rather than receiving a worker-composed paraphrase; contract-load failure is `generation-error` without improvisation; schema instruction is an informative pointer only (no section, envelope, or classification prose); contract tests pin transport and schema-instruction cleanup
- `command-owned-file-layout`: the workflow schema references the contract at its command-owned path instead of the retired `sai/` root destination

## Impact

- `sai/commands/design/worker.md` — overview-generation dispatch clause (binding names, contract Fetch, minimal prompt, no-improvise on load failure)
- `openspec/schemas/sai-workflow/schema.yaml` — `change-overview` path reference and `instruction:` body
- `test/change-overview-contract.test.js` — transport and schema-instruction assertions
- `test/design-coordinator-worker.test.js` — narrow existing five-envelope-field-name assertion to the shared contract wording surface (its schema-instruction scope breaks when superseded prose is removed)
- Not modified: `sai/commands/design/change-overview.md` (already correct)
- Existing projects receive the schema fix only after `bin/install setup` is re-run there
- Mirrored Claude Code and opencode behavior required

## Proposal Research Documentation

**Local files**:
- `sai/commands/design/worker.md` (overview generation section; dispatch clause ~92; envelope mapping ~99)
- `sai/commands/design/change-overview.md` (nine-section contract, forbidden sections, five-field envelope, failure_kind split)
- `openspec/schemas/sai-workflow/schema.yaml` (~221 path; ~240-247 superseded instruction prose)
- `openspec/specs/change-overview-generation-routing/spec.md` (shared instruction executed on dispatch; harness parity)
- `openspec/specs/command-owned-file-layout/spec.md` (canonical command-owned path)
- `openspec/specs/change-overview-artifact/spec.md` (no dispatch transport requirements)
- `openspec/specs/change-overview-synchronization/spec.md` (`overview.state` commit rules; out of write scope)
- `sai/orchestration/workers/bindings/opencode/worker-template.md` (contract-by-Fetch dispatch pattern)
- `sai/commands/explore/body.md` (budget-subagent binding named per harness)
- `test/change-overview-contract.test.js` (nine-section / forbidden-section assertions on template)
- `agents/claude/budget-subagent.md` (fetch skill already bootstrapped)
- `sai/install-manifest.json` (`retired-sai-change-overview-root`)
- `GLOSSARY.md`

**External URLs**:
- None

## Additional Notes

- Diagnosis partition: everything `worker.md` states inline reached the generator (e.g. `overview_language`, five-field envelope); everything living only in the un-fetched contract was lost (nine sections, fixed `### Snapshot`, forbidden-section prohibition, pre-write validation). That partition predicts the observed defective overviews exactly.
- Rejected alternative: worker fetches the contract and composes the dispatch prompt — retains the paraphrase step with better source material (same failure, longer fuse).
- Rejected alternative: empty `schema.yaml` `instruction:` entirely — degrades the live CLI surface (`openspec instructions change-overview`) to silence; non-empty informative reference is required for that reason.
- Deferred: worker-side structural verification of the written overview before committing `overview.state: current` — requires changing the state-commit rule across two specs and a new failure classification; per-project model override via explicit binding is the cheaper first lever.
- Trade-off accepted: `validation: passed` remains self-attested by the generator; the worker still commits `overview.state: current` on envelope success alone.
- Binding tokens (house pattern from explore): Claude Code — `Agent(subagent_type: budget-subagent)`; opencode — `task(subagent_type: budget)`. Naming only one harness leaves the change incomplete against mirrored-behavior. Shipped binding defaults may be low-cost; full synthesis quality is the per-project model/effort override on that named binding, not an unnamed higher tier at dispatch.
- Contract-load failure MUST NOT fall back to improvising — falling back is today's defect. `dispatch-failed` remains parent-only per the shared contract (`change-overview.md` reserves it to the parent); the generator emits `generation-error` for load failure.
- `sai/commands/design/worker.md` envelope-description clause (~99) stays unchanged: the worker consumes and validates that envelope; schema.yaml consumes nothing and only projects text — the same consumption criterion removes envelope and classification prose from schema `instruction:`.
- Project-local Fetch resolution (project-local before global) can silently prefer a stale local `change-overview.md`; that override is accepted harness Fetch behavior. Detecting or repairing stale local overrides is a non-goal of this change.
- First materialization and regeneration use the same transport and the same minimal prompt; no regeneration-specific variant.
