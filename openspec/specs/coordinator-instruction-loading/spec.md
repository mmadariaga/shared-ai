# coordinator-instruction-loading Specification

## Purpose
TBD

## Requirements

### Requirement: Routed Claude coordinators resolve their installed instruction chain

The six routed Claude Code coordinator wrappers for design, implementation, review, security, performance, and accessibility SHALL use the read-capable, non-writing tool scope defined by the `per-command-tool-scoping` capability. That scope SHALL permit the coordinator to resolve its own coordinator contract and worker binding after installation.

#### Scenario: Freshly installed coordinator loads its contract and binding

- **WHEN** one of the six routed Claude Code coordinator commands runs from an installed project
- **THEN** its `Fetch @sai/commands/.../coordinator.md` instruction can resolve through the available `Glob` and `Read` tools
- **AND** its direct `Fetch @sai/orchestration/workers/bindings/{phase}-worker.md` instruction can resolve through the same installed instruction root
- **AND** the coordinator does not need to read project code, git state, configuration, or change artifacts to load those instructions

#### Scenario: Installed resolution is observed outside the source tree

- **WHEN** a test installs the Claude projections into a temporary Claude root outside the repository and resolves a routed coordinator's non-skill fetch references against that root using only the `Glob` and `Read` operations permitted by the scoped wrapper
- **THEN** the coordinator contract and direct worker binding resolve to files under the temporary install root
- **AND** the resolution does not depend on the shared-ai repository being the current working directory

#### Scenario: Coordinator instruction loading does not require mutation tools

- **WHEN** any of the six routed Claude Code coordinators resolves its own instruction chain
- **THEN** the operation completes without requiring `Edit`, `Write`, or bare `Bash`
- **AND** restoring the read tools does not grant a project mutation path

### Requirement: Routed non-skill resolution is satisfiable through Read

The Claude Code and opencode non-skill fetch resolver instructions SHALL name `Read` for the project-local `.claude/` or `.opencode/` candidate first and SHALL name `Read` for the user-global fallback second, and SHALL NOT name `Glob`, `LS`, or any directory-based existence probe in either branch. The routed resolver contract SHALL not define a compatibility-harness branch.

#### Scenario: Read is sufficient for candidate selection

- **WHEN** a Claude Code or opencode routed wrapper resolves a non-skill `@sai/...` reference
- **THEN** the project-local `.claude/` or `.opencode/` candidate is consumed using the `Read` operation
- **AND** a failed project-local read selects the user-global fallback, which is consumed using `Read`
- **AND** resolution does not require `Glob`, `LS`, or any directory-based existence probe

#### Scenario: Runtime fetch instructions match the permitted scope

- **WHEN** `skills/claude/fetch/SKILL.md` or `skills/opencode/fetch/SKILL.md` is loaded for a routed wrapper
- **THEN** its non-skill path rule names `Read` for both the project-local candidate and the user-global fallback
- **AND** it does not instruct the caller to use `Glob`, `LS`, or any directory-based existence probe

#### Scenario: Routed fetch resolution has no compatibility branch
- **WHEN** a supported routed wrapper resolves a non-skill `@sai/...` reference
- **THEN** it SHALL use `Read` for the project-local and user-global candidates
- **AND** it SHALL not require a compatibility-harness candidate-check branch

### Requirement: Coordinator instruction loading preserves harness boundaries

The installed binding destination SHALL remain `sai/orchestration/workers/bindings/{phase}-worker.md`, with the harness-specific Claude or opencode source selected by the install manifest. The change SHALL NOT add any non-routed worker binding or change any worker contract or binding prompt text.

#### Scenario: Claude and opencode resolve their own binding source

- **WHEN** a Claude Code or opencode routed wrapper fetches its phase binding from an installed projection
- **THEN** the destination path is the same harness-neutral binding path
- **AND** the content comes from that harness's existing binding source
- **AND** the binding's dispatch and continuation behavior is unchanged

#### Scenario: Unsupported compatibility binding is absent
- **WHEN** supported harness command projections are installed or inspected
- **THEN** no non-routed worker binding proxy or direct routed binding is added
- **AND** the installed inventory contains only the Claude Code and opencode binding sources
