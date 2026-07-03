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

### Requirement: Repo commit-style detection rubric

`commit-rules.md` SHALL define a detection rubric that classifies the repository's recent commit history against the Conventional Commits shape `^<type>(\(<scope>\))?: <subject>$`. The rubric SHALL declare a scan window `N` and an adoption threshold, both fixed values stated directly in the rubric (currently `N = 20`, threshold `= 70%`; adjusted by editing the rubric, not by a runtime flag), and, from the last `N` commits, compute four measures: (a) the **match rate** — fraction of subjects matching the Conventional Commits shape; (b) the distinct **type vocabulary** and **scope vocabulary** actually used; (c) the **body-presence rate** — fraction of commits with a non-empty body; and (d) the **recurring body section headers** — repeated body lines such as `Spec changes:`, `Instruction changes:`, `Archived:`, `Includes backfilled`, `Refactored … to`. Note: these are body-section headers, not git trailers; see the "Recurring body section headers distinguished from git trailers" scenario below.

#### Scenario: Rubric declares the shape, window, and threshold
- **WHEN** `commit-rules.md` is read
- **THEN** it SHALL state the Conventional Commits shape `^<type>(\(<scope>\))?: <subject>$`, the scan window (`N = 20`) and the adoption threshold (70%) as values declared in the rubric, together with the four measures (match rate, type/scope vocabulary, body-presence rate, recurring body section headers)

#### Scenario: Recurring body section headers distinguished from git trailers
- **WHEN** the rubric enumerates recurring body section headers (e.g. `Spec changes:`, `Archived:`)
- **THEN** it SHALL classify them as body section headers that MAY be mirrored, and SHALL state that they are distinct from the forbidden `Co-Authored-By` / "Generated with Claude Code" git trailers, which remain banned

### Requirement: Adoption branch — detected style feeds composition

When the measured match rate is **≥ 70%**, the rubric SHALL direct composition to adopt the detected style: prefer a detected **type** only to break a genuine tie when the staged diff does not clearly dictate one; prefer a detected **scope** that maps to the changed path prefix over an invented scope; and mirror the detected **body/footer style** (bulleted bodies and recurring body section headers) when a body is emitted. Adoption SHALL NOT override a type the staged diff clearly dictates, and SHALL NOT relax the faithfulness rule that every claim maps to a staged hunk.

#### Scenario: Ambiguous type resolved from detected vocabulary
- **WHEN** the match rate is ≥ 70% AND Step 2 classification leaves two types genuinely plausible
- **THEN** the agent SHALL prefer the type present in the detected type vocabulary

#### Scenario: Scope chosen from detected vocabulary by path prefix
- **WHEN** the match rate is ≥ 70% AND a detected scope maps to the common changed-path prefix of the staged files
- **THEN** the agent SHALL use that detected scope rather than inventing a new one

#### Scenario: Body style mirrored under adoption
- **WHEN** the match rate is ≥ 70% AND a body is emitted AND the detected style uses bulleted bodies and/or recurring body section headers
- **THEN** the agent SHALL mirror that body/footer style, subject to the hard limits

#### Scenario: Clear diff type not overridden by detection
- **WHEN** the match rate is ≥ 70% but the staged diff clearly dictates a specific type
- **THEN** the agent SHALL use the diff-dictated type regardless of the dominant detected type

### Requirement: Fallback branch — hard-coded rules remain authoritative

When the measured match rate is **below 70%**, the rubric SHALL direct Steps 2–4 to run exactly as they do without detection: the existing hard-coded classification, subject, body, and footer rules in `commit-rules.md` are the sole source of truth, and no detected vocabulary is applied.

#### Scenario: Unstructured history falls back
- **WHEN** the last `N` commits yield a match rate below 70%
- **THEN** the agent SHALL compose the message using only the existing hard-coded rules, applying no detected type, scope, or body style

### Requirement: Flags and hard limits override detected style

Explicit user flags SHALL always win over detected style: `--type` and `--scope` override any detected type/scope, `--no-body` suppresses a body even when the detected style uses bodies, and `--amend` retains its current semantics. The hard limits SHALL hold under adoption exactly as under fallback: subject ≤ 50 characters, body wrapped at 72, no emoji unless explicitly requested, and no `Co-Authored-By` / "Generated with Claude Code" trailers unless explicitly requested.

#### Scenario: Flag overrides detected vocabulary
- **WHEN** the match rate is ≥ 70% and would select a detected type/scope AND the user passes `--type` or `--scope`
- **THEN** the user-supplied type/scope SHALL be used and the detected value ignored

#### Scenario: --no-body suppresses mirrored body
- **WHEN** the detected style uses bodies AND the user passes `--no-body`
- **THEN** the agent SHALL emit a subject-only message

#### Scenario: Hard limits hold under adoption
- **WHEN** a mirrored body or subject would exceed the hard limits (subject > 50, body line > 72) or would add a forbidden trailer
- **THEN** the agent SHALL enforce the hard limits and omit the forbidden trailer, adjusting the mirrored style to comply

### Requirement: Hard rules
The following MUST be enforced unconditionally:
- Never stage or unstage files — operate only on what is already staged.
- Never run `git commit` without explicit per-invocation user authorization.
- Never amend a commit already pushed without explicit warning and secondary confirmation.
- Never use `--no-verify` to skip hooks — surface failures, do not bypass.
- Never include unstaged content in the message — describe only `git diff --cached`.
- No speculation — every claim must map to a staged hunk.
- Match the repo's commit style (scope naming, ticket refs, language) per the repo commit-style detection rubric — see the "Repo commit-style detection rubric", "Adoption branch", and "Fallback branch" requirements above for the concrete decision logic.

#### Scenario: Pre-commit hook fails
- **WHEN** a pre-commit hook fails after the user authorizes `git commit`
- **THEN** the agent MUST surface the hook error and stop; MUST NOT retry with `--no-verify`

#### Scenario: Unstaged files present
- **WHEN** `git diff` (unstaged) contains changes not in `git diff --cached`
- **THEN** the commit message MUST describe only the staged hunks; unstaged content is ignored

#### Scenario: Repo style matched via detection rubric
- **WHEN** composing a message for a repo whose recent history is measured against the detection rubric
- **THEN** the agent MUST apply the adoption branch (rate ≥ 70%) or the fallback branch (rate < 70%) rather than treating "match the repo's commit style" as advisory only

### Requirement: Self-critique checklist
Before presenting a commit message, the agent SHALL internally verify all seven points:
1. Type accuracy — `feat` only for new capabilities; `fix` only when behavior changed.
2. Subject length — ≤ 50 chars, no period, imperative.
3. Body wrap — 72 chars per line if body present.
4. Faithfulness — every claim backed by `git diff --cached`.
5. No anticipated work in the message.
6. Repo convention match — applies the adoption branch (match rate ≥ 70%: uses the detected type/scope/body vocabulary) or the fallback branch (match rate < 70%: uses the hard-coded rules), per the detection rubric.
7. Secrets check — warn if obvious secret-looking files are staged.

#### Scenario: Draft fails self-critique
- **WHEN** any of the seven checks fails on the draft message
- **THEN** the agent MUST self-correct before presenting the message to the user

#### Scenario: Self-critique #6 checks the rubric branch, not free-form similarity
- **WHEN** the agent performs self-critique point 6 on a draft message
- **THEN** it MUST verify the draft applied the correct rubric branch (adoption or fallback) rather than judging "consistent with recent commits" informally

