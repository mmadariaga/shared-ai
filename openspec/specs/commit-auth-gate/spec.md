# commit-auth-gate Specification

## Purpose
Require explicit per-invocation user authorization before git commit operations, with implicit add authorization for the same step and a session-scoped opt-in for streamlined subsequent commits.

## Requirements

### Requirement: Explicit per-invocation authorization before git commit

The agent MUST ask for explicit per-invocation authorization before running `git commit`, UNLESS a session-scoped commit authorization is active for the current in-conversation session (see "Session-scoped commit authorization via Allow on this session"), in which case the agent does NOT ask and proceeds to commit. When it asks, the authorization MUST be presented as a closed-choice prompt with options `yes` / `no` / `Allow on this session` (per the "Closed-choice prompts" rule in `remember.md`, which gives the per-harness option-picker mapping). The agent commits on an explicit `yes` selection or reply, and also commits on an explicit `Allow on this session` selection; anything else (no, silence, redirect, or any other reply) is a decline and the agent MUST NOT commit. Once the user has granted permission for a commit, `git add` for the same step is implicitly authorized — the agent MUST NOT ask again. On a decline, the agent MUST describe the staged changes and instruct the user to commit themselves.

#### Scenario: User grants permission for a commit step
- **WHEN** the agent asks for commit authorization and the user answers `yes`
- **THEN** the agent MAY run `git add` for the same step without additional confirmation, then runs `git commit`

#### Scenario: User declines commit authorization
- **WHEN** the agent asks for commit authorization and the user does not answer `yes` or `Allow on this session` (answers no, stays silent, redirects, or replies off-topic)
- **THEN** the agent MUST NOT run `git commit`; MUST print a summary of staged changes and instruct the user to run `git commit` themselves

### Requirement: Session-scoped commit authorization via Allow on this session

The commit authorization gate SHALL offer a third option, `Allow on this session`, presented AFTER `no` (the option order is `yes` first and Recommended, then `no`, then `Allow on this session`). Selecting `Allow on this session` SHALL (a) authorize and perform the current commit — `git add` + `git commit` for that step, identical to a `yes` — AND (b) set a session-scoped commit-authorization flag.

While the flag is active, every subsequent commit-authorization gate in the same in-conversation session SHALL be skipped: the agent runs `git add` + `git commit` without presenting the prompt and without waiting for the user. Skipping the gate removes ONLY the authorization ask — the mandatory pre-commit file visibility report and the proposed commit message SHALL still print on every commit, unchanged.

The flag SHALL live exclusively in the agent's in-conversation working memory. It SHALL NEVER be written to `.openspec.yaml`, config, or any file on disk, and it SHALL reset (return to inactive) at the start of a new chat or a new `/sai-*` invocation, consistent with the feedback-gate iteration counter.

The grant SHALL be limited to `git add` + `git commit` at the commit gate. It SHALL NOT authorize `push`, `--force`, branch create/switch, rebase, merge, tag, or `gh pr`; those operations SHALL still require their own per-operation approval regardless of the flag. The grant SHALL NOT bypass the GREEN-conflict STOP or the apply Human Verification gate; those SHALL still halt the workflow regardless of the flag.

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
- **WHEN** the flag is active and the agent reaches a later commit-authorization gate in the same session
- **THEN** the agent commits without asking, after printing the pre-commit file visibility report and the proposed commit message

#### Scenario: Grant does not cover shared or irreversible git operations
- **WHEN** the flag is active and the agent reaches a `push`, `--force`, branch create/switch, rebase, merge, tag, or `gh pr` operation
- **THEN** the agent still requires explicit per-operation approval for that operation and does NOT treat the flag as authorization for it

#### Scenario: Grant does not bypass other stops
- **WHEN** the flag is active and the workflow reaches a GREEN-conflict STOP or an apply Human Verification gate with at least one unchecked checkbox
- **THEN** the workflow still halts and waits for the user, exactly as if the flag were inactive

#### Scenario: Flag is never persisted and resets per invocation
- **WHEN** a session with an active flag ends and a new chat or new `/sai-*` invocation begins
- **THEN** the flag is inactive, no file on disk records it, and the per-commit gate applies again until the user opts in anew
