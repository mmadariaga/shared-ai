# ADR 0104: Remove Copilot from the active installer inventory

<!-- adr-index: pair-with 0103 -->

## Status

Accepted

## Context

`npx shared-ai` derives install, doctor, and uninstall inventories from the
same manifest. Retaining Copilot paths after retiring its inline consumer
would leave unsupported projections or invite a cleanup-only runtime.

## Decision

Remove Copilot harness identities, destinations, projections, detection, and
enumeration from the active `npx shared-ai` inventory. Do not add a legacy
sweeper or alternate Copilot resolver. Preserve ownership-safe retirement
records only for the supported Claude Code and opencode projections.

## Alternatives Considered

- Keep a cleanup-only Copilot sweeper: rejected because it would preserve an
  unsupported path and add destructive surface area.
- Retain Copilot as an inactive manifest target: rejected because install,
  doctor, and uninstall must have one active two-harness inventory.

## Consequences

Existing Copilot users must run the current uninstall command before
upgrading. Skipping that migration may leave orphaned Copilot files, which the
new installer intentionally does not clean up.

## Provenance

User decision recorded in the `retire-inline-harness-model` design.
