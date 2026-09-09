# prereq-preflight-skills-check Specification

## Purpose
TBD - created by archiving change prereqs-openspec-skills-check. Update Purpose after archive.
## Requirements
### Requirement: Mandatory harness selector on the check sub-command

The `sai/tools/prereqs.js` `check` sub-command SHALL require a `--require-openspec-skills` flag whose value is exactly `opencode` or `claude`, and omitting the flag or passing any other value SHALL be a usage error exiting 2 — never a halt verdict and never a defaulted check run.

#### Scenario: Missing or invalid harness selector is refused as a usage error
- **WHEN** `check` is invoked without `--require-openspec-skills`, with its value omitted, or with any value other than `opencode` or `claude`
- **THEN** the tool exits 2 with the usage text, prints no verdict on stdout, and no prerequisite check executes

### Requirement: Skills presence check as the fourth preflight condition

The OpenSpec prerequisite preflight SHALL include a `skills` check that runs only after the `cli`, `dir`, and `schema` checks pass, preserving first-failure-stops across checks, and SHALL verify that the three required OpenSpec skills (`openspec-explore`, `openspec-propose`, `openspec-archive-change`) are installed at the active harness's project-local skills root — `<cwd>/.opencode/skills/` when the harness is `opencode` and `<cwd>/.claude/skills/` when it is `claude`, with no user-global or XDG fallback — where "installed" means the `<name>/SKILL.md` file exists (the file is stat'd, not the directory), and the verification is presence-only with no version, drift, or content validation.

#### Scenario: Project-local skill file presence decides the check
- **WHEN** `check` runs with a valid harness value on a project whose first three checks pass and every required skill's `SKILL.md` file exists under that harness's project-local skills root
- **THEN** the `skills` check passes with an empty missing list and the tool reports `verdict: pass`
- **WHEN** a required skill's directory exists but its `SKILL.md` file does not, or the skill is present only in the other harness's root or a user-global location
- **THEN** that skill counts as missing

### Requirement: Fast-track cannot bypass or weaken the skills check

The `skills` check SHALL NOT be bypassable or weakenable by any fast-track signal: the tool accepts no bypass input of any kind, and the check runs in full whenever the flagged preflight runs.

#### Scenario: A fast-track invocation still evaluates the skills check
- **WHEN** `check` runs with a valid harness value under an active fast-track signal
- **THEN** the `skills` check executes with the same presence-only semantics and the same halt behavior as any other flagged run — no flag, option, or invocation shape skips or relaxes it

### Requirement: Prerequisite-exempt commands gain no skills check

`sai-commit`, `sai-merge`, `/sai-worktree`, and `/sai-retire-docs` SHALL gain no skills check and no prerequisite preflight change from this capability: they keep their documented exemption of no preflight and no fourth check.

#### Scenario: Exempt commands remain outside the preflight
- **WHEN** one of the four prereq-exempt commands runs
- **THEN** no `sai/tools/prereqs.js` `check` invocation is required of it and the `skills` check is never evaluated for that command

