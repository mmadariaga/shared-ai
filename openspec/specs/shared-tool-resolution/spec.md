# shared-tool-resolution Specification

## Purpose
Keep SAI tool-copy selection deterministic across Claude Code and opencode while preserving each consuming gate's declared missing-tool behavior.

## Requirements

### Requirement: Shared tool resolution order

The system SHALL resolve every `sai/tools/*.js` copy by taking the first existing candidate per harness, checked with a tool that returns the path it found and never composed from a root string, with the opencode XDG fallback only when neither listed candidate exists. The first existing copy wins and defines the version. A project-local candidate SHALL run exactly as written, relative to the working directory. A global candidate, including the opencode XDG fallback, SHALL run as the absolute path the existence check returned, with backslashes turned into forward slashes and the whole path double-quoted (`node "<absolute path>"`), so the `~` text never reaches the shell. The installed instruction files SHALL keep their `~` candidate lists. The same rule SHALL apply to `prereqs.js` in `sai/policies/prereqs-check.md` and to the cache-warming `<wait-path>` in `sai/policies/cache-warming.md`. If no candidate exists the system SHALL name the tried candidates and stop with no prose fallback, except when the consuming instruction explicitly declares its gate optional on a missing tool; then only that gate is skipped, without replacing the check in prose.

#### Scenario: Resolve tool copy

- **WHEN** a command needs `sai/tools/<name>`
- **THEN** it uses the first existing per-harness candidate and stops with named candidates when none exists, unless the consuming instruction explicitly declares the missing-tool exception for that gate

#### Scenario: Optional gate declares a missing-tool exception

- **WHEN** an instruction explicitly permits skipping its named gate if no tool candidate exists
- **THEN** it names the tried candidates, skips only that gate, and performs no prose replacement check

#### Scenario: Global candidate runs from the returned absolute path

- **WHEN** the first existing candidate is a global `~/...` candidate on Claude Code or opencode
- **THEN** the agent runs `node "<absolute path>"` with the path the existence check returned and its backslashes turned into forward slashes, in Bash and PowerShell 7 alike

#### Scenario: Project-local candidate runs as written

- **WHEN** the first existing candidate is `.claude/sai/tools/<name>` or `.opencode/sai/tools/<name>`
- **THEN** the agent runs it exactly as written, relative to the working directory

### Requirement: Byte-identical invocation after resolution

The system SHALL keep each tool's own accepted flag set unchanged after resolution and SHALL NOT change invocation semantics beyond path resolution. The invocation SHALL keep one form within one harness, so the installed permission rules cover it with a rule for the project-local form, the `~` form, and the absolute form of this install.

#### Scenario: Invoke resolved copy

- **WHEN** a resolved tool copy is invoked
- **THEN** the invocation is byte-identical apart from the resolved path

### Requirement: Extended Apply invocation preserves required execution references

Shared tool-resolution instructions SHALL describe Apply's accepted preflight, baseline, dispatch-check, inspect, restore-unrelated-index, checkpoint-plan, verify, and close invocation forms for both Claude Code and opencode.

Baseline SHALL require the coordinator's stable run identity and exact planning paths on stdin. Dispatch-check SHALL require baseline, Step, and dispatch kind. Verify SHALL require those references plus the retained checkpoint and field-8 paths, unless explicit baseline-only compatibility mode is used. Close SHALL require baseline and explicit guard-base even for dry-run or mark-only. Later calls SHALL carry settled state when present; close MAY carry the authorized coordinator plan checkpoint.

These forms SHALL preserve existing per-harness copy resolution and one-JSON-object output. Resolution SHALL not relax required flags or change business-rule ownership.

#### Scenario: Close authorization is declined
- **WHEN** the coordinator invokes mark-only through the resolved tool
- **THEN** the invocation still carries the immutable baseline and explicit current guard reference

#### Scenario: Both harnesses invoke preflight
- **WHEN** Claude Code or opencode resolves the installed Apply tool for plan validation
- **THEN** it invokes the same read-only preflight form apart from the resolved tool path

### Requirement: Decision-record inventory invocation form

Shared tool-resolution instructions SHALL declare the `decision-records.js` invocation as `node <tool-path> inventory --family <adr|ddr> --json --cwd <project-root>`, printing one JSON object with `index_exists`, `records`, `next_number`, and `duplicates` read from `docs/<family>/` and its `archive/` on disk. The form SHALL be the same for Claude Code and opencode apart from the resolved tool path.

#### Scenario: Both harnesses invoke the inventory

- **WHEN** Claude Code or opencode resolves the installed `decision-records.js` copy
- **THEN** it invokes the same `inventory --family <adr|ddr> --json --cwd <project-root>` form apart from the resolved tool path

### Requirement: Risk-signals invocation form

Shared tool-resolution instructions SHALL declare the `risk-signals.js` invocation as `node <tool-path> compute --parent <branch> [--cwd <project-root>]`, printing one JSON object with `status: ok` and the merge-base, fingerprint, and floors, or `status: blocked` with a `message`. The form SHALL be the same for Claude Code and opencode apart from the resolved tool path.

#### Scenario: Both harnesses invoke the risk signals
- **WHEN** Claude Code or opencode resolves the installed `risk-signals.js` copy
- **THEN** it invokes the same `compute --parent <branch> [--cwd <project-root>]` form apart from the resolved tool path
