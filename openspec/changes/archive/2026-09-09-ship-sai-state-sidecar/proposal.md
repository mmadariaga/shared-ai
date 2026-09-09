> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation. It describes a decision already made, not one being proposed.

**Complexity**: medium (1 capability, 1 requirement, S5=3)

## Why

The `sai-state` sidecar binary was broken on installation: the binary existed in the distributed package but its three required modules (`registry.js`, `envelope.js`, and the `machines/` subdirectory) were missing from npm's published artifact, and the installer projected only the binary with no dependencies. The result was that running the installed copy failed immediately with `Error: Cannot find module '../sai-state/registry.js'`. Two independent omissions caused the breakage: `package.json` did not list `sai-state` under `files`, so npm never published the modules; and `sai/install-manifest.json` projected only `bin/sai-state.js` with `recursive: false`, so the installer copied the binary and none of its dependencies. The change that introduced the sidecar was reviewed as complete because every review compared the proposal against the repository source; nobody ran what installation produces.

## What Changes

- Add `sai-state` to the `files` array in `package.json` so npm publishes the three sidecar modules (`envelope.js`, `registry.js`, and `machines/` directory) alongside the binary.
- Add a new projection rule to `sai/install-manifest.json` (id `sai-state`, source `sai-state`, destination `sai/sai-state`, strategy `copy`, `recursive: true`) so the installer copies the complete module tree to the managed location, mirroring the repository layout under the harness root.
- Add acceptance tests that install to a temporary destination and execute the projected binary, and that verify `npm pack --dry-run --json` includes the sidecar modules. These tests exercise the installed and packed artifacts rather than the repository copy, catching the breakage that prior review missed.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `sidecar-session-lifecycle`: The sidecar's executable form is now installable and the installed binary runs without module-resolution errors.

## Impact

- `package.json` — the `files` array now includes `sai-state`.
- `sai/install-manifest.json` — new `sai-state` projection rule added.
- `test/sai-state.test.js` — two new acceptance tests: one that executes the projected binary after installation, one that verifies npm pack output contains the modules.

## Proposal Research Documentation

**Local files**:
- `bin/sai-state.js` — lines 9–10, the `require()` statements for `../sai-state/registry.js` and `../sai-state/envelope.js` that define the dependency.
- `package.json` — the `files` array and `bin` entry.
- `sai/install-manifest.json` — the `projections` array and existing `sai-state-bin` projection.
- `sai-state/` — the three modules and subdirectories that must ship with the package.

**External URLs**:
- None.

## Additional Notes

- The binary's `require()` statements remain unchanged; the fix does not rewrite requires to absolute or resolved paths, keeping source and installation layouts identical.
- The projection destination `sai/sai-state/` mirrors the repository path `sai-state/` so that from the projected binary at `sai/bin/sai-state.js`, the relative require `../sai-state/` resolves to `sai/sai-state/`.
- Tests run against installed and packed artifacts, not the repository copy, so the acceptance suite now catches this class of breakage.
- The fix requires both halves in one change: publishing modules to npm without projecting them still leaves the installed binary broken; projecting without publishing also fails.
- The projection is recursive, so `machines/explore-stage.js` ships, not just the two top-level modules.
- `doctor` and `uninstall` now enumerate the new projection without reporting an orphan or phantom destination.
- The acceptance test executes the projected binary from an install destination, not the repository copy, confirming the fix works in the deployed form.
