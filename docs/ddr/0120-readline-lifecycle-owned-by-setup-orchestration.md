# DDR 0120: Readline lifecycle owned by setup orchestration, closed once at the settle point

## Status

Accepted

## Context

`bin/setup.js` creates the readline interface in `main` and closes it inline before every early exit. On the completion path it closes readline (line 139) *before* `copySchemaTemplates` runs (line 140). The post-setup seam (`prepare-setup-menu-seam`) requires the interface to remain open and usable through the injected post-setup workflow, and the workflow must receive the live interface as setup context without owning its creation or closure.

## Decision

Setup creates the readline through the injected `createReadline` factory and owns its lifetime. The completion path holds the interface open through schema-template copying *and* the awaited workflow; the single close happens after both settle — including when the workflow rejects, closing readline before propagating `post-setup-failure`. Early abort/failure paths close the interface before returning their outcome and never invoke the workflow. The injected workflow receives `{ projectPath, readline }` with the live interface and never owns creation or closure.

## Alternatives Considered

- **Let the workflow create/own its own readline** — rejected: the spec pins ownership in the setup orchestration; the future menu must reuse the same interface.
- **Close readline before the seam** (the current behavior at line 139) — rejected: the spec requires the interface to remain open and usable through post-setup work.

## Consequences

The downstream `add-fake-agent-customization-menu` change depends on the seam context shape `{ projectPath, readline }` with the interface live; the exactly-once close at the settle boundary is testable through fake interfaces that record `close` calls. This record is a DDR because readline validity through the seam and the exactly-once close are properties that must hold of the setup behavior at all times, stated as properties of the domain rather than as the mechanism that upholds them.

## Provenance

User — the proposal ("Keep readline open until all setup work and the optional post-setup workflow finish, then close it through one lifecycle boundary") and the spec scenarios state the ownership and closure contract.
