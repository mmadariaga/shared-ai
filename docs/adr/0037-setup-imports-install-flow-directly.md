# ADR 0037: `setup.js` imports the shared CodeGraph offer directly from `install-flow.js`

## Status

Accepted

## Context

`bin/setup.js` currently imports nothing from `bin/install-flow.js`. The `codegraph-install-offer` change needs to reuse the shared `offerCodegraphInstall()` helper in both files: `install-flow.js` (global install flow) and `setup.js` (per-project setup, as a soft prerequisite before `codegraph init`).

Extracting the helper into a third shared module would avoid creating a new dependency edge between the two `bin/` scripts, but it would also add a new file and a new require graph for a single function.

## Decision

`setup.js` adds `const { offerCodegraphInstall, probeCodegraph } = require('./install-flow.js');` and consumes the shared helper directly. No new shared module is introduced. The only exported symbols consumed are `offerCodegraphInstall` and `probeCodegraph`.

## Alternatives Considered

- **Extract the offer into a third shared module both files import**: avoids the `setup.js → install-flow.js` dependency edge, but is premature — both files are `bin/` siblings in the same CommonJS package, and a single direct require is the lightest change that satisfies "one shared helper, no duplication." Rejected.
- **Duplicate the offer logic inside `setup.js`**: violates the DRY principle and the spec's "single shared helper" requirement. Rejected.
- **Direct `require('./install-flow.js')`** (chosen): single source of the offer, zero new files, minimal coupling.

## Consequences

- A single direct `require` edge now exists between two `bin/` scripts in the same package.
- Future relocations of the helper must update both `require` sites.
- The dependency is narrow: only `offerCodegraphInstall` and `probeCodegraph` are consumed.

## Related

- `openspec/changes/codegraph-install-offer/design.md` — Decision D4
- `openspec/changes/codegraph-install-offer/specs/setup-codegraph-index-bootstrap/spec.md` — capability spec
- `openspec/changes/codegraph-install-offer/interfaces.md` — import contract
