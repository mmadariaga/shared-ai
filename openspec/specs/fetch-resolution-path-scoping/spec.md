# fetch-resolution-path-scoping Specification

## Purpose
Define how the opencode fetch skill resolves `Fetch @<subpath>` directives to exact file paths without any directory-based existence probe, and the positive path-scope invariant shared by both harness variants. The Claude Code resolution rule is owned by `claude-fetch-resolution` and is not restated here.

## Requirements

### Requirement: Opencode fetch resolution reads the project-local exact path first, then the user-global exact path

When resolving a `Fetch @<subpath>` directive, the opencode fetch skill SHALL Read `.opencode/<subpath>` first; when that read fails, it SHALL Read `~/.config/opencode/<subpath>` directly; when that read also fails, it SHALL stop and report: "File not found: <subpath> (checked .opencode/ and ~/.config/opencode/)". The resolution SHALL NOT use Glob, LS, or any directory-based existence probe in either branch — a failed Read carries the same existence signal as a probe result, and every user-global filesystem access names an exact file path under an already-permitted subtree.

#### Scenario: project-local file exists
- **WHEN** `Fetch @sai/policies/prereqs.md` is executed and `.opencode/sai/policies/prereqs.md` exists
- **THEN** the project-local file is Read and its content is used without a second read of the user-global path

#### Scenario: project-local file absent, global file exists
- **WHEN** `Fetch @sai/policies/prereqs.md` is executed, the project-local read fails, and `~/.config/opencode/sai/policies/prereqs.md` exists
- **THEN** the user-global file is Read directly without error

#### Scenario: file missing in both locations
- **WHEN** `Fetch @sai/policies/prereqs.md` is executed and both the project-local and user-global reads fail
- **THEN** the skill stops and reports: "File not found: sai/policies/prereqs.md (checked .opencode/ and ~/.config/opencode/)"
- **AND** the failure report is the sole signal that both roots were checked

#### Scenario: no directory-based probe is performed in either branch
- **WHEN** the opencode fetch skill resolves any `Fetch @<subpath>` directive
- **THEN** neither the rule table nor the worked examples instruct or perform a Glob/LS existence check against the project-local or user-global path
- **AND** the resolution is complete after at most two Read attempts, one per root

### Requirement: Every resolved path begins with sai/, commands/, or skills/ and the root is never named

Both the Claude Code and opencode fetch skills SHALL encode the positive invariant that every path a fetch directive resolves names exactly one file beginning with `sai/`, `commands/`, or `skills/` under the project-local or user-global root, and that the harness root itself is never named: no directory listing of the root, no root-level existence probe, and no glob. A directive names one exact file path; resolution is Read-project-first, Read-global-second. The invariant is a property of resolved paths, not of the directive's literal token: an absolute user-global directive form (e.g. `Fetch @~/.config/opencode/skills/fetch/SKILL.md`) resolves to a path under `skills/` and therefore satisfies it.

#### Scenario: the invariant is stated in both skill variants
- **WHEN** either the Claude Code or opencode fetch skill is read
- **THEN** it states that every resolved path begins with `sai/`, `commands/`, or `skills/` and that the harness root is never named

#### Scenario: the root is never accessed
- **WHEN** a directive such as `Fetch @sai/policies/prereqs.md` is resolved
- **THEN** only the exact file paths `<root>/sai/policies/prereqs.md` are read
- **AND** neither the harness root directory nor any parent of the resolved file is listed, probed, or globbed

#### Scenario: the absolute user-global directive form stays in the namespace
- **WHEN** `Fetch @~/.config/opencode/skills/fetch/SKILL.md` is resolved
- **THEN** its resolved path begins with `skills/` under the user-global root
- **AND** the directive is not treated as a path-scope violation

### Requirement: Out-of-namespace resolution stops before any filesystem access

When a `Fetch @` directive resolves to a path that does not begin with `sai/`, `commands/`, or `skills/` under the project-local or user-global root — or that names a root directory rather than an exact file — the fetch skill SHALL stop and report a path-scope violation BEFORE performing any Read, in both branches. The resolution SHALL NOT attempt the read, so no external-directory permission request can be triggered by directive content. The report SHALL name the directive and the three permitted prefixes.

#### Scenario: a fourth top-level segment is rejected before reading
- **WHEN** a directive such as `Fetch @vendor/notes.md` is encountered, whose resolved path would begin with `vendor/`
- **THEN** the skill stops and reports a path-scope violation naming the directive and the permitted prefixes `sai/`, `commands/`, and `skills/`
- **AND** no Read of `.opencode/vendor/notes.md` or `~/.config/opencode/vendor/notes.md` is attempted

#### Scenario: a directive naming the root is rejected before reading
- **WHEN** a directive such as `Fetch @sai/` is encountered, which names a root directory rather than an exact file
- **THEN** the skill stops and reports a path-scope violation before any filesystem access

### Requirement: Opencode resolution mirrors the Claude rule without restating it

The opencode resolution rule SHALL match the Claude Code rule owned by `claude-fetch-resolution` — the same Read-project-first, Read-global-second mechanics and the same no-broad-search constraint — differing only in the harness root paths (`.opencode` / `~/.config/opencode` vs `.claude` / `~/.claude`) and the corresponding failure-report wording. This capability SHALL NOT restate the Claude Code mechanics; `claude-fetch-resolution` remains their sole normative owner. A divergence between the two harness rules SHALL be treated as a defect.

#### Scenario: the opencode rule mirrors the Claude rule
- **WHEN** the opencode resolution rule is compared with the `claude-fetch-resolution` requirement, element by element: (1) the rule-table semantics — Read-project-first then Read-global-second resolution order, (2) the no-probe constraint (no Glob/LS/directory-based existence check in either branch), (3) the positive invariant sentence (resolved paths begin with `sai/`, `commands/`, or `skills/`; the root is never named), and (4) the failure-report shape ("File not found: <subpath> (checked <project-root>/ and <user-global-root>/)" naming both checked roots)
- **THEN** each compared element is identical between the two harness rules, differing only in the harness-specific root paths (`.opencode` / `~/.config/opencode` vs `.claude` / `~/.claude`) and the root names inside the report wording
- **AND** the comparison is performed as a direct structural read of the two harness skill files against each other, and of the opencode rule against the `claude-fetch-resolution` requirement text — the Claude Code mechanics appear only in `claude-fetch-resolution`, never in a restated copy here
- **AND** a divergence in any compared element is a defect

### Requirement: Opencode skills path resolution uses the skill tool

When the opencode fetch skill encounters `Fetch @skills/<name>/SKILL.md` — with or without the "and follow those instructions exactly" suffix — it SHALL resolve the directive through the `skill` tool with skill name `<name>`, not through a file Read of `skills/<name>/SKILL.md`; the Read-then-Read rule SHALL NOT apply to skills paths. The Claude Code skill-tool mapping remains owned by `claude-fetch-resolution` and is not restated here.

#### Scenario: skills path triggers skill tool
- **WHEN** `Fetch @skills/budget/SKILL.md` is encountered by the opencode fetch skill
- **THEN** the `skill` tool is invoked with name `budget`
- **AND** no file path under `~/.config/opencode/skills/` is read

#### Scenario: skills path with follow directive
- **WHEN** `Fetch @skills/openspec-propose/SKILL.md and follow those instructions exactly.` is encountered by the opencode fetch skill
- **THEN** the `skill` tool is invoked with name `openspec-propose`, then its instructions are followed
