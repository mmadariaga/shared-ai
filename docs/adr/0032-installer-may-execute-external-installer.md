# ADR 0032: Installer may execute an external installer

## Status

Accepted

## Context

The SAI installer copies command wrappers, skills, and instructions into the user's global configuration directories (`~/.claude/`, `~/.config/opencode/`, `~/.copilot/`). The Opencode branch previously assumed the `opencode` CLI was already present on PATH. On a fresh machine, the file-copy succeeds while the consuming tool is missing — a silent half-wired state.

The `installer-offer-opencode-cli` change adds binary detection and an interactive install offer to the Opencode branch.

## Decision

The installer may now execute a third-party install command (`npm i -g opencode-ai@latest`) when all of the following hold:

1. The user has selected the Opencode target.
2. The `opencode` binary is absent from PATH (detected via a Windows-safe `spawnSync` probe).
3. A TTY is present (`process.stdin.isTTY` is truthy).
4. The user explicitly confirms the `Install opencode now? [y/n]` prompt with an affirmative answer.

Without a TTY (CI, piped, non-interactive), the installer prints the exact command and does not execute anything. When the install command fails or the user declines, the installer prints the exact manual command and continues — the file-copy always runs, and the installer never aborts on this path.

The probe uses `spawnSync('opencode', ['--version'], { shell: true })` so that Windows `PATHEXT` / `.cmd` shim resolution works correctly; a bare `spawnSync` without `shell: true` throws `ENOENT` on Windows for global npm `.cmd` shims and would misclassify an installed binary as absent.

## Alternatives Considered

- **Print-only, never execute**: simplest and safest, but leaves the user to manually run the command. Rejected because the interactive installer already has the user's attention, and a single confirm step is low friction.
- **Execute unconditionally when absent**: would break CI and non-interactive installs. Rejected.
- **Interactive `y/n` + TTY gate, with print-only fallback** (chosen): preserves user control, CI safety, and non-blocking behavior.

## Consequences

- The installer now has a small execution surface gated behind two interactive guards (TTY + explicit confirm).
- `child_process` (Node built-in) is required; no new npm dependency is added.
- Future harnesses that need similar bootstrapping should follow the same pattern: probe → TTY check → confirm → execute, with print-only fallback.

## Related

- `openspec/changes/installer-offer-opencode-cli/design.md` — Decisions D1–D5
- `openspec/changes/installer-offer-opencode-cli/specs/installer-opencode-cli-bootstrap/spec.md` — capability spec
- ADR 0031 — format precedent for ADRs in this project
