# ADR 0110b: Additive-then-retire decomposition for the tunable-seed strategy switch

## Status

Accepted

## Context

The `agent-projection-seed-on-create` change replaces the `owned-copy` install
strategy with `tunable-seed` for all 14 managed agent projections. The
strategy token is the shared coupling point: doctor, uninstall, the installer
dispatch, and several test files all read the manifest's `strategy` field, so
the moment the manifest flips the token, every consumer must flip with it or
the suite goes red. The change also retires the legacy Claude worker migration
module (`bin/managed-worker-migration.js`), which is consumed only by
`migrateLegacyClaudeWorkers` in `bin/install-flow.js` and
`inspectManagedWorkerMigration` in `bin/doctor.js` and has no coupling to the
strategy switch.

## Decision

The change lands in three commits, sequenced as an additive introduction
followed by two independent retirements:

1. **Additive introduction** — `tunable-seed` is introduced alongside
   `owned-copy`: new installer function, new validation entry, new dispatch
   route, and new-capability tests. The manifest stays on `owned-copy`, so no
   existing behavior changes and the existing suites stay green.
2. **Independent migration retirement** — the legacy Claude worker migration
   module and its callers are removed in their own commit, decoupled from the
   strategy switch.
3. **Atomic strategy switch** — the manifest's 14 rules flip to
   `tunable-seed`/`managed`, doctor and uninstall are adapted to the
   body-and-non-tunable identity rule, `owned-copy` is retired from the
   validation set and the dispatch (throwing, not aliasing), the owner-sidecar
   machinery is removed, and the affected existing tests are rewritten. This
   step is one atomic commit because doctor, uninstall, the installer
   dispatch, and the sidecar-asserting tests all key off the manifest's
   `strategy` token and break the moment it flips; they cannot be sequenced
   separately without leaving an intermediate commit with the suite red.

## Alternatives Considered

- A five-step strategy-agnostic transition that would decompose the switch
  further by parameterizing the consumers: rejected because it adds
  transitional scaffolding (strategy-agnostic dispatch paths, compatibility
  shims) that the change does not ask for and would have to be removed after
  the switch.
- Flipping the manifest and all consumers in one commit from the start:
  rejected because it would force the new-strategy tests and the legacy
  migration removal to share a single commit, obscuring two independent
  retirements behind one atomic switch.

## Consequences

Steps 1 and 2 are independently buildable and reviewable, and the atomic
Step 3 keeps every intermediate commit green under the atomic-buildable-commits
rule. The cost is that Steps 1–3 are a planning decomposition, not a release
boundary: no user installs an intermediate commit, so the Step 1
shape-guarded sidecar unlink runs against zero projections until the manifest
actually switches in Step 3.

## Provenance

Derived decision recorded in the `agent-projection-seed-on-create` design
(Decision 1).
