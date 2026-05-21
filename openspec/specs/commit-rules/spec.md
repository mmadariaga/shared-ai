# commit-rules Specification

## Purpose
TBD - created by archiving change extract-commit-rules-shared-instruction. Update Purpose after archive.
## Requirements
### Requirement: File scope — rules only, no workflow
`commit-rules.md` SHALL contain only commit message format rules. It MUST NOT include git inspection steps, workflow sequences, file-staging instructions, or user interaction flows.

#### Scenario: Downstream consumer reads commit-rules.md
- **WHEN** any instruction file fetches `@sai/instructions/commit-rules.md`
- **THEN** the agent receives only format constraints (subject, body, footer, hard rules, self-critique) with no workflow directives mixed in

### Requirement: Subject line format
The subject line SHALL follow Conventional Commits format: `type(scope): description` or `type: description`. The subject MUST be ≤ 50 characters (hard limit), use imperative mood, have no trailing period, no emoji (unless explicitly requested), and use lowercase after the colon except for identifiers or proper nouns.

#### Scenario: Subject exceeds 50 characters
- **WHEN** a generated subject line is longer than 50 characters
- **THEN** the agent MUST shorten it before presenting, applying self-critique rule 2

#### Scenario: Non-imperative mood in subject
- **WHEN** a draft subject uses past tense (e.g., "added") or third-person (e.g., "adds")
- **THEN** the agent MUST rewrite to imperative form (e.g., "add")

### Requirement: Body format
The body SHALL be optional and omitted when the subject is self-evident. When included, it MUST wrap at 72 characters per line, be separated from the subject by a blank line, and focus on the *why* (motivation, trade-offs, hidden constraints) rather than *what* the diff already shows.

#### Scenario: Body present with long line
- **WHEN** any body line exceeds 72 characters
- **THEN** the agent MUST wrap it before presenting

#### Scenario: Self-evident change
- **WHEN** the staged diff represents a trivial rename or version bump with no non-obvious rationale
- **THEN** the agent MUST omit the body

### Requirement: Footer conventions
Footers SHALL follow: `BREAKING CHANGE: <description>` for incompatible changes (subject also uses `feat!:` or `fix!:`); `Refs: #N` or `Closes: #N` when an issue is discoverable in the branch name or recent commits. `Co-Authored-By` or "Generated with Claude Code" trailers MUST NOT be added unless the user explicitly requests them.

#### Scenario: Breaking API change
- **WHEN** the staged diff contains an incompatible API change
- **THEN** the subject type uses `!` suffix AND a `BREAKING CHANGE:` footer is appended

### Requirement: Hard rules
The following MUST be enforced unconditionally:
- Never stage or unstage files — operate only on what is already staged.
- Never run `git commit` without explicit per-invocation user authorization.
- Never amend a commit already pushed without explicit warning and secondary confirmation.
- Never use `--no-verify` to skip hooks — surface failures, do not bypass.
- Never include unstaged content in the message — describe only `git diff --cached`.
- No speculation — every claim must map to a staged hunk.
- Match the repo's commit style (scope naming, ticket refs, language) derived from recent commits.

#### Scenario: Pre-commit hook fails
- **WHEN** a pre-commit hook fails after the user authorizes `git commit`
- **THEN** the agent MUST surface the hook error and stop; MUST NOT retry with `--no-verify`

#### Scenario: Unstaged files present
- **WHEN** `git diff` (unstaged) contains changes not in `git diff --cached`
- **THEN** the commit message MUST describe only the staged hunks; unstaged content is ignored

### Requirement: Self-critique checklist
Before presenting a commit message, the agent SHALL internally verify all seven points:
1. Type accuracy — `feat` only for new capabilities; `fix` only when behavior changed.
2. Subject length — ≤ 50 chars, no period, imperative.
3. Body wrap — 72 chars per line if body present.
4. Faithfulness — every claim backed by `git diff --cached`.
5. No anticipated work in the message.
6. Repo convention match — prefix style, scope naming, language consistent with recent commits.
7. Secrets check — warn if obvious secret-looking files are staged.

#### Scenario: Draft fails self-critique
- **WHEN** any of the seven checks fails on the draft message
- **THEN** the agent MUST self-correct before presenting the message to the user

