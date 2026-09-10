# sidecar-session-lifecycle Specification

## Purpose
TBD - created by archiving change state-machine-sidecar. Update Purpose after archive.
## Requirements
### Requirement: Runtime baseline

The store CLI tool SHALL run on Node >= 22, SHALL depend only on the Node standard library with no native dependencies, and SHALL ship as a single binary distributed via the current `npx` channel.

#### Scenario: Minimum runtime check

- **WHEN** the store CLI tool starts on a runtime below Node 22 or with a native dependency required
- **THEN** startup is refused with a closed-vocabulary error naming the unmet baseline instead of running in a degraded mode (unchanged principle, CLI-based enforcement)

### Requirement: Cross-platform and harness parity

The store SHALL behave identically on Windows and POSIX from one codebase using local CLI invocation and `TMPDIR`-relative discovery, and SHALL offer identical spawn, use, and close behavior to opencode and Claude Code callers with no harness-specific transport.

#### Scenario: Same flow on both harnesses and OS families

- **WHEN** the `spawn`, `emit`, and `close` sequence runs on Windows and POSIX under opencode and Claude Code
- **THEN** every step succeeds with the same envelope, discovery mechanism (deterministic id from key), and exit behavior in all four combinations (unchanged principle, CLI-based execution)

