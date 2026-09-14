# session-state-lifecycle Specification

## Purpose
TBD - created by archiving change rename-sidecar-to-stage-machine. Update Purpose after archive.
## Requirements
### Requirement: Runtime baseline
The store CLI tool SHALL be a Node standard-library-only script (`bin/sai-state.js`) with no native dependencies. It SHALL NOT enforce a minimum Node 22 startup gate and SHALL NOT ship as a single binary via an `npx` channel; the implemented entry point is the repository script invoked with `node`.

#### Scenario: Minimum runtime check
- **WHEN** the store CLI tool starts on any supported Node runtime as a plain script `bin/sai-state.js`
- **THEN** startup proceeds without a closed-vocabulary baseline refusal and without binary distribution semantics; no minimum Node 22 gate is enforced and no single binary is shipped

### Requirement: Cross-platform and harness parity

The store SHALL behave identically on Windows and POSIX from one codebase using local CLI invocation and `TMPDIR`-relative discovery, and SHALL offer identical spawn, use, and close behavior to opencode and Claude Code callers with no harness-specific transport.

#### Scenario: Same flow on both harnesses and OS families

- **WHEN** the `spawn`, `emit`, and `close` sequence runs on Windows and POSIX under opencode and Claude Code
- **THEN** every step succeeds with the same envelope, discovery mechanism (deterministic id from key), and exit behavior in all four combinations (unchanged principle, CLI-based execution)

