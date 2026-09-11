# prerequisite-preflight Specification

## Purpose
TBD - created by archiving change extract-prereqs-preflight-tool. Update Purpose after archive.
## Requirements
### Requirement: Deterministic prerequisite preflight tool

A deterministic Node tool at `sai/tools/prereqs.js` SHALL evaluate the three OpenSpec preconditions — the `openspec` binary availability check (`cli`), the `openspec/` directory existence check (`dir`), and the `openspec/config.yaml` `schema: sai-workflow` check (`schema`) — and report a structured verdict. It SHALL expose exactly one sub-command, `check`, accept `--json` and `--cwd <dir>`, and MUST NOT require any consumer to re-derive a check from prose.

The output contract SHALL be closed and aligned with the established `sai/tools/*.js` precedent: JSON on stdout under `--json`, and exit code 0 when every check passed (payload `verdict: pass`), 1 when a check failed (payload `verdict: halt` carrying `failed_check`, `reason`, and a factual `message`), and 2 for a usage error or IO failure reported on stderr.

The `cli` check SHALL probe the binary by running `openspec --version` and reading its exit status, and MUST NOT use a platform-specific location mechanism such as `where` or `which`. The `schema` check SHALL match `openspec/config.yaml` against `/^schema:\s*sai-workflow\s*$/m`.

#### Scenario: every precondition holds
- **WHEN** `node <tool-path> check --json --cwd <project-root>` runs in a project where the `openspec` binary answers `openspec --version`, `openspec/` exists as a directory, and `openspec/config.yaml` carries a line matching `^schema:\s*sai-workflow\s*$`
- **THEN** the tool writes a JSON payload with `verdict: pass` and `failed_check: null` to stdout and exits 0

#### Scenario: a failed check yields a halt verdict
- **WHEN** the `openspec/` directory is absent from the project root and every earlier check passed
- **THEN** the tool writes a JSON payload with `verdict: halt`, `failed_check: "dir"`, `reason: "openspec-dir-missing"`, and a factual `message` to stdout and exits 1

#### Scenario: a usage or IO error is never a verdict
- **WHEN** the tool is invoked with an unknown sub-command, an unknown flag, a stray positional argument, or a `--cwd` directory that does not exist
- **THEN** it reports the error on stderr, writes no verdict to stdout, and exits 2

### Requirement: Ordered evaluation with a single reported failure

The `check` sub-command SHALL evaluate the preconditions in the fixed order `cli`, then `dir`, then `schema`, and SHALL stop at the first failing check. The halt payload SHALL name exactly that one check in `failed_check`, so the caller receives one precondition to remediate rather than a set. The payload SHALL carry a `checks` array recording each check that was evaluated, including the ones that passed.

#### Scenario: the first failure decides the verdict
- **WHEN** the `openspec` binary is unavailable in a project that also has no `openspec/` directory
- **THEN** the payload reports `failed_check: "cli"` and the `dir` and `schema` checks are not evaluated

### Requirement: Caller-owned remediation phrasing

The tool SHALL report which check failed and what it observed, and MUST NOT carry, embed, or emit any remediation text. The three STOP-and-print literals SHALL remain owned by the consuming policy and SHALL NOT appear anywhere in the tool's output. A consumer SHALL map the payload's `failed_check` value to its literal and print that literal verbatim, with no prefix, suffix, summary, or rephrasing.

#### Scenario: no remediation literal crosses the tool boundary
- **WHEN** any check fails and the halt payload is serialized
- **THEN** the serialized payload contains none of the three remediation literals defined in `sai/policies/prereqs-check.md`

### Requirement: Windows shell hop for the CLI probe

On `win32` the `openspec --version` probe SHALL run through a shell, because an npm-installed `openspec` is a `.cmd` shim that a direct process spawn cannot execute. On every other platform the probe SHALL spawn the binary directly with no shell. The probe's arguments SHALL remain fixed literals so the shell hop introduces no quoting hazard.

#### Scenario: an npm-installed CLI on Windows is not reported as missing
- **WHEN** the tool runs the `cli` check on `win32` against an `openspec` installed by npm as a `.cmd` shim
- **THEN** the probe executes through a shell and the check passes, rather than failing with a spawn `ENOENT`

### Requirement: Policy and delegation prompt run the tool instead of the checks
`sai/commands/explore/body.md` SHALL run one direct invocation of `sai/tools/prereqs.js` `check` inline in the main session with no subagent and no deferral condition, using the first existing verbatim tool-path candidate and the byte-identical literal `node <tool-path> check --json --cwd <project-root> --require-openspec-skills <harness>`. It SHALL report what the tool returned without re-deriving, second-guessing, or repairing a check and without self-correcting a non-zero failure. Exit 0 SHALL be relayed as `verdict: pass`, exit 1 as `verdict: halt` with the tool's `failed_check` and the matching verbatim literal, and exit 2, unlocatable tool, or unparseable payload SHALL be reported as an incomplete check with no literal, never as `verdict: pass` and never as a halt with an invented literal.

#### Scenario: inline tool run replaces delegated run
- **WHEN** the explore prerequisite preflight executes after the change
- **THEN** the main session performs one inline tool run with the byte-identical invocation and direct trichotomy

#### Scenario: a tool failure is never reported as a pass
- **WHEN** the tool exits 2, cannot be located, or returns an unparseable payload
- **THEN** the main session reports it as an incomplete check directly with no remediation literal, never as verdict pass and never as a halt with an invented literal

#### Scenario: the policy names the tool rather than the mechanics
- **WHEN** sai/policies/prereqs-check.md is read
- **THEN** it directs the reader to run the byte-identical inline tool invocation and print the mapped literal, and instructs them not to run the checks themselves, not to second-guess a verdict, and not to repair one

