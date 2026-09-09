## MODIFIED Requirements

### Requirement: Installable sidecar modules

The sidecar's modules (registry, envelope, and machines) SHALL ship with the distributed package, and the installer SHALL project them alongside the binary to a managed destination where the installed binary executes without module-resolution errors. Packaged machines SHALL include `sai-state/machines/explore-idea.js` and `sai-state/machines/explore-slice.js` and SHALL NOT require `sai-state/machines/explore-stage.js`.

#### Scenario: Installed binary executes with full module tree

- **WHEN** a consumer installs the `shared-ai` package and invokes the projected sidecar binary at its installed location
- **THEN** the binary executes, reaches its argument-handling logic, and does not fail with a module-not-found error

#### Scenario: npm pack output includes sidecar modules

- **WHEN** `npm pack --dry-run --json` is run on the repository
- **THEN** the output contains `sai-state/registry.js`, `sai-state/envelope.js`, `sai-state/machines/explore-idea.js`, and `sai-state/machines/explore-slice.js`
