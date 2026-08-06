# ADR 0106: Keep both report template families with pinned skeleton parity

## Status

Accepted

## Context

Each of the four report artifacts — review, security, performance, accessibility — has two template families that describe the same downstream artifact. The schema scaffolds at `openspec/schemas/sai-workflow/templates/{artifact}.md` are what `openspec instructions <artifact-id>` serves as the starting report written into a fresh change directory; the write-time contracts at `sai/instructions/_templates/{artifact}-report.md` are fetched at write time by the phase instructions and govern what an audit author fills in — `/sai-5-review` writes `review.md`, `/sai-6-security` writes `security.md`, `/sai-7-performance` writes `performance.md`, and `/sai-8-accessibility` writes `accessibility.md`, each loading its matching contract.

The two families were born as mirrors: the `2026-05-17-sai-workflow` archive tasks 1.8–1.11 created the scaffolds "based on `instructions/sai/review.md`" and its siblings. The template-extraction change (`2026-07-29-extract-instruction-output-templates`) moved the write-time contracts into `_templates/` without touching the scaffolds, and since that split nothing pinned parity. By the time the `pin-report-template-parity` change audited the pairs, the families had drifted: the security scaffold lacked the Supply Chain Hygiene, License Risk, Policy Compliance, and Acknowledged Trade-offs sections its own contract requires; the three audit contracts lacked the mandatory `## Not Applicable` section the scaffolds already carried; every pair disagreed on the header metadata label (`**Spec:**` on the scaffolds vs `**Change:**` on the contracts); and the review pair disagreed on section order and the Mutation Analysis field set.

## Decision

Keep both template families and pin within-pair skeleton parity. For each report artifact, the scaffold and the contract SHALL expose the same top-level `## ` heading text in the same order and the same leading header metadata field labels, diverging only in placeholder syntax (`<!-- -->` on scaffolds vs `{...}` on contracts), fill-in guidance depth, and code-fence wrapping. The reconciliation consolidates the scaffolds toward the contracts as the structural authority, and `test/report-template-parity.test.js` enforces the pin — it fails when a heading, a header field label, or (for review) a Mutation Analysis field appears on one side without the other.

## Alternatives Considered

- **Single-source to the scaffolds** — delete the `_templates/*-report.md` contracts and make the phase instructions `Fetch` the schema templates instead. Rejected: scaffolds are optimized to be filled in by a caller dropping a file into a change directory (they carry `<!-- -->` placeholders and fill-in guidance); contracts are optimized to be fetched at write time by a phase instruction (they carry `{...}` placeholders and write-time rules). Forcing one role loses the other.
- **Single-source to the contracts** — delete the scaffolds and make `openspec instructions <artifact-id>` emit the contract. Rejected: `openspec instructions` is the OpenSpec CLI's surface and services the scaffold role; routing it to a fetched-at-write-time contract inverts the dependency direction and breaks the OpenSpec↔shared-AI boundary.
- **Keep both families without a pin** (the pre-change state) — rejected: nothing detects drift, so each future template edit can silently desync the two families again.

## Consequences

- A template author who needs a one-side-only structural change must now touch both families in the same commit; the parity test fails loudly and names the divergent pair and item when they do not.
- The reconciliation affects future renders only: already-rendered reports in existing `openspec/changes/**` directories keep their current headers and sections; no regeneration or migration is performed.
- The pin covers structure only. Severity vocabularies, verdict phrasing, and review's phase-specific sections remain deliberately distinct, pinned by the `Finding across surfaces` resolution in the project-root `GLOSSARY.md` and by `sai/policies/artifact-review-contract.md`.
