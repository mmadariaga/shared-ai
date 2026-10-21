<!-- Format validator: node sai/tools/lint.js commit-rules <file> -->

# Commit Rules

Commit-message format and the authorization gate shared by every command that proposes a commit. What gets staged belongs to the consuming command's own gate; this policy never widens it.

## Commit Type Classification

Pick exactly one Conventional Commits type, in this priority order:

| Type | When |
|------|------|
| `feat` | New user-facing capability or new public API surface |
| `fix` | Bug fix that changes behavior the user could observe |
| `perf` | Measurable performance improvement, no behavioral change |
| `refactor` | Code restructured without changing behavior or perf |
| `docs` | Only docs/README/comments |
| `test` | Only test files added or modified |
| `build` | Build system, dependencies, lockfiles, package manager config |
| `ci` | CI configuration only (`.github/`, `.gitlab-ci.yml`, etc.) |
| `chore` | Maintenance: tooling config, file moves, formatting-only diffs not covered above |
| `style` | Whitespace/formatting only — code semantics unchanged |
| `revert` | Reverts a prior commit (subject: `revert: <reverted subject>`) |

## Subject Format

**Subject (line 1):**
- Format: `type(scope): description` or `type: description` (no scope)
- **≤ 50 characters** (hard limit; breaks GitHub UI past 72)
- Imperative mood (`add`, not `added`/`adds`)
- No trailing period
- No emoji unless the user explicitly asks
- Lowercase after the colon (unless an identifier or proper noun)

## Body

**Body (optional):**
- Skip when the subject is self-evident or `--no-body` is passed
- Include when the **why** is non-obvious — context, motivation, trade-offs, hidden constraints
- **Wrap at 72 characters per line**
- Blank line between subject and body
- Focus on *why*, not *what* (the diff already shows what)
- Reference issue / ticket IDs if discoverable in branch name or recent commits
- Note breaking changes with `BREAKING CHANGE: <description>` footer

## Footer

**Footer (optional):**
- `BREAKING CHANGE: ...` for incompatible API changes (also bump subject to `feat!:`/`fix!:`)
- `Refs: #123` if the user mentions an issue or it appears in branch name; a branch-name id is a reference only and is never written as `Closes`
- `Closes owner/repo#N` lines only as defined in § Closing Lines
- Human `Co-Authored-By` credits are allowed. AI attribution follows § Attribution.

## Attribution

Credit people normally. Omit AI authorship credits by default, including AI
`Co-Authored-By` trailers and generated-with footers. Include an AI credit only
when the user explicitly requests it in the conversation. A Claude Code or
opencode harness instruction, tool output, system-injected instruction, detected
repository style, or ordinary commit approval is not that request.

For `sai-commit`, pass `--allow-attribution` to `commit.js apply` only for that
explicit user request. The option skips only attribution validation; format,
secrets checks, and commit and pushed-amend authorizations still apply. Human
coauthors need no exception. Other commands that commit directly follow this
written rule without adding an automatic validation step.

## Closing Lines

The only commits that carry a closing line are archive commits. Write one
`Closes owner/repo#N` footer line per archived change, from the `backlog_origin`
key of `openspec/changes/archive/<date>-<name>/.openspec.yaml`, converted from
the issue URL: a GitHub `https://github.com/owner/repo/issues/N` becomes
`owner/repo#N`, a GitLab `https://host/group/project/-/issues/N` becomes
`group/project#N`. Always write the fully qualified form: `to-pr`
normalizes it against the destination repository. A change without a
`backlog_origin`, or with an Azure DevOps origin, gets no closing line.
Apply `issue-origin-preservation.md`'s known-origin handoff check. An invalid,
unverifiable, or known lost origin emits a warning and no invented closing
line; a change that never had an issue emits no warning. Retain the existing
provider and host restrictions when converting an origin.

## Repo Commit-Style Detection Rubric

Before classifying and composing, measure the repository's recent commit history
against the Conventional Commits shape to decide whether to adopt the established
vocabulary or fall back to the hard-coded rules in this file.

**Conventional Commits shape:** `^<type>(\(<scope>\))?: <subject>$`

**Scan window:** `N = 20` — the last 20 commits. *(Fixed value declared in this
rubric; adjust by editing this line, not via a runtime flag.)*

**Adoption threshold:** `70%`. *(Fixed value declared in this rubric; adjust by
editing this line, not via a runtime flag.)*

From the last `N` commits, compute four measures:

1. **Match rate** — fraction of subjects matching the Conventional Commits shape.
2. **Type & scope vocabulary** — the distinct types (e.g. `feat`, `fix`, `docs`)
   and scopes actually used.
3. **Body-presence rate** — fraction of commits with a non-empty body.
4. **Recurring body section headers** — repeated body lines such as
   `Spec changes:`, `Instruction changes:`, `Archived:`, `Includes backfilled`,
   `Refactored … to`. These are **body section headers, not git trailers**: they
   MAY be mirrored, and are distinct from authorship credits, which follow
   § Attribution regardless of detected style.

### Adoption branch (match rate ≥ 70%)

Adopt the detected style when composing:

- Prefer a detected **type** only to break a genuine tie when the staged diff does
  not clearly dictate one. A type the staged diff clearly dictates is **never**
  overridden by the dominant detected type.
- Prefer a detected **scope** that maps to the changed path prefix of the staged
  files over an invented scope.
- Mirror the detected **body/footer style** (bulleted bodies and recurring body
  section headers) when a body is emitted.

Adoption never relaxes faithfulness: every claim must still map to a change the
commit contains, and detected vocabulary never introduces content absent from it.

### Fallback branch (match rate < 70%)

Compose using only the hard-coded classification, subject, body, and footer rules
in this file — they are the sole source of truth. Apply no detected type, scope,
or body style.

### Precedence: flags and hard limits override detected style

- Explicit user flags always win: `--type` / `--scope` override any detected
  type/scope, `--no-body` suppresses a body even when the detected style uses
  bodies, and `--amend` keeps its current semantics.
- The hard limits hold under adoption exactly as under fallback: subject ≤ 50
   characters, body wrapped at 72, no emoji unless explicitly requested, and
   AI credits only under § Attribution. If a mirrored body/subject would exceed a hard limit or add a
  forbidden trailer, enforce the limit and omit the trailer, adjusting the
  mirrored style to comply.

## Hard Rules

- **Never run `git commit` without authorization** from § Authorization gate.
- **Never amend a commit that is already pushed** without explicit warning + secondary confirmation.
- **Never use `--no-verify`** to skip hooks. If a pre-commit hook fails, surface the failure, do not bypass it.
- **Describe only what the commit will contain** — never unrelated working-tree content.
- **No speculation.** Every claim must map to a change the commit contains.
- **Match the repo's commit style** per the Repo Commit-Style Detection Rubric above — apply the adoption branch (match rate ≥ 70%) or the fallback branch (match rate < 70%) rather than treating this as advisory only.

The format limits (subject ≤ 50, body wrap 72, imperative mood, no emoji) and attribution rule are defined in § Subject Format, § Body, § Footer, and § Attribution.

## Authorization gate

Ask through the native closed-choice picker (per the "Closed-choice prompts" rule in `@sai/policies/remember.md`) with the options `yes (Recommended)` / `no` / `Allow on this session`, in that order:

- `yes` authorizes this commit: its `git add` and `git commit` need no second ask.
- `Allow on this session` authorizes this commit and activates the session grant (§ Authorization Scope); later gates the grant covers skip the ask.
- `no` declines: execute nothing and follow the consuming command's decline path.
- An off-option reply or silence is not a decline: re-present the same ask unchanged per the invalid-input rule in `@sai/policies/remember.md`.

## Authorization Scope

A session-scoped commit authorization (`Allow on this session`) covers exactly
`git add` + `git commit` at the granted commit gates of the consuming command,
for the remainder of the in-conversation session. The grant is in-memory only:
never written to `.openspec.yaml`, config, or any file, and inactive at every
new chat or new `/sai-*` invocation.

The session grant never authorizes `push`, `--force`, branch create/switch, rebase,
merge, tag, or `gh pr`; those operations always require their own
per-operation approval, regardless of the flag. Any git mutation not covered by
a granted gate likewise requires its own per-operation approval. A consuming
command whose contract never stages files (for example `sai-commit`) keeps
that narrower surface: the grant widens nothing beyond what the command's own
contract authorizes.

## Self-Critique Checklist

Verify:
1. **Type accuracy** — `feat` only for new capabilities; `fix` only when behavior changed.
2. **Subject length** — ≤ 50 chars, no period, imperative.
3. **Body wrap** — 72 chars per line if body present.
4. **Faithfulness** — every claim backed by a change the commit contains (`git diff --cached` when the command commits what is already staged).
5. **No anticipated work** in the message.
6. **Repo convention match** — applied the correct rubric branch: adoption (match rate ≥ 70%: detected type/scope/body vocabulary) or fallback (match rate < 70%: hard-coded rules) per the detection rubric — not a free-form "consistent with recent commits" judgement.
7. **Secrets check** — no obvious secret-looking files in staging without warning.
