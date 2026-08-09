**Complexity**: medium

## Why

`bin/setup.js` currently combines setup orchestration, prompts, process termination, and readline ownership, which makes the flow difficult to test and extend without changing behavior. This change prepares a post-setup extension seam before interactive menu behavior is introduced and keeps the readline resource valid through that seam.

## What Changes

- Refactor setup orchestration behind exported CommonJS functions with injected dependencies, including an optional post-setup workflow.
- Invoke the supplied workflow only after schema templates have been copied, while doing nothing when no workflow is supplied.
- Keep readline open until all setup work and the optional post-setup workflow finish, then close it through one lifecycle boundary.
- Move process-status handling to the command boundary so the functional setup seams do not terminate the process directly.
- Preserve the existing setup sequence, prompts, output, failure behavior, and module guard; do not display a new menu in this change.

## Capabilities

### New Capabilities

- `setup-post-run-hooks`: Provide an optional, injected post-setup workflow seam with testable orchestration and lifecycle ownership.

### Modified Capabilities

- None.

## Impact

- `bin/setup.js`: setup orchestration, exported functional seams, injected post-setup workflow, readline lifetime, and outcome handling.
- `bin/install.js`: command-boundary handling of the setup outcome without moving setup behavior into the dispatcher.
- `test/install-codegraph.test.js`: setup seam and lifecycle coverage following the repository's existing dependency-injection test pattern.
- No new dependencies, agent files, or user-facing menu behavior.

## Proposal Research Documentation

**Local files**: `bin/setup.js`; `bin/install.js`; `bin/install-flow.js`; `test/install-codegraph.test.js`; `openspec/specs/setup-subcommand/spec.md`; `openspec/specs/setup-codegraph-index-bootstrap/spec.md`; `openspec/specs/schema-copy/spec.md`; `openspec/specs/installer-codegraph-cli-bootstrap/spec.md`; `openspec/changes/add-fake-agent-customization-menu/specs/agent-customization-menu/spec.md`; `GLOSSARY.md`

**External URLs**: None.

## Additional Notes

- The default post-setup workflow is a no-op, so this enabling refactor has no new menu or prompt.
- The workflow must receive the active setup context needed for future interactive work, including the resolved project path and live readline resource, without owning readline creation or closure.
- The existing `add-fake-agent-customization-menu` change is a downstream consumer candidate; this change defines only the seam and must not duplicate its menu contract.
- Existing required setup behavior remains authoritative: openspec initialization and schema updates still stop the flow as before, while optional post-setup work must not alter the existing setup messages or step order.
