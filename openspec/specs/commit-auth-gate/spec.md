# commit-auth-gate Specification

## Purpose
Require explicit per-invocation user authorization before git commit operations, with implicit add authorization for the same step and a session-scoped opt-in for streamlined subsequent commits.

## Requirements

### Requirement: Explicit per-invocation authorization before git commit
The authorization ask SHALL be presented through the native closed-choice picker with the option set `yes (Recommended)` / `no` / `Allow on this session`. Only an explicit `yes` (or an active session grant) authorizes `git add` and `git commit` using today's exact HEREDOC surface; an off-option reply or silence is NOT a decline — the same ask SHALL be re-presented unchanged through the native picker per the invalid-input rule in `@sai/policies/remember.md`; only an explicit `no` declines, executing nothing. Staging stays forbidden in the commit command outside authorized execution.

#### Scenario: Silence does not decline
- **WHEN** a commit-authorization gate receives no answer or an unrecognized reply
- **THEN** the identical ask is re-presented through the native picker and nothing is executed until an explicit option is chosen

### Requirement: Session-scoped commit authorization via Allow on this session

The commit authorization gate SHALL offer a third option, `Allow on this session`, presented AFTER `no` (the option order is `yes` first and Recommended, then `no`, then `Allow on this session`). Selecting `Allow on this session` SHALL (a) authorize and perform the current commit — `git add` + `git commit` for that step, identical to a `yes` — AND (b) set a session-scoped commit-authorization flag.

While the flag is active, every subsequent commit-authorization gate in the same in-conversation session SHALL be skipped: the agent runs `git add` + `git commit` without presenting the prompt and without waiting for the user. In an apply run, this covers BOTH commit-authorization gates — the per-Step STOP & COMMIT gate and the terminal documentation commit gate. Skipping the gate removes ONLY the authorization ask — the mandatory pre-commit file visibility report and the proposed commit message SHALL still print on every per-Step commit, unchanged, and the promotion disclosure, the terminal file visibility listing, and the proposed commit message SHALL still print before the terminal documentation commit, unchanged.

The flag SHALL live exclusively in the agent's in-conversation working memory. It SHALL NEVER be written to `.openspec.yaml`, config, or any file on disk, and it SHALL reset (return to inactive) at the start of a new chat or a new `/sai-*` invocation, consistent with the feedback-gate iteration counter.

The grant SHALL be limited to `git add` + `git commit` at the commit-authorization gates. In an apply run, the grant covers exactly two gates: the per-Step STOP & COMMIT gate and the terminal documentation commit gate. It covers no other gate in that run. It SHALL NOT authorize `push`, `--force`, branch create/switch, rebase, merge, tag, or `gh pr`; those operations SHALL still require their own per-operation approval regardless of the flag. The grant SHALL NOT bypass the GREEN-conflict STOP or the apply Human Verification gate; those SHALL still halt the workflow regardless of the flag. The terminal documentation commit gate SHALL NOT offer an `Allow on this session` option of its own: it is the run's last commit gate, so there is nothing further to grant.

This session grant is a deliberate, scoped exception to the general "ask every time / no implicit authorization" principle that governs the commit gate (stated as a CRITICAL block in `apply.md`). The change SHALL amend that principle with an explicit opt-in carve-out rather than leaving the two rules in contradiction: the "ask every time" default holds until the user selects `Allow on this session`, and the resulting implicit authorization is confined to `git add` + `git commit` for the remainder of the in-conversation session and relaxes the principle for no other operation.

#### Scenario: User grants permission for a commit step

- **WHEN** the agent asks for commit authorization and the user answers `yes`
- **THEN** the agent MAY run `git add` for the same step without additional confirmation, then runs `git commit`

#### Scenario: User declines commit authorization

- **WHEN** the agent asks for commit authorization and the user does not answer `yes` or `Allow on this session` (answers no, stays silent, redirects, or replies off-topic)
- **THEN** the agent MUST NOT run `git commit`; MUST print a summary of staged changes and instruct the user to run `git commit` themselves

#### Scenario: Ask-every-time principle amended, not silently overridden

- **WHEN** the session grant is active and the agent reaches a subsequent commit-authorization gate
- **THEN** the implicit authorization applies ONLY because the user explicitly selected `Allow on this session`, and it covers only `git add` + `git commit`; the "ask every time" rule still governs every operation the grant does not cover

#### Scenario: User selects Allow on this session

- **WHEN** the agent presents the commit-authorization gate and the user selects `Allow on this session`
- **THEN** the agent runs `git add` + `git commit` for the current step AND sets the session-scoped commit-authorization flag for the rest of the in-conversation session

#### Scenario: Third option ordering and Recommended default preserved

- **WHEN** the commit-authorization gate is presented
- **THEN** `yes` is the first option and carries the `Recommended` marker, `no` is presented after it, and `Allow on this session` is presented after `no`

#### Scenario: Subsequent commit skipped while flag active

- **WHEN** the flag is active and the agent reaches a later per-Step STOP & COMMIT gate in the same session
- **THEN** the agent commits without asking, after printing the pre-commit file visibility report and the proposed commit message

#### Scenario: Terminal documentation commit gate is covered by the session grant

- **WHEN** the flag is active and the apply run reaches the terminal documentation commit gate
- **THEN** the terminal gate is skipped: the agent prints the promotion disclosure, the terminal file visibility listing, and the proposed commit message, then stages and commits the terminal set without presenting the authorization prompt and without waiting

#### Scenario: Grant does not cover shared or irreversible git operations

- **WHEN** the flag is active and the agent reaches a `push`, `--force`, branch create/switch, rebase, merge, tag, or `gh pr` operation
- **THEN** the agent still requires explicit per-operation approval for that operation and does NOT treat the flag as authorization for it

#### Scenario: Grant does not bypass other stops

- **WHEN** the flag is active and the workflow reaches a GREEN-conflict STOP or an apply Human Verification gate with at least one unchecked checkbox
- **THEN** the workflow still halts and waits for the user, exactly as if the flag were inactive

#### Scenario: Flag is never persisted and resets per invocation

- **WHEN** a session with an active flag ends and a new chat or new `/sai-*` invocation begins
- **THEN** the flag is inactive, no file on disk records it, and the per-commit gate applies again until the user opts in anew

### Requirement: Apply coordinator defines session-scoped commit authorization

The routed apply coordinator card SHALL define the in-memory `session_commit_authorized` lifecycle, including activation from `Allow on this session`, fast-track pre-activation, reset at a new chat or `/sai-*` invocation, and scope limited to the per-Step STOP & COMMIT gate and the terminal documentation commit gate.

#### Scenario: Fast-track pre-activates the session flag

- **WHEN** apply starts with the fast-track signal active
- **THEN** the coordinator treats `session_commit_authorized` as active before either apply commit gate while still printing each required visibility report and proposed message

#### Scenario: Session flag does not bypass other gates

- **WHEN** the session flag is active and apply reaches a GREEN-conflict STOP or Human Verification gate
- **THEN** the workflow still stops at that gate

### Requirement: Terminal documentation gate uses the common authorization option set
The apply runner-owned terminal documentation gate SHALL present the same closed-choice option set as every commit-authorization gate — `yes (Recommended)` / `no` / `Allow on this session` — where an `Allow on this session` selection additionally activates `session_commit_authorized` per its definition in the apply coordinator card; the gate SHALL always retain the terminal visibility listing and proposed message, SHALL skip only its authorization ask when the session flag is already active (including fast-track pre-activation), and SHALL leave eligible files uncommitted on decline.

#### Scenario:
- **WHEN** the terminal documentation gate receives silence or an off-option reply while `session_commit_authorized` is inactive
- **THEN** the gate re-presents the identical three-option ask instead of treating the reply as a decline
