# ADR 0036: Bundle CodeGraph CLI install and MCP wiring into a single boolean-returning runner

## Status

Accepted

## Context

CodeGraph is a three-step tool: (1) `npm i -g @colbymchenry/codegraph` installs the CLI, (2) `codegraph install` wires the MCP into every agent it auto-detects, and (3) `codegraph init` builds the per-project index. Steps 1 and 2 are global setup steps that must always run together — the CLI alone is inert until the MCP is wired.

The `codegraph-install-offer` change introduces `runCodegraphInstall()` to execute both steps automatically when the user confirms an interactive offer. The helper must be non-blocking (no `process.exit`) and must degrade gracefully to printing manual commands on failure.

## Decision

`runCodegraphInstall()` returns a single boolean that represents the success of the **entire two-step bundle**. It runs the CLI install command first; only if that succeeds does it run the MCP wiring command. If the CLI install fails, step 2 is skipped and the helper returns `false`. The caller (`offerCodegraphInstall()`) prints **both** exact manual commands whenever `runInstall()` returns `false` (or the offer is declined, or no TTY is present).

## Alternatives Considered

- **Two separate injectable runners (`runCli`, `runMcp`)**: more surface area, and the spec treats the pair as one bundled action. Rejected.
- **Run step 2 even if step 1 failed**: pointless — the binary would not exist yet. Rejected.
- **Exit or throw on failure**: violates the non-blocking requirement that CodeGraph paths must never abort the installer. Rejected.
- **Single `runCodegraphInstall()` → boolean, step-2 gated on step-1 success, caller prints both manual commands on any falsy result** (chosen): mirrors `runOpencodeInstall`'s single-boolean shape while honoring the bundled-steps and non-blocking requirements.

## Consequences

- The failure contract is coarse: a single boolean cannot distinguish CLI-install failure from MCP-wiring failure. This is accepted because the fallback behavior is identical in both cases (print both commands).
- Tests assert against the boolean return value and against the exact printed commands, not against intermediate state.
- Future runners that need per-step observability would require refactoring this signature.

## Related

- `openspec/changes/codegraph-install-offer/design.md` — Decision D2
- `openspec/changes/codegraph-install-offer/specs/installer-codegraph-cli-bootstrap/spec.md` — capability spec
- `openspec/changes/codegraph-install-offer/interfaces.md` — `runCodegraphInstall()` signature
